import { Controller, Post, Body } from '@nestjs/common';
import { EmailService } from './email.service';

@Controller('email')
export class EmailController {
  constructor(private readonly emailService: EmailService) {}

  @Post('test')
  async testEmail(@Body() body: { to: string; subject?: string; html?: string }) {
    const { to, subject = 'Test Email', html = '<h1>Test Email</h1><p>This is a test email.</p>' } = body;

    try {
      const result = await this.emailService.sendEmail(to, subject, html);
      return {
        success: true,
        message: 'Email sent successfully',
        result
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to send email',
        error: error.message,
        details: error.response?.body || error
      };
    }
  }
}
