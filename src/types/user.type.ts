export type UserType = {
  id: string;
  name: string;
  email: string;
  phone: string;
  password: string;
  individualIdentification: IndividualIdentificationType;
};

export type IndividualIdentificationType = {
  type: 'cpf' | 'cnpj';
  value: string;
};
