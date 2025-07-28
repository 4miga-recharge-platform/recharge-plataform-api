import { config } from 'dotenv';
import { resolve } from 'path';

// Carrega as variáveis de ambiente do arquivo test.env
config({ path: resolve(__dirname, '../test.env') });

// Configurações globais para testes de integração
beforeAll(() => {
  // Garante que as variáveis de ambiente estão carregadas
  expect(process.env.DATABASE_URL).toBeDefined();
  expect(process.env.JWT_SECRET).toBeDefined();
});

afterAll(() => {
  // Cleanup global se necessário
});
