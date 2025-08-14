export class Influencer {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  paymentMethod?: string | null;
  paymentData?: string | null;
  isActive: boolean;
  storeId: string;
  createdAt: Date;
  updatedAt: Date;
  // store?: Store;
  // coupons?: Coupon[];
}
