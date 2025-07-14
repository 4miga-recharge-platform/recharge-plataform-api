import { PackageType } from './package.type';

export type ProductType = {
  id: string;
  name: string;
  about: string;
  instructions: string;
  imgBannerUrl: string;
  imgCardUrl: string;
  packages: PackageType[];
};
