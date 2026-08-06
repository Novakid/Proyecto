import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/productos (GET)', () => {
    return request(app.getHttpServer())
      .get('/productos?limit=1')
      .expect(200)
      .expect((response) => {
        const body = JSON.parse(response.text) as Record<string, unknown>;
        expect(Array.isArray(body.data)).toBe(true);
        expect(typeof body.total).toBe('number');
      });
  });

  afterEach(async () => {
    await app.close();
  });
});
