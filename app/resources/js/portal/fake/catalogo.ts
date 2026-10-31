import type {
    DisciplinaBncc,
    Escola,
    FormaAvaliacaoTipo,
    Professor,
    TipoInstrumentoAvaliativo,
    TurnoReferenciaOption,
} from '../types';
import { toApiDateString } from '../lib/dateUtils';

/**
 * Cadastro fixo dos dados fake: professor, escolas, turmas, regências e
 * calendário letivo. Substitui as respostas de `/auth/*`,
 * `/diario-classe/*` e `/registro-aula/get-dados-regente` até a integração
 * com a API real.
 */

export const PROFESSOR_FAKE: Professor = {
    usuario: 1001,
    nome: 'Maria Aparecida Souza Lima',
    login: '12345678900',
    cgm: 50231,
    email: 'maria.lima@escola.portovelho.ro.gov.br',
};

export const ESCOLAS: Escola[] = [
    { codigo: '101', nome: 'EMEF PROFESSORA ANA NÉRI' },
    { codigo: '102', nome: 'EMEIEF PEQUENO PRÍNCIPE' },
];

/** Disciplina usada no lançamento de frequência (o professor tem uma por escola). */
export const DISCIPLINA_FREQUENCIA: Record<
    string,
    { codigo: string; nome: string }
> = {
    '101': { codigo: '5', nome: 'LÍNGUA PORTUGUESA' },
    '102': { codigo: '1', nome: 'REGÊNCIA DE CLASSE' },
};

export const TURNOS = {
    manha: { codigo: 1, nome: 'MANHÃ' },
    tarde: { codigo: 2, nome: 'TARDE' },
    integral: { codigo: 3, nome: 'INTEGRAL' },
};

const REF_MANHA: TurnoReferenciaOption = { value: 1, name: 'MANHÃ' };
const REF_TARDE: TurnoReferenciaOption = { value: 2, name: 'TARDE' };

// Disciplinas BNCC (códigos fictícios) ---------------------------------------
export const BNCC = {
    lpFinais: {
        codigo: 10,
        nome: 'Língua Portuguesa',
        sigla: 'LP',
        areaConhecimento: 'Linguagens',
        ensino: 'Ensino Fundamental - Anos Finais',
    },
    lpIniciais: {
        codigo: 20,
        nome: 'Língua Portuguesa',
        sigla: 'LP',
        areaConhecimento: 'Linguagens',
        ensino: 'Ensino Fundamental - Anos Iniciais',
    },
    matIniciais: {
        codigo: 21,
        nome: 'Matemática',
        sigla: 'MA',
        areaConhecimento: 'Matemática',
        ensino: 'Ensino Fundamental - Anos Iniciais',
    },
    cieIniciais: {
        codigo: 22,
        nome: 'Ciências',
        sigla: 'CI',
        areaConhecimento: 'Ciências da Natureza',
        ensino: 'Ensino Fundamental - Anos Iniciais',
    },
    arteIniciais: {
        codigo: 23,
        nome: 'Arte',
        sigla: 'AR',
        areaConhecimento: 'Linguagens',
        ensino: 'Ensino Fundamental - Anos Iniciais',
    },
    eiEuOutro: {
        codigo: 30,
        nome: 'O eu, o outro e o nós',
        sigla: 'EO',
        ensino: 'Educação Infantil',
    },
    eiCorpo: {
        codigo: 31,
        nome: 'Corpo, gestos e movimentos',
        sigla: 'CG',
        ensino: 'Educação Infantil',
    },
    eiEscuta: {
        codigo: 32,
        nome: 'Escuta, fala, pensamento e imaginação',
        sigla: 'EF',
        ensino: 'Educação Infantil',
    },
} satisfies Record<string, DisciplinaBncc>;

// Turmas ---------------------------------------------------------------------

export interface RegenciaFake {
    codigo: number;
    disciplina: string;
    disciplinaCodigo: number;
    cor: string;
    disciplinasBncc: DisciplinaBncc[];
    polivalente: boolean;
    /** Quantidade de aulas por dia da semana (0 = domingo … 6 = sábado). */
    horario: Partial<Record<number, number>>;
    /** Horário (hh:mm) da primeira aula do dia. */
    inicio: string;
    /** É a regência lançada pelo card "Frequência" (disciplina da escola). */
    frequencia: boolean;
}

export interface TurmaFake {
    escola: string;
    codigo: number;
    nome: string;
    turno: { codigo: number; nome: string };
    turnoReferente: TurnoReferenciaOption[];
    /** 'D' = frequência por dia letivo (aulas dadas travado em 1); 'H' = por hora-aula. */
    medidaFrequencia: 'D' | 'H';
    etapa: { codigo: number; nome: string; ensinoCodigo: number };
    ensino: { codigo: number; tipo: number; infantil: boolean };
    forma: FormaAvaliacaoTipo;
    regencias: RegenciaFake[];
}

