import type {
    AlunosTurmaResponse,
    DiaLetivo,
    Disciplina,
    SalvarDiarioPayload,
    SalvarDiarioResponse,
    SincronizarAcessoResponse,
    Turma,
} from '../types';
import {
    DISCIPLINA_FREQUENCIA,
    ANO_LETIVO,
    aulasNoDia,
    diasLetivosEntre,
    hoje,
    turmaPorCodigo,
    turmasDaEscola,
} from '../fake/catalogo';
import { alunosDaTurma, alunoNaTurmaEm } from '../fake/alunos';
import {
    getDb,
    horariosComFalta,
    horariosDoDia,
    regenciaDeFrequencia,
    salvar as salvarDb,
} from '../fake/db';
import { aleatorio, atraso } from '../fake/random';
import { ApiBusinessError } from './client';

// Fake do grupo `/diario-classe/*` da API mobile.

export async function disciplinas(escola: string): Promise<Disciplina[]> {
    await atraso();
    const disciplina = DISCIPLINA_FREQUENCIA[escola];
    return disciplina ? [disciplina] : [];
}

function turmasComAula(escola: string, data: string): Turma[] {
    return turmasDaEscola(escola)
        .filter((t) => aulasNoDia(regenciaDeFrequencia(t), data) > 0)
        .map((t) => ({ codigo: String(t.codigo), nome: t.nome }));
}

/** Como na API real, só devolve dias até hoje — dias futuros ficam travados no calendário. */
export async function diasLetivos(
    escola: string,
    disciplina: string,
): Promise<DiaLetivo[]> {
    await atraso();
    if (DISCIPLINA_FREQUENCIA[escola]?.codigo !== disciplina) return [];
    const fim = hoje() < ANO_LETIVO.fim ? hoje() : ANO_LETIVO.fim;
    return diasLetivosEntre(ANO_LETIVO.inicio, fim)
        .map((data) => ({ data, habilitado: true, turmas: turmasComAula(escola, data) }))
        .filter((dia) => dia.turmas.length > 0);
}

export async function turmasNoDia(escola: string, data: string): Promise<Turma[]> {
    await atraso(150);
    return turmasComAula(escola, data);
}

export async function alunosTurma(
    escola: string,
    data: string,
    _disciplina: string,
    turmaCodigo: string,
): Promise<AlunosTurmaResponse> {
    await atraso(400);
    const turma = turmaPorCodigo(turmaCodigo);
    if (!turma || turma.escola !== escola) {
        throw new ApiBusinessError('Turma não encontrada nesta escola.');
    }
    const regencia = regenciaDeFrequencia(turma);
    const regencias = horariosDoDia(regencia, data);
    const alunos = alunosDaTurma(turma)
        .filter((a) => a.dataMatricula <= data)
        .map((a) => ({
            codigo: a.codigo,
            nome: a.nome,
            situacao: a.situacao,
            bloqueioFalta: !alunoNaTurmaEm(a, data) || a.bloqueioFalta,
            faltasLancadas: horariosComFalta(a, turma, data),
        }));
    return { alunos, regencias };
}

export async function salvar(
    escola: string,
    payload: SalvarDiarioPayload,
    turmaCodigo?: string,
): Promise<SalvarDiarioResponse> {
    await atraso(600);
    // A API real descobre a turma pelas regências; aqui, pelo código do horário.
    const turma =
        (turmaCodigo && turmaPorCodigo(turmaCodigo)) ||
        turmasDaEscola(escola).find((t) =>
            payload.regencias.some(
                (r) => Math.floor(r / 10) === regenciaDeFrequencia(t).codigo,
            ),
        );
    if (!turma) throw new ApiBusinessError('Não foi possível identificar a turma do lançamento.');
    if (payload.data > hoje()) {
        throw new ApiBusinessError('Não é permitido lançar frequência em data futura.');
    }
    const db = getDb();
    db.frequencias[`${turma.codigo}|${payload.data}`] = Object.fromEntries(
        payload.alunos.map((a) => [a.codigo, a.faltas]),
    );
    salvarDb();
    return { sucesso: true, mensagem: 'Frequência salva com sucesso.' };
}

/** Simula a leitura da catraca: a lista recarregada volta igual (não há catraca no fake). */
export async function sincronizarAcesso(escola: string): Promise<SincronizarAcessoResponse> {
    await atraso(800);
    const sincronizados = Math.floor(aleatorio(escola, Date.now()) * 4);
    return {
        sincronizados,
        mensagem:
            sincronizados > 0
                ? `${sincronizados} leitura(s) da catraca sincronizada(s).`
                : 'Nenhuma leitura nova da catraca.',
    };
}
