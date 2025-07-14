export type PaymentStatus =
  | 'PAYMENT_PENDING'
  | 'PAYMENT_APPROVED'
  | 'PAYMENT_REJECTED';

export type RechargeStatus =
  | 'RECHARGE_PENDING'
  | 'RECHARGE_APPROVED'
  | 'RECHARGE_REJECTED';

export type OrderStatus =
  | 'CREATED'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'EXPIRED'
  | 'REFOUNDED';