const cor = (r: number, g: number, b: number) =>
    `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`;

const COR_LP = cor(46, 92, 126);
const COR_REGENCIA = cor(31, 122, 140);
const COR_ARTE = cor(184, 64, 94);
const COR_INFANTIL = cor(125, 78, 152);

const ETAPA_6 = { codigo: 16, nome: '6º ANO', ensinoCodigo: 3 };
const ETAPA_7 = { codigo: 17, nome: '7º ANO', ensinoCodigo: 3 };
const ETAPA_2 = { codigo: 12, nome: '2º ANO', ensinoCodigo: 2 };
const ETAPA_PRE = { codigo: 5, nome: 'PRÉ II', ensinoCodigo: 1 };

const FUNDAMENTAL = { codigo: 2, tipo: 2, infantil: false };
const FUNDAMENTAL_FINAIS = { codigo: 3, tipo: 2, infantil: false };
const INFANTIL = { codigo: 1, tipo: 1, infantil: true };

function regenciaLp(codigo: number, horario: RegenciaFake['horario'], inicio: string): RegenciaFake {
    return {
        codigo,
        disciplina: 'Língua Portuguesa',
        disciplinaCodigo: 5,
        cor: COR_LP,
        disciplinasBncc: [{ ...BNCC.lpFinais, cor: COR_LP }],
        polivalente: false,
        horario,
        inicio,
        frequencia: true,
    };
}

export const TURMAS: TurmaFake[] = [
    {
        escola: '101',
        codigo: 201,
        nome: '6º ANO A',
        turno: TURNOS.manha,
        turnoReferente: [REF_MANHA],
        medidaFrequencia: 'H',
        etapa: ETAPA_6,
        ensino: FUNDAMENTAL_FINAIS,
        forma: 'NOTA',
        regencias: [regenciaLp(5201, { 1: 2, 3: 2, 5: 1 }, '07:30')],
    },
    {
        escola: '101',
        codigo: 202,
        nome: '6º ANO B',
        turno: TURNOS.tarde,
        turnoReferente: [REF_TARDE],
        medidaFrequencia: 'H',
        etapa: ETAPA_6,
        ensino: FUNDAMENTAL_FINAIS,
        forma: 'NOTA',
        regencias: [regenciaLp(5202, { 2: 2, 4: 2, 5: 1 }, '13:30')],
    },
    {
        escola: '101',
        codigo: 203,
        nome: '7º ANO A',
        turno: TURNOS.manha,
        turnoReferente: [REF_MANHA],
        medidaFrequencia: 'H',
        etapa: ETAPA_7,
        ensino: FUNDAMENTAL_FINAIS,
        forma: 'NOTA',
        regencias: [regenciaLp(5203, { 1: 1, 4: 2 }, '09:40')],
    },
    {
        escola: '102',
        codigo: 301,
        nome: '2º ANO A',
        turno: TURNOS.integral,
        turnoReferente: [REF_MANHA, REF_TARDE],
        medidaFrequencia: 'D',
        etapa: ETAPA_2,
        ensino: FUNDAMENTAL,
        forma: 'NIVEL',
        regencias: [
            {
                codigo: 6301,
                disciplina: 'Regência de classe',
                disciplinaCodigo: 1,
                cor: COR_REGENCIA,
                disciplinasBncc: [
                    { ...BNCC.lpIniciais, cor: COR_REGENCIA },
                    { ...BNCC.matIniciais, cor: COR_REGENCIA },
                    { ...BNCC.cieIniciais, cor: COR_REGENCIA },
                ],
                polivalente: true,
                horario: { 1: 1, 2: 1, 3: 1, 4: 1, 5: 1 },
                inicio: '07:30',
                frequencia: true,
            },
            {
                codigo: 6302,
                disciplina: 'Arte',
                disciplinaCodigo: 8,
                cor: COR_ARTE,
                disciplinasBncc: [{ ...BNCC.arteIniciais, cor: COR_ARTE }],
                polivalente: false,
                horario: { 3: 1 },
                inicio: '14:00',
                frequencia: false,
            },
        ],
    },
    {
        escola: '102',
        codigo: 302,
        nome: 'PRÉ-ESCOLA II B',
        turno: TURNOS.tarde,
        turnoReferente: [REF_TARDE],
        medidaFrequencia: 'D',
        etapa: ETAPA_PRE,
        ensino: INFANTIL,
        forma: 'PARECER',
        regencias: [
            {
                codigo: 6303,
                disciplina: 'Campos de experiência',
                disciplinaCodigo: 1,
                cor: COR_INFANTIL,
                disciplinasBncc: [
                    { ...BNCC.eiEuOutro, cor: COR_INFANTIL },
                    { ...BNCC.eiCorpo, cor: COR_INFANTIL },
                    { ...BNCC.eiEscuta, cor: COR_INFANTIL },
                ],
                polivalente: true,
                horario: { 1: 1, 2: 1, 3: 1, 4: 1, 5: 1 },
                inicio: '13:00',
                frequencia: true,
            },
        ],
    },
];

