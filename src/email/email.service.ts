import { Injectable } from '@nestjs/common';
import * as sgMail from '@sendgrid/mail';

@Injectable()
export class EmailService {
  private fromEmail: string;
  private isConfigured: boolean = false;

  constructor() {
    this.initializeSendGrid();
  }

  private initializeSendGrid() {
    const apiKey = process.env.SENDGRID_API_KEY;
    const fromEmail = process.env.SENDGRID_FROM_EMAIL;

    if (!apiKey) {
      throw new Error('SENDGRID_API_KEY is required');
    }

    if (!fromEmail) {
      throw new Error('SENDGRID_FROM_EMAIL is required');
    }

    try {
      sgMail.setApiKey(apiKey);
      sgMail.setTimeout(10000);
      this.fromEmail = fromEmail;
      this.isConfigured = true;
    } catch (error) {
      throw new Error(`Failed to initialize SendGrid: ${error.message}`);
    }
  }

  async sendEmail(to: string, subject: string, html: string) {
    if (!this.isConfigured) {
      throw new Error('SendGrid is not properly configured');
    }

    try {
      const msg = {
        to,
        from: this.fromEmail,
        subject,
        html,
      };

      const result = await sgMail.send(msg);
      return result;
    } catch (error) {
      if (error.response) {
        throw new Error(
          `SendGrid API Error: ${error.response.status} - ${error.response.body}`,
        );
      }

      if (error.code === 401) {
        throw new Error('Authentication failed - check your API key');
      } else if (error.code === 403) {
        throw new Error('Authorization failed - check your sender permissions');
      } else if (error.code === 400) {
        throw new Error('Bad request - check your email format');
      } else if (error.code === 'EAI_AGAIN') {
        throw new Error('DNS resolution failed - check network connectivity');
      } else if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
        throw new Error('Connection timeout - check network or try again');
      }

      throw new Error(`Failed to send email: ${error.message}`);
    }
  }
}
