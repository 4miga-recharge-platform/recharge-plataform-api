export type UserType = {
  id: string;
  name: string;
  email: string;
  phone: string;
  password: string;
  documentType: 'cpf' | 'cnpj';
  documentValue: string;
  createdAt: string;
  updatedAt: string;
};
