export type PaymentMethodsType = {
  name:
    | 'pix'
    | 'mercado pago'
    | 'picpay'
    | 'paypal'
    | 'boleto'
    | 'transferencia';
  price: number;
};

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
