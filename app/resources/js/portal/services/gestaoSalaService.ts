import type {
    AlunoFrequenciaDiaria,
    DataComFalta,
    DiaComAula,
    FichaAluno,
    FrequenciaDiaria,
    FrequenciaDiariaDisciplina,
    ObservacoesTurma,
    ProjecaoDisciplina,
    ProjecaoNotas,
    SalvarObservacaoPayload,
    TurmaEtapaRef,
} from '../types';
import {
    PERIODOS_AVALIACAO,
    aulasNoDia,
    diaSemana,
    diasLetivosEntre,
    hoje,
    periodoCorrente,
    somarDias,
    turmaPorCodigo,
} from '../fake/catalogo';
import type { TurmaFake } from '../fake/catalogo';
import { alunoNaTurmaEm, alunosDaTurma } from '../fake/alunos';
import type { AlunoFake } from '../fake/alunos';
import { faltasEfetivas, frequenciaLancada, getDb, salvar } from '../fake/db';
import {
    FREQUENCIA_MINIMA,
    MINIMO_NOTA,
    montarDesempenho,
    periodosDesempenho,
} from '../fake/desempenho';
import { aleatorio, atraso } from '../fake/random';
import { ApiBusinessError } from './client';

// Fake do grupo `/gestao-sala/*` da API mobile.

function turmaValida(escola: string, turma: number, etapa: number): TurmaFake {
    const t = turmaPorCodigo(turma);
    if (!t || t.escola !== escola || t.etapa.codigo !== etapa) {
        throw new ApiBusinessError('Turma não encontrada nesta escola.');
    }
    return t;
}

function ref(t: TurmaFake): TurmaEtapaRef {
    return {
        turma: { codigo: t.codigo, nome: t.nome },
        etapa: { codigo: t.etapa.codigo, nome: t.etapa.nome },
        regencias: t.regencias.map((r) => ({ codigo: r.codigo, disciplina: r.disciplina, cor: r.cor })),
    };
}

// --------------------------------------------------------- Quem está faltando

export async function getFrequenciaDiaria(
    escola: string,
    turma: number,
    etapa: number,
): Promise<FrequenciaDiaria> {
    await atraso(450);
    const t = turmaValida(escola, turma, etapa);
    const periodo = periodosDesempenho().find((p) => p.corrente) ?? null;
    const corrente = periodoCorrente();
    const fim = hoje() < corrente.fim ? hoje() : corrente.fim;
    const intervalo = { inicio: corrente.inicio, fim };

    const dias: DiaComAula[] = diasLetivosEntre(intervalo.inicio, intervalo.fim)
        .filter((data) => frequenciaLancada(t, data))
        .map((data) => ({
            data,
            diaSemana: diaSemana(data),
            aulas: Object.fromEntries(
                t.regencias
                    .map((r) => [String(r.codigo), aulasNoDia(r, data)] as const)
                    .filter(([, n]) => n > 0),
            ),
        }))
        .filter((d) => Object.keys(d.aulas).length > 0);

    const seteDiasAtras = somarDias(intervalo.fim, -6);

    const alunos: AlunoFrequenciaDiaria[] = alunosDaTurma(t).map((aluno) => ({
        codigo: aluno.codigo,
        matricula: aluno.matricula,
        nome: aluno.nome,
        situacao: aluno.situacao,
        ativo: aluno.ativo,
        dataMatricula: aluno.dataMatricula,
        disciplinas: t.regencias.map((regencia): FrequenciaDiariaDisciplina => {
            const diasDaRegencia = dias.filter(
                (d) => (d.aulas[String(regencia.codigo)] ?? 0) > 0 && alunoNaTurmaEm(aluno, d.data),
            );
            let aulas = 0;
            let faltas = 0;
            let ultimaPresenca: string | null = null;
            let ultimaFalta: string | null = null;
            let faltasUltimos7Dias = 0;
            const faltasPorDiaSemana = [0, 0, 0, 0, 0, 0, 0];
            const datasComFalta: DataComFalta[] = [];
            const registros = diasDaRegencia.map((d) => {
                const n = d.aulas[String(regencia.codigo)];
                const f = faltasEfetivas(aluno, t, regencia, d.data);
                aulas += n;
                faltas += f;
                if (f < n) ultimaPresenca = d.data;
                if (f > 0) {
                    ultimaFalta = d.data;
                    faltasPorDiaSemana[d.diaSemana] += f;
                    if (d.data >= seteDiasAtras) faltasUltimos7Dias += f;
                    const notificada =
                        aluno.chanceFalta > 0.2 && d.data < somarDias(hoje(), -14);
                    datasComFalta.push({ data: d.data, faltas: f, aulas: n, notificadas: notificada ? f : 0 });
                }
                return { n, f };
            });
            let faltasConsecutivas = 0;
            for (let i = registros.length - 1; i >= 0; i--) {
                if (registros[i].f >= registros[i].n) faltasConsecutivas += 1;
                else break;
            }
            const ultimo = registros[registros.length - 1];
            return {
                regencia: regencia.codigo,
                aulas,
                faltas,
                faltasNotificadas: datasComFalta.reduce((s, d) => s + d.notificadas, 0),
                percentualFrequencia: aulas > 0 ? ((aulas - faltas) * 100) / aulas : null,
                faltasConsecutivas,
                faltouNaUltimaAula: !!ultimo && ultimo.f > 0,
                ultimaPresenca,
                ultimaFalta,
                faltasUltimos7Dias,
                faltasPorDiaSemana,
                datasComFalta,
            };
        }),
    }));

    const ativos = alunos.filter((a) => a.ativo);
    const principal = t.regencias[0].codigo;
    const disc = (a: AlunoFrequenciaDiaria) => a.disciplinas.find((d) => d.regencia === principal);

    return {
        ...ref(t),
        intervalo,
        periodo,
        frequenciaMinima: FREQUENCIA_MINIMA,
        dias,
        resumo: {
            alunosAtivos: ativos.length,
            ultimaAulaLancada: dias.length ? dias[dias.length - 1].data : null,
            faltaramNaUltimaAula: ativos.filter((a) => disc(a)?.faltouNaUltimaAula).length,
            comFaltasConsecutivas: ativos.filter((a) => (disc(a)?.faltasConsecutivas ?? 0) >= 3).length,
        },
        alunos,
    };
}

