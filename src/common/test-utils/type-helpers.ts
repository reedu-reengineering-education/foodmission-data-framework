export type MockService<T> = {
  [K in keyof T]: T[K] extends (...args: any[]) => any
    ? jest.MockedFunction<T[K]>
    : T[K];
};

export type MockGuard = {
  canActivate: jest.MockedFunction<() => boolean>;
};

