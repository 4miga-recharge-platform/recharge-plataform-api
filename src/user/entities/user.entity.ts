export class User {
  id: string;
  name: string;
  email: string;
  phone: string;
  password: string;
  documentType: 'cpf' | 'cnpj';
  documentValue: string;
  rechargeBigoId?: string | null;
  role?: 'MASTER_ADMIN_4MIGA_USER' | 'RESELLER_ADMIN_4MIGA_USER' | 'USER';
  createdAt: Date;
  updatedAt: Date;
  storeId: string;
}
