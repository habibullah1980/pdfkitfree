import { NextRequest, NextResponse } from 'next/server';
import { emailAdapter } from '@/lib/server/email-adapter';

// In-memory rate limiting map: IP -> array of request timestamps
const contactRateLimitMap = new Map<string, number[]>();

export async function POST(req: NextRequest) {
  try {
    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('x-real-ip') ||
      '127.0.0.1';

    const now = Date.now();
    const windowMs = 10 * 60 * 1000; // 10 minutes
    const maxRequests = 5;

    const timestamps = (contactRateLimitMap.get(ip) || []).filter((t) => now - t < windowMs);

    if (timestamps.length >= maxRequests) {
      const waitMin = Math.ceil((windowMs - (now - timestamps[0])) / 60000);
      return NextResponse.json(
        {
          error: `Too many inquiries sent from your network. Please wait ${waitMin} minutes before sending another message.`,
        },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { name, email, subject, message, honeypot } = body;

    // Spam honeypot protection: if hidden field is filled, silently discard
    if (honeypot && String(honeypot).trim().length > 0) {
      return NextResponse.json({
        success: true,
        message: 'Your inquiry has been received. Our team will review it shortly.',
      });
    }

    // Server-side validation
    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return NextResponse.json(
        { error: 'Please provide a valid name (at least 2 characters).' },
        { status: 400 }
      );
    }

    if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return NextResponse.json(
        { error: 'Please provide a valid email address.' },
        { status: 400 }
      );
    }

    if (!subject || typeof subject !== 'string' || subject.trim().length < 3) {
      return NextResponse.json(
        { error: 'Please provide a descriptive subject.' },
        { status: 400 }
      );
    }

    if (!message || typeof message !== 'string' || message.trim().length < 10) {
      return NextResponse.json(
        { error: 'Please enter a message of at least 10 characters.' },
        { status: 400 }
      );
    }

    if (message.length > 5000) {
      return NextResponse.json(
        { error: 'Message exceeds maximum allowable length of 5000 characters.' },
        { status: 400 }
      );
    }

    // Record rate limit attempt
    timestamps.push(now);
    contactRateLimitMap.set(ip, timestamps);

    // Send email via configured provider (Resend in live, mock_console in dev/sandbox)
    const deliveryResult = await emailAdapter.sendContactInquiry({
      senderName: name.trim(),
      senderEmail: email.trim(),
      subject: subject.trim(),
      message: message.trim(),
    });

    if (!deliveryResult.success) {
      return NextResponse.json(
        {
          error: deliveryResult.error || 'Failed to dispatch email. Please try again or reach out directly.',
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      messageId: deliveryResult.messageId,
      provider: deliveryResult.provider,
      message: 'Your message has been delivered to the PDFKitFree support team. We typically respond within 24 business hours.',
    });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json(
      { error: error.message || 'An unexpected error occurred while processing your message.' },
      { status: 500 }
    );
  }
}