export function turmaPorCodigo(codigo: number | string): TurmaFake | undefined {
    return TURMAS.find((t) => String(t.codigo) === String(codigo));
}

export function turmasDaEscola(escola: string): TurmaFake[] {
    return TURMAS.filter((t) => t.escola === escola);
}

export function regenciaPorCodigo(
    codigo: number,
): { turma: TurmaFake; regencia: RegenciaFake } | undefined {
    for (const turma of TURMAS) {
        const regencia = turma.regencias.find((r) => r.codigo === codigo);
        if (regencia) return { turma, regencia };
    }
    return undefined;
}

export const TIPOS_INSTRUMENTO: Record<number, TipoInstrumentoAvaliativo[]> = {
    1: [
        { codigo: 11, nome: 'Observação' },
        { codigo: 12, nome: 'Portfólio' },
    ],
    2: [
        { codigo: 21, nome: 'Avaliação escrita' },
        { codigo: 22, nome: 'Atividade em sala' },
        { codigo: 23, nome: 'Trabalho em grupo' },
    ],
    3: [
        { codigo: 31, nome: 'Prova' },
        { codigo: 32, nome: 'Trabalho' },
        { codigo: 33, nome: 'Seminário' },
        { codigo: 34, nome: 'Atividade em sala' },
    ],
};

// Calendário letivo ----------------------------------------------------------

export const ANO_LETIVO = { inicio: '2026-02-02', fim: '2026-12-18' };

const FERIADOS = new Set([
    '2026-02-16',
    '2026-02-17',
    '2026-04-03',
    '2026-04-21',
    '2026-05-01',
    '2026-06-04',
    '2026-09-07',
    '2026-10-12',
    '2026-11-02',
    '2026-11-20',
]);

const RECESSO = { inicio: '2026-07-13', fim: '2026-07-24' };

export const PERIODOS_AVALIACAO = [
    { ordem: 1, codigo: 1, descricao: '1º BIMESTRE', abreviado: '1º BIM', inicio: '2026-02-02', fim: '2026-04-30' },
    { ordem: 2, codigo: 2, descricao: '2º BIMESTRE', abreviado: '2º BIM', inicio: '2026-05-04', fim: '2026-07-10' },
    { ordem: 3, codigo: 3, descricao: '3º BIMESTRE', abreviado: '3º BIM', inicio: '2026-07-27', fim: '2026-10-02' },
    { ordem: 4, codigo: 4, descricao: '4º BIMESTRE', abreviado: '4º BIM', inicio: '2026-10-05', fim: '2026-12-18' },
];

export function hoje(): string {
    return toApiDateString(new Date());
}

export function diaSemana(data: string): number {
    const [y, m, d] = data.split('-').map(Number);
    return new Date(y, m - 1, d).getDay();
}

export function somarDias(data: string, dias: number): string {
    const [y, m, d] = data.split('-').map(Number);
    return toApiDateString(new Date(y, m - 1, d + dias));
}

export function ehDiaLetivo(data: string): boolean {
    if (data < ANO_LETIVO.inicio || data > ANO_LETIVO.fim) return false;
    const dow = diaSemana(data);
    if (dow === 0 || dow === 6) return false;
    if (FERIADOS.has(data)) return false;
    if (data >= RECESSO.inicio && data <= RECESSO.fim) return false;
    return true;
}

const cacheDias = new Map<string, string[]>();

/** Dias letivos de `inicio` até `fim` (inclusive). */
export function diasLetivosEntre(inicio: string, fim: string): string[] {
    const chave = `${inicio}|${fim}`;
    const salvo = cacheDias.get(chave);
    if (salvo) return salvo;
    const dias: string[] = [];
    for (let d = inicio; d <= fim; d = somarDias(d, 1)) {
        if (ehDiaLetivo(d)) dias.push(d);
    }
    cacheDias.set(chave, dias);
    return dias;
}

export function aulasNoDia(regencia: RegenciaFake, data: string): number {
    if (!ehDiaLetivo(data)) return 0;
    return regencia.horario[diaSemana(data)] ?? 0;
}

export function periodoCorrente(data = hoje()) {
    return (
        PERIODOS_AVALIACAO.find((p) => data >= p.inicio && data <= p.fim) ??
        PERIODOS_AVALIACAO.find((p) => data < p.inicio) ??
        PERIODOS_AVALIACAO[PERIODOS_AVALIACAO.length - 1]
    );
}
