export interface ProcessarDespesaJobPayload {
  readonly cnpj: string;
  readonly usuarioId?: string;
  readonly tentativa?: number;
}
