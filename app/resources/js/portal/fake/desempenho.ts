import type {
    AproveitamentoPeriodo,
    ConceitoAvaliacao,
    DesempenhoTurma,
    PeriodoDesempenho,
    ProcedimentoDesempenho,
} from '../types';
import { aleatorio } from './random';
import { alunoNaTurmaEm, alunosDaTurma } from './alunos';
import type { AlunoFake } from './alunos';
import {
    PERIODOS_AVALIACAO,
    aulasNoDia,
    diasLetivosEntre,
    hoje,
    periodoCorrente,
} from './catalogo';
import type { RegenciaFake, TurmaFake } from './catalogo';
import { faltasEfetivas, frequenciaLancada } from './db';

/**
 * Monta o `DesempenhoTurma` (contrato proposto de `GET /desempenho/turma`)
 * a partir dos alunos fake: notas geradas pelo perfil de cada aluno e
 * faltas tiradas da mesma frequência que o card "Frequência" lança.
 */

export const CONCEITOS: ConceitoAvaliacao[] = [
    { codigo: 1, sigla: 'I', nome: 'Insuficiente', ordem: 1 },
    { codigo: 2, sigla: 'R', nome: 'Regular', ordem: 2 },
    { codigo: 3, sigla: 'B', nome: 'Bom', ordem: 3 },
    { codigo: 4, sigla: 'MB', nome: 'Muito bom', ordem: 4 },
];

export const MINIMO_NOTA = 6;
export const FREQUENCIA_MINIMA = 75;

export function procedimentoDa(turma: TurmaFake): ProcedimentoDesempenho {
    return {
        forma: turma.forma,
        minimo: turma.forma === 'NOTA' ? MINIMO_NOTA : null,
        minimoConceito: turma.forma === 'NIVEL' ? 'R' : null,
        menorValor: turma.forma === 'NOTA' ? 0 : null,
        maiorValor: turma.forma === 'NOTA' ? 10 : null,
        conceitos: turma.forma === 'NIVEL' ? CONCEITOS : [],
        frequenciaMinima: FREQUENCIA_MINIMA,
    };
}

type PeriodoComDatas = PeriodoDesempenho & { inicio: string; fim: string };

export function periodosDesempenho(): PeriodoComDatas[] {
    const corrente = periodoCorrente();
    return PERIODOS_AVALIACAO.map((p) => ({
        ...p,
        corrente: p.ordem === corrente.ordem,
        controlaFrequencia: true,
    }));
}

function conceitoDaNota(nota: number): ConceitoAvaliacao {
    if (nota < 5) return CONCEITOS[0];
    if (nota < 6.5) return CONCEITOS[1];
    if (nota < 8.5) return CONCEITOS[2];
    return CONCEITOS[3];
}

const arredondarMeio = (n: number) => Math.round(n * 2) / 2;
const limitar = (n: number) => Math.min(10, Math.max(0, n));

/** Frequência do aluno na regência entre duas datas, só nos dias com chamada lançada. */
export function frequenciaNoIntervalo(
    aluno: AlunoFake,
    turma: TurmaFake,
    regencia: RegenciaFake,
    inicio: string,
    fim: string,
): { aulas: number; faltas: number } {
    let aulas = 0;
    let faltas = 0;
    diasLetivosEntre(inicio, fim).forEach((data) => {
        const n = aulasNoDia(regencia, data);
        if (n === 0 || !alunoNaTurmaEm(aluno, data) || !frequenciaLancada(turma, data)) return;
        aulas += n;
        faltas += faltasEfetivas(aluno, turma, regencia, data);
    });
    return { aulas, faltas };
}

function aproveitamento(
    aluno: AlunoFake,
    turma: TurmaFake,
    regencia: RegenciaFake,
    indiceRegencia: number,
    periodo: PeriodoComDatas,
): AproveitamentoPeriodo {
    const dataHoje = hoje();
    const vazio: AproveitamentoPeriodo = {
        ordem: periodo.ordem,
        nota: null,
        conceito: null,
        conceitoOrdem: null,
        temParecer: false,
        minimoAtingido: null,
        faltas: null,
        aulas: null,
        encerrado: periodo.fim < dataHoje,
        parciais: [],
    };
    if (periodo.inicio > dataHoje) return vazio;

    const fimFreq = periodo.fim < dataHoje ? periodo.fim : dataHoje;
    const { aulas, faltas } = frequenciaNoIntervalo(aluno, turma, regencia, periodo.inicio, fimFreq);
    const base = { ...vazio, aulas, faltas };

    const participou =
        aluno.dataMatricula <= periodo.fim &&
        (!aluno.dataEncerramento || aluno.dataEncerramento >= periodo.fim);
    const lancado =
        participou &&
        (periodo.fim < dataHoje || aleatorio(aluno.codigo, regencia.codigo, periodo.ordem, 'lanc') < 0.4);
    if (!lancado) return base;

    if (turma.forma === 'PARECER') return { ...base, temParecer: true };

    const ruido = (aleatorio(aluno.codigo, regencia.codigo, periodo.ordem, 'ruido') - 0.5) * 0.8;
    const nota = arredondarMeio(
        limitar(aluno.notaBase + aluno.tendencia * (periodo.ordem - 1) + ruido + indiceRegencia * 0.8),
    );
    const parciais = [1, 2].map((ordem) => {
        const parcial = arredondarMeio(
            limitar(nota + (aleatorio(aluno.codigo, periodo.ordem, ordem, 'p') - 0.5) * 2),
        );
        const ausencia = aleatorio(aluno.codigo, periodo.ordem, ordem, 'aus') < 0.04;
        return turma.forma === 'NOTA'
            ? { ordem, nota: ausencia ? null : parcial, conceito: null, ausencia }
            : { ordem, nota: null, conceito: ausencia ? null : conceitoDaNota(parcial).sigla, ausencia };
    });

    if (turma.forma === 'NIVEL') {
        const conceito = conceitoDaNota(nota);
        return {
            ...base,
            conceito: conceito.sigla,
            conceitoOrdem: conceito.ordem,
            minimoAtingido: conceito.ordem >= 2,
            parciais,
        };
    }
    return { ...base, nota, minimoAtingido: nota >= MINIMO_NOTA, parciais };
}

export function montarDesempenho(turma: TurmaFake): DesempenhoTurma {
    const periodos = periodosDesempenho();
    return {
        turma: { codigo: turma.codigo, nome: turma.nome },
        etapa: { codigo: turma.etapa.codigo, nome: turma.etapa.nome },
        ensino: turma.ensino,
        procedimento: procedimentoDa(turma),
        periodos,
        regencias: turma.regencias.map((r) => ({ codigo: r.codigo, disciplina: r.disciplina, cor: r.cor })),
        alunos: alunosDaTurma(turma).map((aluno) => ({
            codigo: aluno.codigo,
            matricula: aluno.matricula,
            nome: aluno.nome,
            situacao: aluno.situacao,
            ativo: aluno.ativo,
            avaliadoPorParecer: false,
            disciplinas: turma.regencias.map((regencia, i) => ({
                regencia: regencia.codigo,
                periodos: periodos.map((p) => aproveitamento(aluno, turma, regencia, i, p)),
                resultadoFinal: null,
            })),
        })),
    };
}
