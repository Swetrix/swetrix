/**
 * Minimal ioredis stand-in so importing analytics.service.ts (which pulls in
 * common/constants and its module-level Redis client) doesn't open network
 * connections during unit tests.
 */
class RedisStub {
  // eslint-disable-next-line @typescript-eslint/no-useless-constructor
  constructor(..._args: unknown[]) {}

  defineCommand(): void {}

  on(): this {
    return this
  }
}

export default RedisStub
export { RedisStub as Redis }