// ------------------------------------------------------------------- Projeção

export async function getProjecao(
    escola: string,
    turma: number,
    etapa: number,
): Promise<ProjecaoNotas> {
    await atraso(300);
    const t = turmaValida(escola, turma, etapa);
    const desempenho = montarDesempenho(t);
    const total = PERIODOS_AVALIACAO.length;
    const nota = t.forma === 'NOTA';

    return {
        ...ref(t),
        procedimento: {
            forma: t.forma,
            minimo: nota ? MINIMO_NOTA : null,
            menorValor: nota ? 0 : null,
            maiorValor: nota ? 10 : null,
            obtencao: nota ? 'ME' : null,
            obtencaoDescricao: nota ? 'Média aritmética dos períodos' : null,
            calculavel: nota,
            motivo: null,
        },
        periodos: desempenho.periodos,
        alunos: desempenho.alunos.map((aluno) => ({
            codigo: aluno.codigo,
            matricula: aluno.matricula,
            nome: aluno.nome,
            situacao: aluno.situacao,
            ativo: aluno.ativo,
            avaliadoPorParecer: aluno.avaliadoPorParecer,
            disciplinas: aluno.disciplinas.map((d): ProjecaoDisciplina => {
                const lancadas = d.periodos
                    .filter((p) => p.nota !== null)
                    .map((p) => ({
                        ordem: p.ordem,
                        nota: p.nota,
                        conceito: p.conceito,
                        amparado: false,
                        minimoAtingido: !!p.minimoAtingido,
                    }));
                const soma = lancadas.reduce((s, l) => s + (l.nota ?? 0), 0);
                const restantes = total - lancadas.length;
                const proximo = d.periodos.find((p) => p.nota === null)?.ordem ?? null;
                const parcial = lancadas.length ? soma / lancadas.length : null;
                const necessaria = restantes > 0 ? (MINIMO_NOTA * total - soma) / restantes : null;
                const situacao: ProjecaoDisciplina['situacao'] = !nota
                    ? 'indisponivel'
                    : restantes === 0
                      ? 'concluido'
                      : soma >= MINIMO_NOTA * total
                        ? 'garantido'
                        : (necessaria ?? 0) > 10
                          ? 'inalcancavel'
                          : 'atingivel';
                return {
                    regencia: d.regencia,
                    lancadas,
                    proximoPeriodo: proximo,
                    periodosRestantes: restantes,
                    resultadoParcial: parcial,
                    notaNecessaria: necessaria !== null ? Math.max(0, necessaria) : null,
                    situacao,
                    emRecuperacao: situacao === 'inalcancavel' && aleatorio(aluno.codigo, 'rec') < 0.5,
                };
            }),
        })),
    };
}

// --------------------------------------------------------------- Observações

