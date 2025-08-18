import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { TestEmailDto } from './dto/test-email.dto';
import { EmailService } from './email.service';

@ApiTags('email')
@Controller('email')
export class EmailController {
  constructor(private readonly emailService: EmailService) {}

  @Post('test')
  @ApiOperation({
    summary: 'Send test email',
    description: 'Send a test email to the provided email address',
  })
  async testEmail(@Body() body: TestEmailDto) {
    const { email } = body;

    const testSubject = '🧪 Test Email - Recharge Platform API';
    const testHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #333;">🧪 Test Email</h1>
        <p>This is a test email from your <strong>Recharge Platform API</strong>.</p>
        <p>If you received this email, it means your email service is working correctly!</p>
        <hr>
        <p style="color: #666; font-size: 12px;">
          Sent at: ${new Date().toLocaleString()}<br>
          From: ${process.env.RESEND_FROM_EMAIL || 'noreply@4miga.games'}
        </p>
      </div>
    `;

    try {
      await this.emailService.sendEmail(email, testSubject, testHtml);

      return {
        success: true,
        message: 'Test email sent successfully',
        sentTo: email,
        sentAt: new Date().toISOString(),
      };
    } catch {
      return {
        success: false,
        message: 'Failed to send test email',
      };
    }
  }
}
