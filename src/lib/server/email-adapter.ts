import crypto from 'crypto';

export interface EmailDeliveryResult {
  success: boolean;
  messageId?: string;
  error?: string;
  provider: 'mock_console' | 'resend' | 'sendgrid' | 'smtp';
  devPreviewUrl?: string;
}

export class EmailProviderAdapter {
  private provider: 'mock_console' | 'resend' | 'sendgrid' | 'smtp';
  private resendApiKey?: string;
  private fromEmail: string;

  constructor() {
    this.provider = (process.env.EMAIL_PROVIDER as EmailDeliveryResult['provider']) || 'mock_console';
    this.resendApiKey = process.env.RESEND_API_KEY;
    this.fromEmail = process.env.FROM_EMAIL || 'pdfkitfree Security <noreply@pdfkitfree.com>';
  }

  async sendVerificationEmail(to: string, code: string, verifyLink: string): Promise<EmailDeliveryResult> {
    const isLiveResend = this.provider === 'resend' && !!this.resendApiKey;

    if (isLiveResend) {
      try {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: this.fromEmail,
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
    const isLiveResend = this.provider === 'resend' && !!this.resendApiKey;

    if (isLiveResend) {
      try {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: this.fromEmail,
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
}

export const emailAdapter = new EmailProviderAdapter();
