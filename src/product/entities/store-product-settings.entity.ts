export class StoreProductSettings {
  id: string;
  storeId: string;
  productId: string;
  description?: string | null;
  instructions?: string | null;
  imgBannerUrl?: string | null;
  imgCardUrl?: string | null;
  createdAt: Date;
  updatedAt: Date;
}
