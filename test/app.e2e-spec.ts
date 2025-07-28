import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('GET /', () => {
    it('should return app status', () => {
      return request(app.getHttpServer())
        .get('/')
        .expect(200)
        .expect((res) => {
          expect(res.text).toContain('Server is running! 🚀');
        });
    });
  });

  describe('GET /health', () => {
    it('should return health status', () => {
      return request(app.getHttpServer())
        .get('/health')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('status', 'ok');
          expect(res.body).toHaveProperty('timestamp');
          expect(res.body).toHaveProperty('uptime');
          expect(res.body).toHaveProperty('environment');
        });
    });
  });

  describe('GET /ping', () => {
    it('should return pong message', () => {
      return request(app.getHttpServer())
        .get('/ping')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('message', 'pong');
        });
    });
  });
});
