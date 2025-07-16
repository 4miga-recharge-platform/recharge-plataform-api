// import { PaymentMethod } from 'src/payment/entities/payment-method.entity';
import { Product } from 'src/product/entities/product.entity';
import { Store } from 'src/store/entities/store.entity';

export class Package {
  id: string;
  name: string;
  amountCredits: number;
  imgCardUrl: string;
  isOffer: boolean;
  basePrice: number;
  productId: string;
  storeId: string;
  createdAt: Date;
  updatedAt: Date;

  // Relations
  paymentMethods?: any[];
}
