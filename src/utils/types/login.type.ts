import { UserType } from './user.type';

export type LoginParams = {
  email: string;
  password: string;
};

export type LoginResponse = {
  access: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  };
  customer: UserType;
};
