import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/server/session';
import {
  findUserById,
  incrementUserAiCredits,
  saveAiConversation,
  getPlansConfig,
} from '@/lib/server/auth-store';
import { aiAdapter, AiChatMessage } from '@/lib/server/ai-adapter';

// In-memory rate limiting map for AI calls: userId -> timestamp[]
const userAiRateLimitMap = new Map<string, number[]>();

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Authentication required. Please sign in to access the AI Document Assistant.' },
        { status: 401 }
      );
    }

    const user = findUserById(session.user.id);
    if (!user) {
      return NextResponse.json({ error: 'User account not found.' }, { status: 404 });
    }

    // Rate limiting: Max 20 requests per minute
    const now = Date.now();
    const timestamps = (userAiRateLimitMap.get(user.id) || []).filter((t) => now - t < 60000);
    if (timestamps.length >= 20) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please wait a moment before sending more AI requests.' },
        { status: 429 }
      );
    }
    timestamps.push(now);
    userAiRateLimitMap.set(user.id, timestamps);

    // Plan quota check
    const plans = getPlansConfig();
    const userPlan = plans.find((p) => p.id === (user.subscription?.planId || 'free'));
    const baseQuota = userPlan?.limits.aiCreditsPerMonth || 0;
    const customQuota = user.customQuotas?.aiCredits;
    const effectiveLimit = customQuota !== undefined ? customQuota : baseQuota;

    const usedCredits = user.usage?.aiCreditsUsed || 0;
    if (effectiveLimit > 0 && usedCredits >= effectiveLimit) {
      return NextResponse.json(
        {
          error: `Monthly AI document credit quota reached (${usedCredits}/${effectiveLimit}). Upgrade your plan or contact support to increase limits.`,
          quotaExceeded: true,
        },
        { status: 403 }
      );
    }

    const body = await req.json();
    const {
      conversationId,
      messages,
      documentText,
      fileName,
      totalPages,
      taskType = 'qa',
    } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'Conversation messages are required.' }, { status: 400 });
    }

    // Prepare context
    const docContext = documentText
      ? {
          text: String(documentText).slice(0, 50000), // Max 50KB character slice for context
          fileName: String(fileName || 'Uploaded_Document.pdf'),
          totalPages: Number(totalPages) || 1,
        }
      : undefined;

    // Generate completion
    const aiResult = await aiAdapter.generateCompletion(
      messages as AiChatMessage[],
      docContext,
      taskType
    );

    // Deduct / Track credit
    const updatedCredits = incrementUserAiCredits(user.id, 1);

    // Persist conversation
    const lastUserQuery = [...messages].reverse().find((m) => m.role === 'user')?.content || 'Document Discussion';
    const conversationTitle = fileName ? `Chat: ${fileName}` : lastUserQuery.slice(0, 30);

    const updatedMessages = [
      ...messages.map((m, idx) => ({
        id: `msg-${idx}-${Date.now()}`,
        role: m.role,
        content: m.content,
        timestamp: new Date().toISOString(),
      })),
      {
        id: `msg-resp-${Date.now()}`,
        role: 'assistant' as const,
        content: aiResult.text,
        citations: aiResult.citations,
        timestamp: new Date().toISOString(),
      },
    ];

    const savedConv = saveAiConversation(user.id, {
      id: conversationId,
      title: conversationTitle,
      fileName,
      documentSummary: taskType === 'summarize' ? aiResult.text.slice(0, 300) : undefined,
      messages: updatedMessages,
    });

    return NextResponse.json({
      success: true,
      answer: aiResult.text,
      citations: aiResult.citations,
      tokensUsed: aiResult.tokensUsed,
      model: aiResult.model,
      provider: aiResult.provider,
      disclaimer: aiResult.disclaimer,
      conversation: savedConv,
      creditsUsed: updatedCredits,
      creditsLimit: effectiveLimit,
    });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json({ error: error.message || 'AI request failed.' }, { status: 500 });
  }
}
