// Chave do header Idempotency-Key: gere uma nova a cada tentativa de envio e
// reutilize-a apenas ao repetir a mesma requisição que ficou sem resposta.
export function novaChaveIdempotencia(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`
}
