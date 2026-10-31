/**
 * Aleatoriedade determinística para os dados fake: o mesmo aluno/dia sempre
 * gera o mesmo valor, então as telas ficam consistentes entre si (a falta
 * que aparece na chamada é a mesma do mapa de faltas e do boletim) e entre
 * recarregamentos da página.
 */
export function hash(texto: string): number {
    let h = 2166136261;
    for (let i = 0; i < texto.length; i++) {
        h ^= texto.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return h >>> 0;
}

/** Número em [0, 1) derivado de uma chave. */
export function aleatorio(...partes: (string | number)[]): number {
    let t = hash(partes.join('|')) + 0x6d2b79f5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function escolher<T>(lista: T[], ...partes: (string | number)[]): T {
    return lista[Math.floor(aleatorio(...partes) * lista.length)];
}

/** Simula a latência de rede da API real. */
export function atraso(ms = 250): Promise<void> {
    return new Promise((resolve) =>
        setTimeout(resolve, ms + Math.random() * 150),
    );
}
