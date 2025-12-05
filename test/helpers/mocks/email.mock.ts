/**
 * Mock for EmailService
 * Used in integration tests to prevent actual email sending
 */

export interface EmailSendResult {
  id: string;
  from: string;
  to: string[];
  created_at: string;
}

export class EmailMock {
  /**
   * Creates a mock successful email send result
   */
  static createSendSuccess(to: string): EmailSendResult {
    return {
      id: `email-${Date.now()}`,
      from: process.env.RESEND_FROM_EMAIL || 'test@example.com',
      to: [to],
      created_at: new Date().toISOString(),
    };
  }

  /**
   * Creates a mock email service implementation
   * Returns a jest mock that can be used to override EmailService
   */
  static createMockService() {
    return {
      sendEmail: jest.fn().mockResolvedValue(EmailMock.createSendSuccess('test@example.com')),
      sendEmailConfirmation: jest.fn().mockResolvedValue(true),
      sendPasswordResetEmail: jest.fn().mockResolvedValue(true),
      sendWelcomeEmail: jest.fn().mockResolvedValue(true),
    };
  }
}

