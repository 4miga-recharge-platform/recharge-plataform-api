import { OrderType } from './order.type';
import { PackageType } from './package.type';
import { UserType } from './user.type';

export type StoreType = {
  id: string;
  name: string;
  email: string;
  password?: string;
  createdAt: Date;
  updatedAt: Date;
  users?: UserType[];
  packages?: PackageType[];
  orders?: OrderType[];
};
