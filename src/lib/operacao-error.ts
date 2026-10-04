export class OperacaoError extends Error {
  readonly status: number

  constructor(message: string, status = 409) {
    super(message)
    this.status = status
  }
}
