import type { ConteudoRegistroAulaDetalhe, Regencia } from '../types';
import { gravarStorage, lerStorage } from '../lib/store';
import { aleatorio, escolher } from './random';
import { alunosDaTurma, faltasGeradas } from './alunos';
import type { AlunoFake } from './alunos';
import {
    TIPOS_INSTRUMENTO,
    TURMAS,
    aulasNoDia,
    diasLetivosEntre,
    hoje,
    somarDias,
} from './catalogo';
import type { RegenciaFake, TurmaFake } from './catalogo';
import { codigosHabilidades } from './bncc';

/**
 * "Banco" fake do portal: tudo o que o professor grava (chamadas, conteúdos,
 * habilidades, observações, mensagens lidas) fica no localStorage do
 * navegador, por cima dos dados gerados em `alunos.ts`/`catalogo.ts`.
 */

export interface ConteudoFake extends ConteudoRegistroAulaDetalhe {
    escola: string;
}

interface Db {
    versao: number;
    /** `${turma}|${data}` → aluno → códigos dos horários em que faltou. */
    frequencias: Record<string, Record<number, number[]>>;
    conteudos: ConteudoFake[];
    proximoCodigo: number;
    /** `${conteudo}|${disciplinaBncc}` → códigos das habilidades. */
    habilidades: Record<string, string[]>;
    /** `${matricula}|${regencia}|${ordem}` → texto. */
    observacoes: Record<string, string>;
    mensagensLidas: string[];
}

const CHAVE = 'portal-professor:db';
const VERSAO = 1;

let db: Db | null = null;

export function getDb(): Db {
    if (db) return db;
    const salvo = lerStorage<Db>(CHAVE);
    db = salvo && salvo.versao === VERSAO ? salvo : semear();
    if (!salvo || salvo.versao !== VERSAO) salvar();
    return db;
}

export function salvar(): void {
    if (db) gravarStorage(CHAVE, db);
}

/** Apaga tudo o que foi gravado no portal e volta aos dados iniciais. */
export function resetarDb(): void {
    db = semear();
    salvar();
}

// ---------------------------------------------------------------------------
// Horários (regências do dia, no sentido do diário de classe)
// ---------------------------------------------------------------------------

