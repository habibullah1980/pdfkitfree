import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

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

    const apiKey = process.env.RESEND_API_KEY;

    // Check for missing configuration
    if (!apiKey) {
      console.error('[ContactAPI] Dispatch failed: RESEND_API_KEY environment variable is not configured.');
      return NextResponse.json(
        {
          error: 'Email service is not configured. Please contact support@pdfkitfree.online directly.',
        },
        { status: 500 }
      );
    }

    const fromEmail = process.env.FROM_EMAIL || 'PDFKitFree Support <noreply@pdfkitfree.online>';
    const recipientEmail = process.env.SUPPORT_RECIPIENT_EMAIL || 'support@pdfkitfree.online';

    // Sanitize user inputs for HTML rendering
    const safeName = name.trim().replace(/[<>]/g, '');
    const safeEmail = email.trim().replace(/[<>]/g, '');
    const safeSubject = subject.trim().replace(/[<>]/g, '');
    const safeMessage = message.trim().replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br/>');

    const resend = new Resend(apiKey);

    console.log('[ContactAPI] Invoking Resend SDK to dispatch contact inquiry.');
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: [recipientEmail],
      replyTo: safeEmail,
      subject: `[PDFKitFree Inquiry] ${safeSubject}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
          <div style="border-bottom: 2px solid #4b49ac; padding-bottom: 12px; margin-bottom: 20px;">
            <h2 style="color: #4b49ac; margin: 0; font-size: 20px;">New Contact Form Submission</h2>
            <p style="color: #64748b; font-size: 13px; margin: 4px 0 0 0;">Received via PDFKitFree Support Portal</p>
          </div>
          <div style="margin-bottom: 16px;">
            <strong style="color: #334155; font-size: 14px;">Sender:</strong>
            <span style="color: #0f172a; font-size: 14px; margin-left: 6px;">${safeName} &lt;${safeEmail}&gt;</span>
          </div>
          <div style="margin-bottom: 16px;">
            <strong style="color: #334155; font-size: 14px;">Subject:</strong>
            <span style="color: #0f172a; font-size: 14px; margin-left: 6px;">${safeSubject}</span>
          </div>
          <div style="margin-top: 20px; padding: 16px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;">
            <strong style="display: block; color: #475569; font-size: 13px; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">Message Content:</strong>
            <div style="color: #1e293b; font-size: 14px; line-height: 1.6; white-space: pre-wrap;">${safeMessage}</div>
          </div>
          <p style="font-size: 11px; color: #94a3b8; margin-top: 24px; border-top: 1px solid #f1f5f9; padding-top: 12px;">
            You can reply directly to this email to respond to ${safeName} (${safeEmail}).
          </p>
        </div>
      `,
    });

    if (error) {
      console.error(
        `[ContactAPI] Resend SDK dispatch rejected. ErrorName: ${error.name || 'Error'}, ErrorMessage: ${error.message || 'Unknown'}`
      );
      return NextResponse.json(
        {
          error: 'Failed to dispatch email. Please try again or reach out to support@pdfkitfree.online directly.',
        },
        { status: 500 }
      );
    }

    console.log('[ContactAPI] Resend email accepted successfully. Message ID:', data?.id);

    return NextResponse.json({
      success: true,
      messageId: data?.id,
      provider: 'resend',
      message: 'Your message has been delivered to the PDFKitFree support team. We typically respond within 24 business hours.',
    });
  } catch (err: unknown) {
    const error = err as Error;
    console.error('[ContactAPI] Unexpected exception in contact handler:', error.message);
    return NextResponse.json(
      { error: 'An unexpected error occurred while processing your message. Please try again later.' },
      { status: 500 }
    );
  }
}
