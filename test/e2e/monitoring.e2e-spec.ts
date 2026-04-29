import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { MetricsController } from '../../src/monitoring/metrics.controller';
import { MetricsService } from '../../src/monitoring/metrics.service';
import { closeTestApp, createTestApp } from '../test-utils/e2e-helpers';

describe('Monitoring (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [MetricsController],
      providers: [MetricsService],
    }).compile();

    app = await createTestApp(moduleFixture);
  });

  afterAll(async () => {
    await closeTestApp(app);
  });

  it('GET /metrics', async () => {
    const res = await request(app.getHttpServer()).get('/metrics').expect(200);

    expect(res.headers['content-type']).toContain('text/plain');
    expect(typeof res.text).toBe('string');
    expect(res.text.length).toBeGreaterThan(0);
  });
});

