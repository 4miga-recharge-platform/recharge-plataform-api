import { PaymentMethodsType } from './payment.type';

export type PackageType = {
  id: string;
  name: string;
  amountCredits: number;
  imgCardUrl: string;
  isOffer: boolean;
  basePrice: number;
  paymentMethods: PaymentMethodsType[];
  productId: string;
  storeId: string;
  createdAt: string;
  updatedAt: string;
};
