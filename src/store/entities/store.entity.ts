export class Store {
  id: string;
  name: string;
  email?: string | null;
  domain: string;
  wppNumber?: string | null;
  instagramUrl?: string | null;
  facebookUrl?: string | null;
  tiktokUrl?: string | null;
  logoUrl?: string | null;
  miniLogoUrl?: string | null;
  faviconUrl?: string | null;
  bannersUrl?: string[];
  secondaryBannerUrl?: string | null;
  createdAt: Date;
  updatedAt: Date;
  // users?: User[];
  // packages?: Package[];
  // orders?: Order[];
}
