import {
  Controller,
  Get,
  INestApplication,
  MiddlewareConsumer,
  Module,
  NestModule,
  Param,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { MetricsService } from './metrics.service';
import { MonitoringMiddleware, UNMATCHED_ROUTE } from './monitoring.middleware';

@Controller('items')
class ItemsController {
  @Get(':id')
  get(@Param('id') id: string) {
    return { id };
  }
}

describe('MonitoringMiddleware (real Nest app)', () => {
  let app: INestApplication;
  const metrics = { recordHttpRequest: jest.fn() };

  beforeAll(async () => {
    @Module({
      controllers: [ItemsController],
      providers: [
        MonitoringMiddleware,
        { provide: MetricsService, useValue: metrics },
      ],
    })
    class TestModule implements NestModule {
      configure(consumer: MiddlewareConsumer) {
        consumer.apply(MonitoringMiddleware).forRoutes('*');
      }
    }

    const moduleRef = await Test.createTestingModule({
      imports: [TestModule],
    }).compile();
    app = moduleRef.createNestApplication({ logger: false });
    app.setGlobalPrefix('api/v1');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => metrics.recordHttpRequest.mockClear());

  // `finish` fires after supertest resolves on some platforms; wait a tick.
  const flush = () => new Promise((resolve) => setImmediate(resolve));

  it('labels matched requests with the route template, not the raw path', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/items/some-short-slug')
      .expect(200);
    await flush();

    expect(metrics.recordHttpRequest).toHaveBeenCalledWith(
      'GET',
      '/api/v1/items/:id',
      200,
      expect.any(Number),
    );
  });

  it('collapses unmatched paths into one label', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/wp-admin/setup.php')
      .expect(404);
    await flush();

    expect(metrics.recordHttpRequest).toHaveBeenCalledWith(
      'GET',
      UNMATCHED_ROUTE,
      404,
      expect.any(Number),
    );
  });
});
