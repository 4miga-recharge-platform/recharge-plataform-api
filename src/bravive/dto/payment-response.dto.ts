import { ApiProperty } from '@nestjs/swagger';

export class PaymentResponseDto {
  @ApiProperty({
    description: 'Payment ID from Bravive',
    example: 'abc123',
  })
  id: string;

  @ApiProperty({
    description: 'Custom ID (if provided)',
    example: 'abc123',
    required: false,
  })
  custom_id?: string;

  @ApiProperty({
    description: 'Payment method',
    example: 'PIX',
  })
  method: string;

  @ApiProperty({
    description: 'Payment status',
    example: 'PENDING',
  })
  status: string;

  @ApiProperty({
    description: 'PIX QR Code (base64 image)',
    example: 'data:image/png;base64,iVBORw0KG...',
    required: false,
  })
  pix_qr_code?: string;

  @ApiProperty({
    description: 'PIX code for copy and paste',
    example: '00020126580014BR.GOV.BCB.PIX...',
    required: false,
  })
  pix_code?: string;

  @ApiProperty({
    description: 'Billet URL (if payment method is boleto)',
    example: 'https://app.bravive.com/billet/abc123',
    required: false,
  })
  billet_url?: string;

  @ApiProperty({
    description: 'Billet code (if payment method is boleto)',
    example: '34191.09008 01234.567890 12345.678901 2 12345678901234',
    required: false,
  })
  billet_code?: string;

  @ApiProperty({
    description: 'Payment link URL (for credit card or other methods)',
    example: 'https://app.bravive.com/pay/abc123',
    required: false,
  })
  link_url?: string;

  @ApiProperty({
    description: 'Payment creation date',
    example: '2024-01-01T00:00:00Z',
  })
  created_at: string;
}

