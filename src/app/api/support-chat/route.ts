import { NextRequest, NextResponse } from 'next/server';

// In-memory rate limiting map: ip -> timestamp[]
const supportRateLimitMap = new Map<string, number[]>();

const SYSTEM_SUPPORT_PROMPT = `You are the official Website Assistant for pdfkitfree (formerly pdfkitfree).
Your job is to assist users who want to know anything about our website, our PDF tools, video compressor, NDA generator, digital signatures, AI assistant, pricing plans, and security policies.

About pdfkitfree:
1. Brand & Concept:
   - Name: pdfkitfree
   - Mission: Fast, private, client-side browser-first document tools.
   - Privacy guarantee: Core PDF tools (merge, split, rotate, convert, edit, password protect) run locally in user's browser RAM using WebAssembly and HTML5 Canvas. Documents never get uploaded to remote servers unless an explicit cloud signing workflow is started.
2. Tools Offered:
   - 38+ Free PDF Tools (/tools): Merge, Split, Remove Pages, Rotate, Compress, Convert to/from PDF (JPG, PNG, Word, Excel, PowerPoint), Encrypt/Decrypt, Redact, Watermark, etc. No signup required for basic tools!
   - AI Document Assistant (/ai): Chat with uploaded PDF documents, extract entities, summarize contracts, explain legal clauses in plain language, compare two versions, and cite pages.
   - Video Compressor (/video-compressor): Browser-based client-side video compression for MP4, WebM, MOV.
   - NDA & eSign (/nda-esign and /nda-generator): Mutual NDA generator, digital signatures compliant with ESIGN/UETA statutes, with cryptographic audit trails.
3. Pricing & Subscriptions (/pricing):
   - Free ($0): All core browser tools, 25MB file limit, 50MB video compression. No signup required.
   - Pro ($4.99/mo or $39.99/yr): 200MB file limit, 500MB video compression, 50 AI credits/month, NDA personal dashboard, OCR text extraction.
   - Business ($12/user/mo or $99/user/yr): 1,000MB (1GB) file limit, 2,000MB video compression, 200 AI credits/user/mo, team workspaces, 10 seats, multi-recipient signing.
   - Payment Methods: Stripe (Debit & Credit cards) and PayPal Checkout. All payments processed via secure hosted checkouts.
4. Privacy & Compliance (/privacy, /terms):
   - Zero-upload file retention model.
   - GDPR and CCPA compliant.

Tone and Guidelines:
- Be concise, friendly, helpful, and professional.
- Guide users directly to the right page or tool link when appropriate (e.g. /tools, /pricing, /ai, /nda-esign, /video-compressor).
- Never claim to offer legal representation or advice; remind users that templates are informational.
`;

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const now = Date.now();
    const timestamps = (supportRateLimitMap.get(ip) || []).filter((t) => now - t < 60000);

    if (timestamps.length >= 30) {
      return NextResponse.json(
        { error: 'Too many messages sent. Please wait a few seconds before asking again.' },
        { status: 429 }
      );
    }
    timestamps.push(now);
    supportRateLimitMap.set(ip, timestamps);

    const body = await req.json();
    const { messages } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'Message history is required.' }, { status: 400 });
    }

    const lastMessage = [...messages].reverse().find((m) => m.role === 'user')?.content || '';
    const query = lastMessage.toLowerCase().trim();

    // Check if live OpenAI key exists in environment
    const apiKey = process.env.AI_API_KEY || process.env.OPENAI_API_KEY;
    if (apiKey && apiKey.startsWith('sk-')) {
      try {
        const apiMessages = [
          { role: 'system', content: SYSTEM_SUPPORT_PROMPT },
          ...messages.slice(-6).map((m: { role: string; content: string }) => ({
            role: m.role,
            content: m.content,
          })),
        ];

        const res = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: process.env.AI_MODEL || 'gpt-4o-mini',
            messages: apiMessages,
            max_tokens: 600,
            temperature: 0.3,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          const answer = data.choices?.[0]?.message?.content || '';
          if (answer) {
            return NextResponse.json({ success: true, answer });
          }
        }
      } catch (err) {
        console.warn('Live support bot call failed, using local knowledge base:', err);
      }
    }

    // Built-in intelligent assistant knowledge response (always works offline & without API keys)
    let reply = '';

    if (query.includes('price') || query.includes('pricing') || query.includes('cost') || query.includes('plan') || query.includes('subscription')) {
      reply = `**pdfkitfree** offers 3 transparent tiers:\n\n` +
        `• **Free ($0)**: Core PDF tools forever with zero registration! 25MB file limit, client-side processing.\n` +
        `• **Pro ($4.99/mo or $39.99/yr)**: 200MB file limit, 500MB video compression, 50 AI document credits/mo, and NDA dashboard.\n` +
        `• **Business ($12/user/mo or $99/user/yr)**: 1GB limit, 200 AI credits/user/mo, team workspaces, multi-recipient signing.\n\n` +
        `You can upgrade anytime on our [/pricing](/pricing) page via Stripe (credit/debit cards) or PayPal.`;
    } else if (query.includes('tool') || query.includes('merge') || query.includes('split') || query.includes('compress') || query.includes('convert')) {
      reply = `We provide over 38 browser-based PDF utilities on our [/tools](/tools) catalog, including:\n\n` +
        `• **Merge PDF**: Combine multiple PDFs in seconds with drag-and-drop.\n` +
        `• **Split & Remove Pages**: Extract exactly the pages you need.\n` +
        `• **Video Compressor** ([/video-compressor](/video-compressor)): Shrink MP4/MOV/WebM video size up to 80% with zero cloud uploads.\n` +
        `• **Convert**: Convert between PDF and Word, Excel, PowerPoint, JPG, PNG, and PDF/A.\n` +
        `• **Security**: Protect or unlock PDFs, redact sensitive text, and add watermarks.`;
    } else if (query.includes('safe') || query.includes('privacy') || query.includes('security') || query.includes('upload') || query.includes('cloud')) {
      reply = `🛡️ **Your files are 100% private.**\n\n` +
        `Unlike traditional online converters that upload your confidential documents to third-party servers, **pdfkitfree** processes files directly inside your browser's local memory (RAM) via WebAssembly and HTML5 Canvas.\n\n` +
        `Your files never touch our servers unless you explicitly send a signature invitation. Read our full [/privacy](/privacy) policy for details.`;
    } else if (query.includes('ai') || query.includes('assistant') || query.includes('chat') || query.includes('summary') || query.includes('summarize')) {
      reply = `🤖 **AI Document Assistant:**\n\n` +
        `You can chat directly with your PDF contracts, ask questions, extract key obligations, dates, or parties, and compare two versions side-by-side.\n\n` +
        `Visit our dedicated [/ai](/ai) page to start chatting with an uploaded document!`;
    } else if (query.includes('nda') || query.includes('sign') || query.includes('signature') || query.includes('contract')) {
      reply = `✍️ **NDA & Electronic Signatures:**\n\n` +
        `• Generate customized Mutual or One-Way Non-Disclosure Agreements in seconds with [/nda-generator](/nda-generator).\n` +
        `• Sign documents electronically with legally binding cryptographic timestamps complying with US ESIGN and EU eIDAS standards.\n` +
        `• Access your dashboard at [/nda-esign](/nda-esign).`;
    } else if (query.includes('contact') || query.includes('support') || query.includes('help') || query.includes('email')) {
      reply = `Need assistance or have feedback? You can contact our support team via our [/contact](/contact) page or reach out directly at **privacy@pdfkitfree.com**.`;
    } else if (query.includes('hello') || query.includes('hi') || query.includes('hey')) {
      reply = `Hello! 👋 Welcome to **pdfkitfree**. I'm your interactive website assistant.\n\n` +
        `I can help you with:\n` +
        `• Finding the right PDF or video tool\n` +
        `• Explaining our zero-upload privacy guarantee\n` +
        `• Information on Pro & Business plans and pricing\n` +
        `• How to use our AI Document Assistant and NDA eSignatures\n\n` +
        `What would you like to know today?`;
    } else {
      reply = `Thanks for asking! **pdfkitfree** is a private, client-side PDF utility suite where all processing happens directly in your browser with zero server uploads.\n\n` +
        `• Explore all utilities at [/tools](/tools)\n` +
        `• Check plan features and pricing at [/pricing](/pricing)\n` +
        `• Try our AI Document Assistant at [/ai](/ai)\n` +
        `• Compress video files at [/video-compressor](/video-compressor)\n\n` +
        `Feel free to ask me anything specific about our features or security!`;
    }

    return NextResponse.json({ success: true, answer: reply });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message || 'Failed to process request.' }, { status: 500 });
  }
}
