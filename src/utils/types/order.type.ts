import { OrderStatus, PaymentStatus, RechargeStatus } from './status.type';

export interface OrderType {
  id: string;
  orderNumber: string;
  price: number;
  orderStatus: OrderStatus;
  storeId: string;
  payment: {
    name: string;
    status: PaymentStatus;
    statusUpdatedAt: string | null;
    qrCode?: string;
    qrCodetextCopyPaste?: string;
  };
  orderItem: {
    productId: string;
    productName: string;
    recharge: {
      userIdForRecharge: string;
      status: RechargeStatus;
      amountCredits: number;
      statusUpdatedAt: string | null;
    };
    package: {
      packageId: string;
      name: string;
      userIdForRecharge: string;
      imgCardUrl: string;
    };
  };
}
