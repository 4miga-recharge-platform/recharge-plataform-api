export class Coupon {
  id: string;
  title: string;
  influencerId: string;
  discountPercentage?: number | null;
  discountAmount?: number | null;
  expiresAt?: Date | null;
  timesUsed: number;
  totalSalesAmount: number;
  maxUses?: number | null;
  minOrderAmount?: number | null;
  isActive: boolean;
  isFirstPurchase: boolean;
  storeId: string;
  createdAt: Date;
  updatedAt: Date;
  // store?: Store;
  // influencer?: Influencer;
  // couponUsages?: CouponUsage[];
}
