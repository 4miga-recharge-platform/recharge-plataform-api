export class Store {
  id: string;
  name: string;
  email: string;
  domain: string;
  wppNumber?: string | null;
  instagramUrl?: string | null;
  facebookUrl?: string | null;
  tiktokUrl?: string | null;
  logoUrl?: string | null;
  miniLogoUrl?: string | null;
  faviconUrl?: string | null;
  bannersUrl?: string[];
  offerBannerImage?: string | null;
  createdAt: Date;
  updatedAt: Date;
  // users?: User[];
  // packages?: Package[];
  // orders?: Order[];
}
