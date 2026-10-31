import { aleatorio, escolher } from './random';
import {
    ANO_LETIVO,
    aulasNoDia,
    diasLetivosEntre,
    hoje,
    somarDias,
} from './catalogo';
import type { RegenciaFake, TurmaFake } from './catalogo';

/** Aluno fake de uma turma, com o "perfil" que guia faltas e notas geradas. */
export interface AlunoFake {
    codigo: number;
    matricula: number;
    nome: string;
    nomeSocial: string | null;
    sexo: 'M' | 'F';
    dataNascimento: string;
    situacao: string;
    ativo: boolean;
    bloqueioFalta: boolean;
    dataMatricula: string;
    dataEncerramento: string | null;
    /** Probabilidade de faltar num dia de aula. */
    chanceFalta: number;
    /** Faltou os últimos dias seguidos (para aparecer em "Quem está faltando"). */
    sequenciaRecente: number;
    /** Nota-base (0–10) e tendência por período. */
    notaBase: number;
    tendencia: number;
    mae: string;
    pai: string | null;
    responsavel: string;
    celular: string;
    email: string | null;
    necessidades: string[];
}

const NOMES_F = [
    'Ana', 'Beatriz', 'Camila', 'Débora', 'Eduarda', 'Fernanda', 'Gabriela',
    'Helena', 'Isabela', 'Júlia', 'Larissa', 'Manuela', 'Natália', 'Olívia',
    'Paula', 'Rafaela', 'Sofia', 'Valentina', 'Yasmin', 'Lívia', 'Alice',
    'Cecília', 'Lorena', 'Maria Clara', 'Ana Luiza',
];
const NOMES_M = [
    'Arthur', 'Bernardo', 'Caio', 'Davi', 'Enzo', 'Felipe', 'Gabriel',
    'Heitor', 'Igor', 'João Pedro', 'Kauã', 'Lucas', 'Miguel', 'Nicolas',
    'Otávio', 'Pedro', 'Rafael', 'Samuel', 'Thiago', 'Vinícius', 'Benício',
    'Lorenzo', 'Matheus', 'Guilherme', 'Pietro',
];
const SOBRENOMES = [
    'Silva', 'Santos', 'Oliveira', 'Souza', 'Rodrigues', 'Ferreira', 'Alves',
    'Pereira', 'Lima', 'Gomes', 'Costa', 'Ribeiro', 'Martins', 'Carvalho',
    'Araújo', 'Melo', 'Barbosa', 'Cardoso', 'Rocha', 'Nascimento', 'Moreira',
    'Cavalcante', 'Monteiro', 'Teixeira', 'Batista',
];
const NECESSIDADES = [
    'Transtorno do Espectro Autista (TEA)',
    'Deficiência auditiva leve',
    'Transtorno de Déficit de Atenção e Hiperatividade (TDAH)',
    'Baixa visão',
];

const TOTAL_POR_TURMA: Record<number, number> = {
    201: 28,
    202: 26,
    203: 24,
    301: 22,
    302: 18,
};

const cache = new Map<number, AlunoFake[]>();

function idadePorEtapa(turma: TurmaFake): number {
    if (turma.ensino.infantil) return 5;
    if (turma.etapa.codigo === 12) return 7;
    return turma.etapa.codigo === 16 ? 11 : 12;
}

function telefone(...chave: (string | number)[]): string {
    const n = Math.floor(aleatorio(...chave) * 90000000) + 10000000;
    const s = String(n);
    return `(69) 9${s.slice(0, 4)}-${s.slice(4)}`;
}

