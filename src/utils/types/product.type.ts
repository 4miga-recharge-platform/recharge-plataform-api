import { PackageType } from './package.type';

export type ProductType = {
  id: string;
  name: string;
  description: string;
  instructions: string;
  imgBannerUrl: string;
  imgCardUrl: string;
  packages: PackageType[];
  createdAt: string;
  updatedAt: string;
};