export async function getObservacoes(
    escola: string,
    turma: number,
    etapa: number,
): Promise<ObservacoesTurma> {
    await atraso(250);
    const t = turmaValida(escola, turma, etapa);
    const periodos = periodosDesempenho();
    const obs = getDb().observacoes;
    let totalObservacoes = 0;
    const alunos = alunosDaTurma(t).map((aluno) => {
        const observacoes = t.regencias.flatMap((r) =>
            periodos
                .map((p) => ({
                    regencia: r.codigo,
                    ordem: p.ordem,
                    periodo: p.abreviado,
                    texto: obs[`${aluno.matricula}|${r.codigo}|${p.ordem}`] ?? '',
                }))
                .filter((o) => o.texto),
        );
        totalObservacoes += observacoes.length;
        return {
            codigo: aluno.codigo,
            matricula: aluno.matricula,
            nome: aluno.nome,
            situacao: aluno.situacao,
            ativo: aluno.ativo,
            observacoes,
        };
    });
    return { ...ref(t), periodos, totalObservacoes, alunos };
}

export async function salvarObservacao(
    _escola: string,
    payload: SalvarObservacaoPayload,
): Promise<{ status: string; message: string; texto: string }> {
    await atraso(400);
    const db = getDb();
    const chave = `${payload.matricula}|${payload.regencia}|${payload.ordem}`;
    if (payload.observacao) db.observacoes[chave] = payload.observacao;
    else delete db.observacoes[chave];
    salvar();
    return {
        status: 'ok',
        message: payload.observacao ? 'Observação gravada.' : 'Observação removida.',
        texto: payload.observacao,
    };
}

// ----------------------------------------------------------------- Ficha

function idade(nascimento: string): number {
    const [y, m, d] = nascimento.split('-').map(Number);
    const agora = new Date();
    let anos = agora.getFullYear() - y;
    if (agora.getMonth() + 1 < m || (agora.getMonth() + 1 === m && agora.getDate() < d)) anos -= 1;
    return anos;
}

function notificacoes(t: TurmaFake, aluno: AlunoFake): { data: string; faltas: number }[] {
    if (aluno.chanceFalta < 0.2) return [];
    const regencia = t.regencias[0];
    return diasLetivosEntre(PERIODOS_AVALIACAO[0].inicio, somarDias(hoje(), -14))
        .filter((d) => faltasEfetivas(aluno, t, regencia, d) > 0)
        .filter((_, i) => i % 4 === 3)
        .slice(-4)
        .map((data) => ({ data, faltas: 4 }));
}

export async function getFichaAluno(
    escola: string,
    turma: number,
    etapa: number,
    codigoAluno: number,
): Promise<FichaAluno> {
    await atraso(350);
    const t = turmaValida(escola, turma, etapa);
    const aluno = alunosDaTurma(t).find((a) => a.codigo === codigoAluno);
    if (!aluno) throw new ApiBusinessError('Aluno não encontrado nesta turma.');
    const temAee = aluno.necessidades.length > 0;
    return {
        ...ref(t),
        aluno: {
            codigo: aluno.codigo,
            nome: aluno.nome,
            nomeSocial: aluno.nomeSocial,
            dataNascimento: aluno.dataNascimento,
            idade: idade(aluno.dataNascimento),
            sexo: aluno.sexo,
            telefone: null,
            celular: null,
            email: null,
        },
        filiacao: { mae: aluno.mae, pai: aluno.pai },
        responsavel: {
            nome: aluno.responsavel,
            celular: aluno.celular,
            email: aluno.email,
            cadastroCidadao: null,
        },
        matricula: {
            codigo: aluno.matricula,
            situacao: aluno.situacao,
            ativo: aluno.ativo,
            dataMatricula: aluno.dataMatricula,
            dataEncerramento: aluno.dataEncerramento,
            avaliadoPorParecer: t.forma === 'PARECER',
            observacao: aluno.dataEncerramento
                ? 'Transferência solicitada pela família (mudança de município).'
                : null,
        },
        necessidadesEspeciais: aluno.necessidades.map((descricao, i) => ({ codigo: i + 1, descricao })),
        atendimentoEspecializado: temAee
            ? [
                  {
                      codigo: 1,
                      atendimentos: 'Sala de recursos multifuncionais — 2x por semana',
                      dataEmissao: '2026-03-10',
                      parecer:
                          'Aluno acompanhado pela equipe de AEE. Recomenda-se atividades com apoio visual e tempo estendido nas avaliações.',
                  },
              ]
            : [],
        notificacoesFalta: notificacoes(t, aluno),
    };
}
