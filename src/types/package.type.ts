import { PaymentMethodsType } from './payment.type';

export type PackageType = {
  id: string;
  name: string;
  amountCredits: number;
  imgCardUrl: string;
  isOffer: boolean;
  basePrice: number;
  paymentMethods: PaymentMethodsType[];
  createdAt: string;
  updatedAt: string;
};
