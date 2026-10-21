import { Logger } from '@nestjs/common';
import { SeverityNumber } from '@opentelemetry/api-logs';
import { LoggingService } from './logging.service';

describe('LoggingService', () => {
  const originalLevel = process.env.LOG_LEVEL;
  let service: LoggingService;
  let emit: jest.SpyInstance;
  let stdout: jest.SpyInstance;
  let stderr: jest.SpyInstance;

  const emitted = () => emit.mock.calls.map(([record]) => record);

  beforeEach(() => {
    process.env.LOG_LEVEL = 'info';
    service = new LoggingService();
    emit = jest.spyOn((service as any).otelLogger, 'emit');
    stdout = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
    stderr = jest.spyOn(process.stderr, 'write').mockImplementation(() => true);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    process.env.LOG_LEVEL = originalLevel;
  });

  it('prints and emits a log call with its context', () => {
    service.log('hello', 'SomeService');

    expect(stdout).toHaveBeenCalledTimes(1);
    expect(String(stdout.mock.calls[0][0])).toContain('hello');
    expect(String(stdout.mock.calls[0][0])).toContain('SomeService');
    expect(emitted()).toEqual([
      expect.objectContaining({
        severityNumber: SeverityNumber.INFO,
        severityText: 'INFO',
        body: 'hello',
        attributes: expect.objectContaining({ context: 'SomeService' }),
      }),
    ]);
  });

  it('emits errors with their stack', () => {
    service.error('boom', 'Error: boom\n    at x', 'SomeService');

    expect(stderr).toHaveBeenCalled();
    expect(emitted()).toEqual([
      expect.objectContaining({
        severityNumber: SeverityNumber.ERROR,
        body: 'boom',
        attributes: expect.objectContaining({
          context: 'SomeService',
          trace: 'Error: boom\n    at x',
        }),
      }),
    ]);
  });

  it('turns non-string messages into text', () => {
    service.warn({ id: 1 }, 'SomeService');

    expect(emitted()[0].body).toBe('{"id":1}');
  });

  it('redacts credentials in object messages before printing and emitting', () => {
    service.warn('A jwt token was retrieved but failed validation.', {
      jwt: 'eyJhbGciOi.secret.payload',
    });

    const printed = stdout.mock.calls.map((c) => String(c[0])).join('');
    expect(printed).not.toContain('eyJhbGciOi');
    expect(printed).toContain('[REDACTED]');
    expect(emitted().map((r) => r.body)).toEqual([
      'A jwt token was retrieved but failed validation.',
      '{"jwt":"[REDACTED]"}',
    ]);
  });

  it('drops levels below LOG_LEVEL', () => {
    service.debug('noise', 'SomeService');
    service.logWithMeta('debug', 'noise', {});

    expect(stdout).not.toHaveBeenCalled();
    expect(emit).not.toHaveBeenCalled();
  });

  it('prints and emits structured logs once, with attributes', () => {
    service.logWithMeta('warn', 'GET /x 404 3ms', {
      context: 'HTTP',
      statusCode: 404,
    });

    expect(stdout).toHaveBeenCalledTimes(1);
    expect(emitted()).toEqual([
      expect.objectContaining({
        severityNumber: SeverityNumber.WARN,
        body: 'GET /x 404 3ms',
        attributes: expect.objectContaining({
          context: 'HTTP',
          status_code: 404,
        }),
      }),
    ]);
  });

  it('receives calls made through a Nest Logger instance', () => {
    Logger.overrideLogger(service);

    new Logger('MissionService').warn('Mission not found');

    expect(emitted()).toEqual([
      expect.objectContaining({
        severityNumber: SeverityNumber.WARN,
        body: 'Mission not found',
        attributes: expect.objectContaining({ context: 'MissionService' }),
      }),
    ]);
  });
});
