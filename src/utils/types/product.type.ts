import { PackageType } from './package.type';

export type StoreCustomizationType = {
  description?: string;
  instructions?: string;
  imgBannerUrl?: string;
  imgCardUrl?: string;
};

export type ProductType = {
  id: string;
  name: string;
  description: string;
  instructions: string;
  imgBannerUrl: string;
  imgCardUrl: string;
  packages: PackageType[];
  storeCustomization?: StoreCustomizationType | null;
  createdAt: string;
  updatedAt: string;
};