function somarMinutos(hhmm: string, minutos: number): string {
    const [h, m] = hhmm.split(':').map(Number);
    const total = h * 60 + m + minutos;
    return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

export function horariosDoDia(regencia: RegenciaFake, data: string): Regencia[] {
    const aulas = aulasNoDia(regencia, data);
    return Array.from({ length: aulas }, (_, i) => ({
        codigo: regencia.codigo * 10 + i + 1,
        descricao: `${i + 1}ª aula · ${somarMinutos(regencia.inicio, i * 50)}`,
    }));
}

export function regenciaDeFrequencia(turma: TurmaFake): RegenciaFake {
    return turma.regencias.find((r) => r.frequencia) ?? turma.regencias[0];
}

/** Chamada já lançada para a turma na data (gerada para dias passados ou gravada no portal). */
export function frequenciaLancada(turma: TurmaFake, data: string): boolean {
    return data < hoje() || `${turma.codigo}|${data}` in getDb().frequencias;
}

/** Faltas (quantidade de aulas perdidas) considerando o que o professor gravou no portal. */
export function faltasEfetivas(
    aluno: AlunoFake,
    turma: TurmaFake,
    regencia: RegenciaFake,
    data: string,
): number {
    if (regencia.frequencia) {
        const gravada = getDb().frequencias[`${turma.codigo}|${data}`];
        if (gravada) return gravada[aluno.codigo]?.length ?? 0;
    }
    return faltasGeradas(aluno, regencia, data);
}

/** Códigos dos horários em que o aluno faltou na data (para abrir a chamada já lançada). */
export function horariosComFalta(
    aluno: AlunoFake,
    turma: TurmaFake,
    data: string,
): number[] {
    const regencia = regenciaDeFrequencia(turma);
    const gravada = getDb().frequencias[`${turma.codigo}|${data}`];
    if (gravada) return gravada[aluno.codigo] ?? [];
    const faltas = faltasGeradas(aluno, regencia, data);
    return horariosDoDia(regencia, data)
        .slice(0, faltas)
        .map((h) => h.codigo);
}

// ---------------------------------------------------------------------------
// Semente dos conteúdos de aula já lançados
// ---------------------------------------------------------------------------

const TEMAS: Record<number, string[]> = {
    10: [
        'Leitura e interpretação de notícias de jornal: fato e opinião.',
        'Classes de palavras: substantivos e adjetivos em textos jornalísticos.',
        'Produção de notícia a partir de um acontecimento da escola.',
        'Revisão coletiva de textos produzidos pela turma.',
        'Concordância nominal e verbal — exercícios do livro didático.',
        'Debate regrado sobre o uso do celular na escola.',
        'Pontuação: vírgula em enumerações e vocativos.',
        'Leitura de crônica e roda de conversa sobre o tema.',
    ],
    20: [
        'Leitura compartilhada de fábula e reconto oral.',
        'Formação de palavras com sílabas móveis.',
        'Escrita espontânea de lista de compras.',
    ],
    21: [
        'Composição e decomposição de números até 999 com material dourado.',
        'Situações-problema de adição com reagrupamento.',
        'Medidas de comprimento com régua e fita métrica.',
    ],
    22: ['Plantas: o que precisam para crescer — montagem de experimento com feijão.'],
    23: ['Pintura com guache explorando cores primárias e secundárias.'],
    30: ['Roda de conversa sobre sentimentos e combinados da turma.'],
    31: ['Circuito psicomotor no pátio.'],
    32: ['Contação de história e desenho do personagem preferido.'],
};

function semear(): Db {
    const novo: Db = {
        versao: VERSAO,
        frequencias: {},
        conteudos: [],
        proximoCodigo: 7001,
        habilidades: {},
        observacoes: {},
        mensagensLidas: ['m3', 'm5'],
    };

    const dias = diasLetivosEntre(somarDias(hoje(), -30), somarDias(hoje(), -1));
    TURMAS.forEach((turma) => {
        turma.regencias.forEach((regencia) => {
            const diasComAula = dias.filter((d) => aulasNoDia(regencia, d) > 0).slice(-7);
            diasComAula.forEach((data, i) => {
                // Deixa alguns dias sem registro, como acontece na prática.
                if (aleatorio(regencia.codigo, data, 'registro') < 0.25) return;
                const disciplinaPrincipal = regencia.disciplinasBncc[0];
                const temas = TEMAS[disciplinaPrincipal.codigo] ?? ['Atividades da aula.'];
                const codigo = novo.proximoCodigo++;
                const instrumentos = TIPOS_INSTRUMENTO[turma.etapa.ensinoCodigo] ?? [];
                const comInstrumento = aleatorio(codigo, 'inst') < 0.3 && instrumentos.length > 0;
                novo.conteudos.push({
                    codigo,
                    escola: turma.escola,
                    data,
                    conteudo: temas[i % temas.length],
                    aulasDadas: turma.medidaFrequencia === 'D' ? 1 : aulasNoDia(regencia, data),
                    disciplina: regencia.disciplina,
                    turma: { codigo: turma.codigo, nome: turma.nome },
                    etapa: { codigo: turma.etapa.codigo, nome: turma.etapa.nome },
                    regencia: regencia.codigo,
                    turno: turma.turno,
                    turnoReferente: turma.turnoReferente[0],
                    tipoInstrumento: comInstrumento ? escolher(instrumentos, codigo, 'inst2') : null,
                    usuario: 1001,
                });
                regencia.disciplinasBncc.forEach((disc, j) => {
                    if (j > 0 && aleatorio(codigo, disc.codigo) < 0.5) return;
                    const codigos = codigosHabilidades(disc.codigo);
                    const qtd = 1 + Math.floor(aleatorio(codigo, disc.codigo, 'qtd') * 2);
                    const inicio = Math.floor(aleatorio(codigo, disc.codigo, 'ini') * codigos.length);
                    novo.habilidades[`${codigo}|${disc.codigo}`] = Array.from(
                        { length: qtd },
                        (_, k) => codigos[(inicio + k) % codigos.length],
                    ).filter((c, k, arr) => arr.indexOf(c) === k);
                });
            });
        });

        // Algumas observações de períodos anteriores.
        alunosDaTurma(turma)
            .filter((a) => a.chanceFalta > 0.2 || a.tendencia < 0)
            .slice(0, 3)
            .forEach((aluno) => {
                novo.observacoes[`${aluno.matricula}|${turma.regencias[0].codigo}|2`] =
                    aluno.chanceFalta > 0.2
                        ? 'Faltas frequentes no bimestre. Família contatada pela coordenação.'
                        : 'Apresentou queda no rendimento; precisa de acompanhamento nas atividades de casa.';
            });
    });

    novo.conteudos.sort((a, b) => (a.data < b.data ? 1 : a.data > b.data ? -1 : b.codigo - a.codigo));
    return novo;
}
