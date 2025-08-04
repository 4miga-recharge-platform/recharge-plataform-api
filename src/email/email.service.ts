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

    console.log('=== SendGrid Configuration ===');
    console.log('API Key configured:', !!apiKey);
    console.log('API Key preview:', apiKey ? `${apiKey.substring(0, 10)}...` : 'NOT SET');
    console.log('From Email:', fromEmail || 'NOT SET');

    if (!apiKey) {
      console.error('❌ SENDGRID_API_KEY is not configured in .env file');
      throw new Error('SENDGRID_API_KEY is required');
    }

    if (!fromEmail) {
      console.error('❌ SENDGRID_FROM_EMAIL is not configured in .env file');
      throw new Error('SENDGRID_FROM_EMAIL is required');
    }

    try {
      sgMail.setApiKey(apiKey);
      this.fromEmail = fromEmail;
      this.isConfigured = true;
      console.log('✅ SendGrid initialized successfully');
      console.log('From email:', this.fromEmail);
    } catch (error) {
      console.error('❌ Failed to initialize SendGrid:', error);
      throw error;
    }
  }

  async sendEmail(to: string, subject: string, html: string) {
    if (!this.isConfigured) {
      throw new Error('SendGrid is not properly configured');
    }

    try {
      console.log('📧 Attempting to send email...');
      console.log('To:', to);
      console.log('From:', this.fromEmail);
      console.log('Subject:', subject);
      console.log('Content length:', html.length, 'characters');

      const msg = {
        to,
        from: this.fromEmail,
        subject,
        html,
      };

      console.log('📤 Sending email via SendGrid...');
      const result = await sgMail.send(msg);

      console.log('✅ Email sent successfully!');
      console.log('SendGrid response:', JSON.stringify(result, null, 2));
      return result;
    } catch (error) {
      console.error('❌ Failed to send email:');
      console.error('Error details:', error);

      if (error.response) {
        console.error('SendGrid API Error:');
        console.error('Status:', error.response.status);
        console.error('Body:', error.response.body);
      }

      // Log specific error types
      if (error.code === 401) {
        console.error('🔐 Authentication failed - check your API key');
      } else if (error.code === 403) {
        console.error('🚫 Authorization failed - check your sender permissions');
      } else if (error.code === 400) {
        console.error('📝 Bad request - check your email format');
      }

      throw error;
    }
  }

  // Method to test email configuration
  async testEmailConfiguration() {
    console.log('🧪 Testing email configuration...');

    const testEmail = 'test@example.com';
    const testSubject = 'Test Email Configuration';
    const testHtml = '<h1>Test Email</h1><p>This is a test email to verify SendGrid configuration.</p>';

    try {
      await this.sendEmail(testEmail, testSubject, testHtml);
      console.log('✅ Email configuration test passed');
      return true;
    } catch (error) {
      console.error('❌ Email configuration test failed:', error);
      return false;
    }
  }
}
