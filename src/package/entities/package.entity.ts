// import { PaymentMethod } from 'src/payment/entities/payment-method.entity';

export class Package {
  id: string;
  name: string;
  amountCredits: number;
  imgCardUrl: string;
  isActive: boolean;
  isOffer: boolean;
  basePrice: number;
  productId: string;
  storeId: string;
  createdAt: Date;
  updatedAt: Date;

  // Relations
  paymentMethods?: any[];
}
