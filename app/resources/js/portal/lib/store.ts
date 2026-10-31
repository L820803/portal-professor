import { useSyncExternalStore } from 'react';

/**
 * Store mínima no formato do zustand usado no app mobile (`getState`,
 * `setState` e o hook `useStore` com seletor), sem dependência extra. Com `persistKey`, o
 * estado é guardado no localStorage e restaurado ao recarregar a página.
 */
export interface Store<T> {
    getState: () => T;
    /** Estado sem o que veio do localStorage — é o que o SSR enxerga. */
    getInitialState: () => T;
    setState: (partial: Partial<T> | ((state: T) => Partial<T>)) => void;
    subscribe: (listener: () => void) => () => void;
}

/**
 * Lê uma fatia da store e re-renderiza quando ela muda (o seletor deve
 * devolver um valor estável). Na hidratação do SSR usa o estado inicial,
 * igual ao do servidor, e só depois o do navegador.
 */
export function useStore<T, S>(store: Store<T>, selector: (state: T) => S): S {
    return useSyncExternalStore(
        store.subscribe,
        () => selector(store.getState()),
        () => selector(store.getInitialState()),
    );
}

export function lerStorage<T>(chave: string): T | null {
    try {
        const bruto = window.localStorage.getItem(chave);
        return bruto ? (JSON.parse(bruto) as T) : null;
    } catch {
        return null;
    }
}

export function gravarStorage(chave: string, valor: unknown): void {
    try {
        window.localStorage.setItem(chave, JSON.stringify(valor));
    } catch {
        // storage cheio/bloqueado (aba anônima): segue só em memória.
    }
}

export function removerStorage(chave: string): void {
    try {
        window.localStorage.removeItem(chave);
    } catch {
        // idem
    }
}

export function createStore<T extends object>(
    inicial: T,
    persistKey?: string,
    /** Campos gravados no storage; padrão = todos. */
    persistir?: (state: T) => Partial<T>,
): Store<T> {
    const salvo =
        persistKey && typeof window !== 'undefined'
            ? lerStorage<Partial<T>>(persistKey)
            : null;
    let state: T = salvo ? { ...inicial, ...salvo } : inicial;
    const listeners = new Set<() => void>();

    const store: Store<T> = {
        getState: () => state,
        getInitialState: () => inicial,
        setState: (partial) => {
            const parcial =
                typeof partial === 'function' ? partial(state) : partial;
            state = { ...state, ...parcial };
            if (persistKey) {
                gravarStorage(
                    persistKey,
                    persistir ? persistir(state) : state,
                );
            }
            listeners.forEach((l) => l());
        },
        subscribe: (listener) => {
            listeners.add(listener);
            return () => {
                listeners.delete(listener);
            };
        },
    };

    return store;
}
