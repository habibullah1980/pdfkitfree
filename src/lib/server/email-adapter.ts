import crypto from 'crypto';

export interface EmailDeliveryResult {
  success: boolean;
  messageId?: string;
  error?: string;
  provider: 'mock_console' | 'resend' | 'sendgrid' | 'smtp';
  devPreviewUrl?: string;
}

export class EmailProviderAdapter {
  private getProvider(): 'mock_console' | 'resend' | 'sendgrid' | 'smtp' {
    if (process.env.RESEND_API_KEY) {
      return 'resend';
    }
    return (process.env.EMAIL_PROVIDER as EmailDeliveryResult['provider']) || 'mock_console';
  }

  private getResendApiKey(): string | undefined {
    return process.env.RESEND_API_KEY;
  }

  private getFromEmail(): string {
    return process.env.FROM_EMAIL || 'PDFKitFree Support <noreply@pdfkitfree.online>';
  }

  async sendVerificationEmail(to: string, code: string, verifyLink: string): Promise<EmailDeliveryResult> {
    const provider = this.getProvider();
    const resendApiKey = this.getResendApiKey();
    const fromEmail = this.getFromEmail();
    const isLiveResend = (provider === 'resend' || !!resendApiKey) && !!resendApiKey;

    if (isLiveResend) {
      try {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: fromEmail,
            to: [to],
            subject: 'Verify your pdfkitfree account',
            html: `
              <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px;">
                <h2 style="color: #4b49ac;">Verify Your Email Address</h2>
                <p>Thank you for joining pdfkitfree. Use the 6-digit confirmation code below or click the verification link:</p>
                <div style="background-color: #f3f2fd; padding: 16px; border-radius: 8px; text-align: center; margin: 20px 0;">
                  <span style="font-family: monospace; font-size: 28px; font-weight: bold; letter-spacing: 6px; color: #4b49ac;">${code}</span>
                </div>
                <p><a href="${verifyLink}" style="display: inline-block; background-color: #4b49ac; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px;">Verify Email</a></p>
                <p style="font-size: 12px; color: #64748b; margin-top: 24px;">This code expires in 24 hours. If you did not create an account, you can safely ignore this email.</p>
              </div>
            `,
          }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          console.error('[EmailAdapter] Resend API verification delivery rejected with status:', res.status);
          return {
            success: false,
            error: errData.message || 'Email delivery failed via Resend API.',
            provider: 'resend',
          };
        }

        const data = await res.json();
        return {
          success: true,
          messageId: data.id,
          provider: 'resend',
        };
      } catch (err: unknown) {
        console.error('[EmailAdapter] Network error calling Resend API for verification email');
        return {
          success: false,
          error: (err as Error).message || 'Resend network error',
          provider: 'resend',
        };
      }
    }

    // Sandboxed / Dev fallback
    return {
      success: true,
      provider: 'mock_console',
      messageId: `email_${crypto.randomUUID().slice(0, 8)}`,
      devPreviewUrl: verifyLink,
    };
  }

  async sendPasswordResetEmail(to: string, resetLink: string): Promise<EmailDeliveryResult> {
    const provider = this.getProvider();
    const resendApiKey = this.getResendApiKey();
    const fromEmail = this.getFromEmail();
    const isLiveResend = (provider === 'resend' || !!resendApiKey) && !!resendApiKey;

    if (isLiveResend) {
      try {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: fromEmail,
            to: [to],
            subject: 'Reset your pdfkitfree password',
            html: `
              <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px;">
                <h2 style="color: #4b49ac;">Password Reset Request</h2>
                <p>We received a request to reset your password. Click the secure link below to set a new password:</p>
                <p style="margin: 24px 0;"><a href="${resetLink}" style="background-color: #4b49ac; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Reset Password</a></p>
                <p style="font-size: 12px; color: #64748b;">This link is single-use and expires in 1 hour. If you did not make this request, please contact support.</p>
              </div>
            `,
          }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          console.error('[EmailAdapter] Resend API password reset delivery rejected with status:', res.status);
          return {
            success: false,
            error: errData.message || 'Email delivery failed.',
            provider: 'resend',
          };
        }

        const data = await res.json();
        return {
          success: true,
          messageId: data.id,
          provider: 'resend',
        };
      } catch (err: unknown) {
        console.error('[EmailAdapter] Network error calling Resend API for password reset');
        return {
          success: false,
          error: (err as Error).message || 'Email network error',
          provider: 'resend',
        };
      }
    }

    return {
      success: true,
      provider: 'mock_console',
      messageId: `email_${crypto.randomUUID().slice(0, 8)}`,
      devPreviewUrl: resetLink,
    };
  }

  async sendContactInquiry(params: {
    senderName: string;
    senderEmail: string;
    subject: string;
    message: string;
    recipientEmail?: string;
  }): Promise<EmailDeliveryResult> {
    const provider = this.getProvider();
    const resendApiKey = this.getResendApiKey();
    const fromEmail = this.getFromEmail();
    const recipient = params.recipientEmail || process.env.SUPPORT_RECIPIENT_EMAIL || 'support@pdfkitfree.online';

    // In production or when configured for live delivery, require active credentials
    const isLiveResend = (provider === 'resend' || !!resendApiKey) && !!resendApiKey;

    // If production environment but RESEND_API_KEY is missing, fail safely
    if (process.env.NODE_ENV === 'production' && !resendApiKey) {
      console.error('[EmailAdapter] Production email dispatch failed: RESEND_API_KEY environment variable is missing.');
      return {
        success: false,
        error: 'Email service configuration missing. Please contact support directly.',
        provider: 'resend',
      };
    }

    if (isLiveResend) {
      // Sanitize user inputs for HTML rendering
      const safeName = params.senderName.replace(/[<>]/g, '');
      const safeEmail = params.senderEmail.replace(/[<>]/g, '');
      const safeSubject = params.subject.replace(/[<>]/g, '');
      const safeMessage = params.message.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br/>');

      try {
        console.log('[EmailAdapter] Initiating Resend email dispatch to configured recipient.');
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: fromEmail,
            to: [recipient],
            reply_to: safeEmail,
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
          }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          console.error('[EmailAdapter] Resend email delivery failed with HTTP status:', res.status);
          return {
            success: false,
            error: errData.message || 'Email delivery failed via Resend API.',
            provider: 'resend',
          };
        }

        const data = await res.json();
        console.log('[EmailAdapter] Resend successfully accepted inquiry for delivery. ID:', data.id);
        return {
          success: true,
          messageId: data.id,
          provider: 'resend',
        };
      } catch (err: unknown) {
        console.error('[EmailAdapter] Resend network connection error occurred');
        return {
          success: false,
          error: (err as Error).message || 'Resend network error',
          provider: 'resend',
        };
      }
    }

    // Mock console fallback strictly for non-production development/sandbox testing
    console.log('[EmailAdapter] Sandbox mock dispatch completed (non-production).');
    return {
      success: true,
      provider: 'mock_console',
      messageId: `contact_${crypto.randomUUID().slice(0, 8)}`,
    };
  }
}

export const emailAdapter = new EmailProviderAdapter();
