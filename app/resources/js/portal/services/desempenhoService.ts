import type { DesempenhoTurma } from '../types';
import { turmaPorCodigo } from '../fake/catalogo';
import { montarDesempenho } from '../fake/desempenho';
import { atraso } from '../fake/random';
import { ApiBusinessError } from './client';

// Fake do endpoint proposto `GET /desempenho/turma?escola=&turma=&etapa=`.

export async function getDesempenhoTurma(
    escola: string,
    turma: number,
    etapa: number,
): Promise<DesempenhoTurma> {
    await atraso(450);
    const t = turmaPorCodigo(turma);
    if (!t || t.escola !== escola || t.etapa.codigo !== etapa) {
        throw new ApiBusinessError('Turma não encontrada nesta escola.');
    }
    return montarDesempenho(t);
}
