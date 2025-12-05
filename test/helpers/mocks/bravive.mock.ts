import { PaymentResponseDto } from '../../../src/bravive/dto/payment-response.dto';
import { WebhookPaymentDto, WebhookStatus } from '../../../src/bravive/dto/webhook-payment.dto';

/**
 * Mock responses for BraviveService
 * Used in integration tests to simulate Bravive API responses
 */

export class BraviveMock {
  /**
   * Creates a mock successful payment response
   */
  static createPaymentResponse(
    overrides?: Partial<PaymentResponseDto>,
  ): PaymentResponseDto {
    return {
      id: overrides?.id || `bravive-payment-${Date.now()}`,
      custom_id: overrides?.custom_id,
      method: overrides?.method || 'PIX',
      status: overrides?.status || 'PENDING',
      pix_qr_code:
        overrides?.pix_qr_code ||
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      pix_code:
        overrides?.pix_code ||
        '00020126580014BR.GOV.BCB.PIX0136123e4567-e89b-12d3-a456-4266141740005204000053039865802BR5913FULANO SILVA6008BRASILIA62070503***63041D3D',
      billet_url: overrides?.billet_url,
      billet_code: overrides?.billet_code,
      link_url: overrides?.link_url,
      created_at: overrides?.created_at || new Date().toISOString(),
    };
  }

  /**
   * Creates a mock webhook payload for approved payment
   */
  static createApprovedWebhook(
    paymentId: string,
    externalId?: string,
  ): WebhookPaymentDto {
    return {
      id: paymentId,
      type: 'PAYMENT',
      status: WebhookStatus.APPROVED,
      amount: 1999, // 19.99 in cents
      currency: 'BRL',
      external_id: externalId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      payer: {
        name: 'Test User',
        email: 'test@example.com',
        document: '12345678900',
      },
      payment_method: {
        type: 'PIX',
        details: {},
      },
    };
  }

  /**
   * Creates a mock webhook payload for rejected payment
   */
  static createRejectedWebhook(
    paymentId: string,
    externalId?: string,
  ): WebhookPaymentDto {
    return {
      id: paymentId,
      type: 'PAYMENT',
      status: WebhookStatus.REJECTED,
      amount: 1999,
      currency: 'BRL',
      external_id: externalId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      payer: {
        name: 'Test User',
        email: 'test@example.com',
        document: '12345678900',
      },
      payment_method: {
        type: 'PIX',
        details: {},
      },
    };
  }

  /**
   * Creates a mock webhook payload for canceled payment
   */
  static createCanceledWebhook(
    paymentId: string,
    externalId?: string,
  ): WebhookPaymentDto {
    return {
      id: paymentId,
      type: 'PAYMENT',
      status: WebhookStatus.CANCELED,
      amount: 1999,
      currency: 'BRL',
      external_id: externalId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      payer: {
        name: 'Test User',
        email: 'test@example.com',
        document: '12345678900',
      },
      payment_method: {
        type: 'PIX',
        details: {},
      },
    };
  }

  /**
   * Creates a mock webhook payload for refunded payment
   */
  static createRefundedWebhook(
    paymentId: string,
    externalId?: string,
  ): WebhookPaymentDto {
    return {
      id: paymentId,
      type: 'PAYMENT',
      status: WebhookStatus.REFUNDED,
      amount: 1999,
      currency: 'BRL',
      external_id: externalId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      payer: {
        name: 'Test User',
        email: 'test@example.com',
        document: '12345678900',
      },
      payment_method: {
        type: 'PIX',
        details: {},
      },
    };
  }

  /**
   * Creates a mock webhook payload for chargeback payment
   */
  static createChargebackWebhook(
    paymentId: string,
    externalId?: string,
  ): WebhookPaymentDto {
    return {
      id: paymentId,
      type: 'PAYMENT',
      status: WebhookStatus.CHARGEBACK,
      amount: 1999,
      currency: 'BRL',
      external_id: externalId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      payer: {
        name: 'Test User',
        email: 'test@example.com',
        document: '12345678900',
      },
      payment_method: {
        type: 'PIX',
        details: {},
      },
    };
  }

  /**
   * Creates a mock webhook payload for in dispute payment
   */
  static createInDisputeWebhook(
    paymentId: string,
    externalId?: string,
  ): WebhookPaymentDto {
    return {
      id: paymentId,
      type: 'PAYMENT',
      status: WebhookStatus.IN_DISPUTE,
      amount: 1999,
      currency: 'BRL',
      external_id: externalId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      payer: {
        name: 'Test User',
        email: 'test@example.com',
        document: '12345678900',
      },
      payment_method: {
        type: 'PIX',
        details: {},
      },
    };
  }
}

