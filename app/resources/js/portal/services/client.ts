/**
 * No app mobile, este módulo é o cliente axios da API mobile do e-cidade.
 * No portal web, por enquanto, todos os services respondem com dados fake
 * (`portal/fake`) — aqui ficam só os utilitários de erro que as telas usam,
 * com a mesma interface do mobile, para a troca pela API real ser local
 * aos services.
 */

/** Erro de negócio sinalizado pela API (`{ error: true, message }`). */
export class ApiBusinessError extends Error {}

export function extractErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof ApiBusinessError) return error.message || fallback;
    if (error instanceof Error && error.message) return error.message;
    return fallback;
}
