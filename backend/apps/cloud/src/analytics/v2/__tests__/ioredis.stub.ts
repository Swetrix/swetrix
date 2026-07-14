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
