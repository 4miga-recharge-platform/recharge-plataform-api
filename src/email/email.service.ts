import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private resend: Resend;
  private fromEmail: string;

  constructor() {
    this.initializeResend();
  }

  private initializeResend() {
    const apiKey = process.env.RESEND_API_KEY;
    const fromEmailEnv = process.env.RESEND_FROM_EMAIL || 'noreply@4miga.games';
    const fromName = process.env.RESEND_FROM_NAME || '4miga.games';

    if (!apiKey) {
      throw new Error('RESEND_API_KEY is required');
    }

    this.resend = new Resend(apiKey);
    // Format: "Nome <email@domain.com>" or just "email@domain.com" if no name
    this.fromEmail = fromName ? `${fromName} <${fromEmailEnv}>` : fromEmailEnv;
  }

  async sendEmail(to: string, subject: string, html: string) {
    try {
      const result = await this.resend.emails.send({
        from: this.fromEmail,
        to: [to],
        subject,
        html,
      });

      return result;
    } catch (error) {
      this.logger.error('Resend email error:', {
        message: error.message,
        status: error.statusCode,
        details: error.details,
      });

      if (error.statusCode === 401) {
        throw new Error('Authentication failed - check your API key');
      } else if (error.statusCode === 403) {
        throw new Error('Authorization failed - check your sender permissions');
      } else if (error.statusCode === 400) {
        throw new Error(`Bad request: ${error.message}`);
      } else if (error.statusCode === 429) {
        throw new Error('Rate limit exceeded - try again later');
      }

      throw new Error(`Failed to send email: ${error.message}`);
    }
  }
}
