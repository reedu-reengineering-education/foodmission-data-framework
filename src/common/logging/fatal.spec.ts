import { Logger } from '@nestjs/common';
import { logFatalAndExit, resetFatalStateForTests } from './fatal';

describe('logFatalAndExit', () => {
  let fatal: jest.SpyInstance;
  let exit: jest.Mock;

  beforeEach(() => {
    resetFatalStateForTests();
    fatal = jest.spyOn(Logger, 'fatal').mockImplementation(() => undefined);
    jest.spyOn(Logger, 'flush').mockImplementation(() => undefined);
    exit = jest.fn();
  });

  afterEach(() => jest.restoreAllMocks());

  it('logs the error with its stack and exits with code 1', async () => {
    const error = new Error('port in use');

    await logFatalAndExit('Bootstrap failed', error, exit);

    expect(fatal).toHaveBeenCalledTimes(1);
    expect(fatal).toHaveBeenCalledWith(
      `Bootstrap failed: port in use\n${error.stack}`,
      'Process',
    );
    expect(exit).toHaveBeenCalledWith(1);
  });

  it('handles non-Error rejection reasons', async () => {
    await logFatalAndExit('Unhandled promise rejection', 'nope', exit);

    expect(fatal).toHaveBeenCalledWith(
      'Unhandled promise rejection: nope',
      'Process',
    );
    expect(exit).toHaveBeenCalledWith(1);
  });

  it('only handles the first failure', async () => {
    await logFatalAndExit('First', new Error('a'), exit);
    await logFatalAndExit('Second', new Error('b'), exit);

    expect(fatal).toHaveBeenCalledTimes(1);
    expect(exit).toHaveBeenCalledTimes(1);
  });
});
