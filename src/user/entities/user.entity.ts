export class User {
  id: string;
  name: string;
  email: string;
  phone: string;
  password: string;
  documentType: 'cpf' | 'cnpj';
  documentValue: string;
  role: 'MASTER_ADMIN' | 'ADMIN' | 'USER';
  createdAt: Date;
  updatedAt: Date;
  storeId: string;
}
