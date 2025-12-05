export type PaymentMethodsType = {
  id: string;
  name:
    | 'pix'
    | 'mercado_pago'
    | 'picpay'
    | 'paypal'
    | 'boleto'
    | 'transferencia';
  price: number;
  packageId: string;
  createdAt: string;
  updatedAt: string;
};

export type PaymentMethodName = PaymentMethodsType['name'];

export interface paymentResponse {
  orderId: string;
  orderNumber: string;
  userIdForRecharge: string;
  amount: number;
  paymentMethodName: PaymentMethodsType['name'];
  qrCode: string;
  urlQRCode: string;
  qrCodetextCopyPaste: string;
}