function removerAcentos(t: string): string {
    return t.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

export function alunosDaTurma(turma: TurmaFake): AlunoFake[] {
    const salvo = cache.get(turma.codigo);
    if (salvo) return salvo;

    const total = TOTAL_POR_TURMA[turma.codigo] ?? 24;
    const usados = new Set<string>();
    const lista: AlunoFake[] = [];

    for (let i = 0; i < total; i++) {
        const sexo: 'M' | 'F' = aleatorio(turma.codigo, i, 'sexo') < 0.5 ? 'F' : 'M';
        let nome = '';
        for (let tentativa = 0; tentativa < 10; tentativa++) {
            const primeiro = escolher(sexo === 'F' ? NOMES_F : NOMES_M, turma.codigo, i, 'n', tentativa);
            const s1 = escolher(SOBRENOMES, turma.codigo, i, 's1', tentativa);
            const s2 = escolher(SOBRENOMES, turma.codigo, i, 's2', tentativa);
            nome = `${primeiro} ${s1 === s2 ? '' : `${s1} `}${s2}`.toUpperCase();
            if (!usados.has(nome)) break;
        }
        usados.add(nome);

        const codigo = turma.codigo * 1000 + i + 1;
        const ultimoNome = nome.split(' ').slice(-1)[0];
        const transferido = i === total - 1;
        const novato = i === total - 2;
        const perfil = aleatorio(codigo, 'perfil');
        const idade = idadePorEtapa(turma);
        const mes = String(Math.floor(aleatorio(codigo, 'mes') * 12) + 1).padStart(2, '0');
        const dia = String(Math.floor(aleatorio(codigo, 'dia') * 28) + 1).padStart(2, '0');
        const mae = `${escolher(NOMES_F, codigo, 'mae')} ${escolher(SOBRENOMES, codigo, 'mae2')} ${ultimoNome}`.toUpperCase();
        const temPai = aleatorio(codigo, 'pai') > 0.25;
        const pai = temPai
            ? `${escolher(NOMES_M, codigo, 'pai1')} ${ultimoNome}`.toUpperCase()
            : null;
        const responsavelEhMae = aleatorio(codigo, 'resp') < 0.75 || !pai;
        const responsavel = responsavelEhMae ? mae : (pai ?? mae);

        lista.push({
            codigo,
            matricula: 900000 + codigo,
            nome,
            nomeSocial: null,
            sexo,
            dataNascimento: `${2026 - idade - 1}-${mes}-${dia}`,
            situacao: transferido ? 'TRANSFERIDO FORA' : 'MATRICULADO',
            ativo: !transferido,
            bloqueioFalta: transferido,
            dataMatricula: novato ? '2026-08-24' : ANO_LETIVO.inicio,
            dataEncerramento: transferido ? '2026-08-14' : null,
            chanceFalta: perfil < 0.14 ? 0.24 : perfil < 0.3 ? 0.09 : 0.03,
            sequenciaRecente: i === 3 ? 4 : i === 9 ? 3 : 0,
            notaBase: 3.6 + aleatorio(codigo, 'nota') * 6.2,
            tendencia:
                aleatorio(codigo, 'tend') < 0.16
                    ? -1.1
                    : aleatorio(codigo, 'tend2') < 0.2
                      ? 0.6
                      : 0,
            mae,
            pai,
            responsavel,
            celular: telefone(codigo, 'cel'),
            email:
                aleatorio(codigo, 'mail') < 0.6
                    ? `${removerAcentos(responsavel.split(' ')[0]).toLowerCase()}.${removerAcentos(ultimoNome).toLowerCase()}@email.com`
                    : null,
            necessidades:
                aleatorio(codigo, 'nee') < 0.08
                    ? [escolher(NECESSIDADES, codigo, 'nee2')]
                    : [],
        });
    }

    lista.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    cache.set(turma.codigo, lista);
    return lista;
}

/** Datas em que o aluno estava na turma. */
export function alunoNaTurmaEm(aluno: AlunoFake, data: string): boolean {
    if (data < aluno.dataMatricula) return false;
    if (aluno.dataEncerramento && data > aluno.dataEncerramento) return false;
    return true;
}

/**
 * Faltas geradas (antes de qualquer lançamento do professor no portal) de
 * um aluno numa regência e data: quantas das aulas do dia ele perdeu. O dia
 * de hoje começa sem chamada lançada.
 */
export function faltasGeradas(
    aluno: AlunoFake,
    regencia: RegenciaFake,
    data: string,
): number {
    const aulas = aulasNoDia(regencia, data);
    if (aulas === 0 || data >= hoje() || !alunoNaTurmaEm(aluno, data)) return 0;
    if (aluno.sequenciaRecente > 0) {
        const recentes = diasLetivosEntre(somarDias(hoje(), -21), somarDias(hoje(), -1))
            .filter((d) => aulasNoDia(regencia, d) > 0)
            .slice(-aluno.sequenciaRecente);
        if (recentes.includes(data)) return aulas;
    }
    if (aleatorio(aluno.codigo, regencia.codigo, data) >= aluno.chanceFalta) return 0;
    if (aulas > 1 && aleatorio(aluno.codigo, regencia.codigo, data, 'parcial') < 0.25) return 1;
    return aulas;
}
