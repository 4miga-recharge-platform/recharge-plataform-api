export type UserType = {
  id: string;
  name: string;
  email: string;
  phone: string;
  password: string;
  documentType: 'cpf' | 'cnpj';
  documentValue: string;
  storeId?: string | null;
  role: 'MASTER_ADMIN' | 'ADMIN' | 'USER';
  createdAt: string;
  updatedAt: string;
};
