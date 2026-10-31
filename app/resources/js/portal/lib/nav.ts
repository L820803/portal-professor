import { router, usePage } from '@inertiajs/react';
import { useMemo } from 'react';

/**
 * Navegação do portal. No mobile os parâmetros de cada tela iam no
 * `navigation.navigate(rota, params)`; na web vão na query string, para a
 * página sobreviver a um F5 e poder ser aberta em outra aba.
 */

export type Params = Record<string, string | number | null | undefined>;

export function href(caminho: string, params: Params = {}): string {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
        if (v !== null && v !== undefined && v !== '') query.set(k, String(v));
    });
    const qs = query.toString();
    return qs ? `${caminho}?${qs}` : caminho;
}

export function ir(caminho: string, params: Params = {}, opcoes: { replace?: boolean } = {}): void {
    router.visit(href(caminho, params), { replace: opcoes.replace ?? false });
}

const CHAVE_NAVEGOU = 'portal-professor:navegou';

/** Marca que houve navegação interna nesta aba (montado uma vez, no app.tsx). */
export function registrarNavegacaoInterna(): void {
    router.on('start', () => {
        try {
            window.sessionStorage.setItem(CHAVE_NAVEGOU, '1');
        } catch {
            // sessionStorage bloqueado: `voltar` cai sempre no fallback.
        }
    });
}

/** Volta uma tela no histórico; sem navegação interna nesta aba, vai para `fallback`. */
export function voltar(fallback = '/inicio'): void {
    let navegou = false;
    try {
        navegou = window.sessionStorage.getItem(CHAVE_NAVEGOU) === '1';
    } catch {
        navegou = false;
    }
    if (navegou && window.history.length > 1) window.history.back();
    else router.visit(fallback);
}

export function useQuery(): URLSearchParams {
    const { url } = usePage();
    return useMemo(() => new URLSearchParams(url.split('?')[1] ?? ''), [url]);
}

export function numero(valor: string | null): number | null {
    if (valor === null || valor === '') return null;
    const n = Number(valor);
    return Number.isFinite(n) ? n : null;
}
