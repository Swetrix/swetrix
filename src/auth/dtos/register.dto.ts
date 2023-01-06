export namespace RegisterDto {
  export class Request {
    public readonly email: string
    public readonly password: string
    public readonly checkIfLeaked: boolean
  }

  export class Response {
    public readonly accessToken: string
  }
}
