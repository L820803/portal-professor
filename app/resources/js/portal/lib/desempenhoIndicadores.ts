import {
  AlunoDesempenho,
  AproveitamentoPeriodo,
  DesempenhoTurma,
  DisciplinaAlunoDesempenho,
  PeriodoDesempenho,
  ProcedimentoDesempenho,
} from '../types';

/**
 * Cálculos dos três cards de desempenho (evolução, relatório, risco) a partir
 * do `DesempenhoTurma` devolvido pela API. Funções puras, sem React, para
 * poderem ser testadas e reaproveitadas pelas telas.
 *
 * Regra geral: NÃO reimplementar a regra de aprovação do e-cidade. "Acima" e
 * "abaixo do mínimo" vêm da flag `minimoAtingido` (`ed72_c_aprovmin`), que o
 * próprio e-cidade grava considerando arredondamento, proporcionalidade,
 * conversão e conselho. Aqui só se derivam tendência, frequência e totais.
 */

/** Queda mínima entre dois períodos (forma NOTA) para contar como "nota em queda". */
export const QUEDA_MINIMA_NOTA = 0.5;

export type Tendencia = 'subiu' | 'caiu' | 'estavel' | 'insuficiente';

export type ClassificacaoPeriodo = 'acima' | 'abaixo' | 'sem';

export interface PontoSerie {
  ordem: number;
  /** Valor comparável: a nota (NOTA) ou a posição do conceito na escala (NIVEL). */
  valor: number;
  rotulo: string;
  minimoAtingido: boolean | null;
}

/** Valor numérico comparável de um período, ou null sem lançamento. */
export function valorComparavel(ap: AproveitamentoPeriodo, procedimento: ProcedimentoDesempenho): number | null {
  if (procedimento.forma === 'NOTA') return ap.nota;
  if (procedimento.forma === 'NIVEL') {
    if (ap.conceitoOrdem !== null) return ap.conceitoOrdem;
    const conceito = procedimento.conceitos.find((c) => c.sigla === ap.conceito);
    return conceito ? conceito.ordem : null;
  }
  return null;
}

/** Texto exibido na célula do período: "7,5", "B", "✓" (parecer) ou "—". */
export function rotuloValor(ap: AproveitamentoPeriodo | null, procedimento: ProcedimentoDesempenho): string {
  if (!ap) return '—';
  if (procedimento.forma === 'NOTA') return ap.nota === null ? '—' : formatarNota(ap.nota);
  if (procedimento.forma === 'NIVEL') return ap.conceito ?? '—';
  return ap.temParecer ? '✓' : '—';
}

export function formatarNota(nota: number): string {
  return nota.toFixed(1).replace('.', ',');
}

export function formatarPercentual(pct: number): string {
  return `${Math.round(pct)}%`;
}

/** Série de períodos lançados de uma disciplina, em ordem — só onde há valor comparável. */
export function serieDisciplina(disc: DisciplinaAlunoDesempenho, procedimento: ProcedimentoDesempenho): PontoSerie[] {
  return disc.periodos
    .map((ap) => {
      const valor = valorComparavel(ap, procedimento);
      return valor === null
        ? null
        : { ordem: ap.ordem, valor, rotulo: rotuloValor(ap, procedimento), minimoAtingido: ap.minimoAtingido };
    })
    .filter((p): p is PontoSerie => p !== null)
    .sort((a, b) => a.ordem - b.ordem);
}

export interface TendenciaResultado {
  tendencia: Tendencia;
  /** Diferença entre o último e o penúltimo período lançados (na unidade do valor comparável). */
  delta: number | null;
}

/** Compara os dois últimos períodos lançados. Na forma NOTA a queda só conta a partir de `QUEDA_MINIMA_NOTA`. */
export function tendenciaSerie(serie: PontoSerie[], procedimento: ProcedimentoDesempenho): TendenciaResultado {
  if (serie.length < 2) return { tendencia: 'insuficiente', delta: null };
  const ultimo = serie[serie.length - 1];
  const penultimo = serie[serie.length - 2];
  const delta = ultimo.valor - penultimo.valor;
  const limiar = procedimento.forma === 'NOTA' ? QUEDA_MINIMA_NOTA : 1;
  if (delta <= -limiar) return { tendencia: 'caiu', delta };
  if (delta >= limiar) return { tendencia: 'subiu', delta };
  return { tendencia: 'estavel', delta };
}

export function classificarPeriodo(ap: AproveitamentoPeriodo | undefined, procedimento: ProcedimentoDesempenho): ClassificacaoPeriodo {
  if (!ap) return 'sem';
  if (procedimento.forma === 'PARECER') return ap.temParecer ? 'acima' : 'sem';
  if (valorComparavel(ap, procedimento) === null) return 'sem';
  if (ap.minimoAtingido === null) return 'sem';
  return ap.minimoAtingido ? 'acima' : 'abaixo';
}

export function aproveitamentoDoPeriodo(disc: DisciplinaAlunoDesempenho | undefined, ordem: number): AproveitamentoPeriodo | undefined {
  return disc?.periodos.find((p) => p.ordem === ordem);
}

export function disciplinaDoAluno(aluno: AlunoDesempenho, regencia: number): DisciplinaAlunoDesempenho | undefined {
  return aluno.disciplinas.find((d) => d.regencia === regencia);
}

export interface FrequenciaCalculada {
  faltas: number;
  aulas: number;
  /** 0–100, ou null quando nenhuma aula com frequência lançada. */
  percentual: number | null;
}

/**
 * Frequência acumulada da disciplina até agora, pelos períodos que já têm
 * aulas lançadas (mesma fórmula de `DiarioDisciplina::calculoDeFrequenciaIndividual`,
 * sem descontar abonos — o endpoint não os traz). Quando o e-cidade já fechou
 * `ed74_i_percfreq`, esse valor tem preferência.
 */
export function frequenciaDisciplina(disc: DisciplinaAlunoDesempenho): FrequenciaCalculada {
  let faltas = 0;
  let aulas = 0;
  disc.periodos.forEach((p) => {
    if (p.aulas && p.aulas > 0) {
      aulas += p.aulas;
      faltas += p.faltas ?? 0;
    }
  });
  const fechado = disc.resultadoFinal?.percentualFrequencia ?? null;
  if (fechado !== null) return { faltas, aulas, percentual: fechado };
  if (aulas === 0) return { faltas, aulas, percentual: null };
  return { faltas, aulas, percentual: Math.max(0, ((aulas - faltas) * 100) / aulas) };
}

/** Último período com lançamento, ou undefined. */
export function ultimoPeriodoLancado(disc: DisciplinaAlunoDesempenho, procedimento: ProcedimentoDesempenho): AproveitamentoPeriodo | undefined {
  const lancados = disc.periodos.filter((ap) => classificarPeriodo(ap, procedimento) !== 'sem');
  return lancados.length ? lancados[lancados.length - 1] : undefined;
}

/**
 * Período de referência do relatório: o corrente do calendário se já tem
 * algum lançamento; senão o último período em que alguém foi avaliado; senão
 * o corrente (ou o primeiro).
 */
export function periodoReferencia(dados: DesempenhoTurma, regencia: number): PeriodoDesempenho | undefined {
  if (dados.periodos.length === 0) return undefined;
  const comLancamento = new Set<number>();
  dados.alunos.forEach((aluno) => {
    const disc = disciplinaDoAluno(aluno, regencia);
    disc?.periodos.forEach((ap) => {
      if (classificarPeriodo(ap, dados.procedimento) !== 'sem') comLancamento.add(ap.ordem);
    });
  });
  const corrente = dados.periodos.find((p) => p.corrente);
  if (corrente && comLancamento.has(corrente.ordem)) return corrente;
  const lancados = dados.periodos.filter((p) => comLancamento.has(p.ordem));
  if (lancados.length) return lancados[lancados.length - 1];
  return corrente ?? dados.periodos[0];
}

export interface ResumoPeriodoTurma {
  ordem: number;
  acima: number;
  abaixo: number;
  sem: number;
  total: number;
  /** Média das notas lançadas (só forma NOTA). */
  media: number | null;
  /** Média da frequência dos alunos com aulas lançadas no período. */
  frequenciaMedia: number | null;
}

/** Totais da turma numa regência e período — só alunos ativos. */
export function resumoPeriodoTurma(dados: DesempenhoTurma, regencia: number, ordem: number): ResumoPeriodoTurma {
  const ativos = dados.alunos.filter((a) => a.ativo);
  const resumo: ResumoPeriodoTurma = { ordem, acima: 0, abaixo: 0, sem: 0, total: ativos.length, media: null, frequenciaMedia: null };
  let somaNotas = 0;
  let qtdNotas = 0;
  let somaFreq = 0;
  let qtdFreq = 0;
  ativos.forEach((aluno) => {
    const ap = aproveitamentoDoPeriodo(disciplinaDoAluno(aluno, regencia), ordem);
    resumo[classificarPeriodo(ap, dados.procedimento)] += 1;
    if (ap && dados.procedimento.forma === 'NOTA' && ap.nota !== null) {
      somaNotas += ap.nota;
      qtdNotas += 1;
    }
    if (ap && ap.aulas && ap.aulas > 0) {
      somaFreq += ((ap.aulas - (ap.faltas ?? 0)) * 100) / ap.aulas;
      qtdFreq += 1;
    }
  });
  if (qtdNotas) resumo.media = somaNotas / qtdNotas;
  if (qtdFreq) resumo.frequenciaMedia = somaFreq / qtdFreq;
  return resumo;
}

export type TipoAlerta = 'frequenciaBaixa' | 'abaixoMinimo' | 'notaEmQueda';

export interface AlertaAluno {
  tipo: TipoAlerta;
  regencia: number;
  /** Frase curta para o badge/lista, ex.: "Frequência 68% (mín. 75%)". */
  descricao: string;
}

export interface AlunoEmRisco {
  aluno: AlunoDesempenho;
  alertas: AlertaAluno[];
  /** Quantidade de tipos distintos de alerta — critério de ordenação. */
  gravidade: number;
}

const ROTULO_ALERTA: Record<TipoAlerta, string> = {
  frequenciaBaixa: 'Frequência baixa',
  abaixoMinimo: 'Abaixo do mínimo',
  notaEmQueda: 'Nota em queda',
};

export function rotuloAlerta(tipo: TipoAlerta): string {
  return ROTULO_ALERTA[tipo];
}

/** Alertas de um aluno em todas as regências do professor. */
export function alertasDoAluno(dados: DesempenhoTurma, aluno: AlunoDesempenho): AlertaAluno[] {
  const alertas: AlertaAluno[] = [];
  const { procedimento } = dados;
  dados.regencias.forEach((reg) => {
    const disc = disciplinaDoAluno(aluno, reg.codigo);
    if (!disc) return;
    const nomeDisc = dados.regencias.length > 1 ? ` · ${reg.disciplina}` : '';

    const freq = frequenciaDisciplina(disc);
    if (freq.percentual !== null && freq.percentual < procedimento.frequenciaMinima) {
      alertas.push({
        tipo: 'frequenciaBaixa',
        regencia: reg.codigo,
        descricao: `Frequência ${formatarPercentual(freq.percentual)} (mín. ${formatarPercentual(procedimento.frequenciaMinima)})${nomeDisc}`,
      });
    }

    // Parecer (Infantil) não tem mínimo nem nota — só o alerta de frequência se aplica.
    if (procedimento.forma === 'PARECER' || aluno.avaliadoPorParecer) return;

    const ultimo = ultimoPeriodoLancado(disc, procedimento);
    if (ultimo && classificarPeriodo(ultimo, procedimento) === 'abaixo') {
      const periodo = dados.periodos.find((p) => p.ordem === ultimo.ordem);
      alertas.push({
        tipo: 'abaixoMinimo',
        regencia: reg.codigo,
        descricao: `${rotuloValor(ultimo, procedimento)} no ${periodo?.abreviado ?? `período ${ultimo.ordem}`}${nomeDisc}`,
      });
    }

    const serie = serieDisciplina(disc, procedimento);
    const { tendencia, delta } = tendenciaSerie(serie, procedimento);
    if (tendencia === 'caiu' && delta !== null) {
      const de = serie[serie.length - 2];
      const para = serie[serie.length - 1];
      alertas.push({
        tipo: 'notaEmQueda',
        regencia: reg.codigo,
        descricao: `De ${de.rotulo} para ${para.rotulo}${nomeDisc}`,
      });
    }
  });
  return alertas;
}

/** Alunos ativos com ao menos um alerta, do mais grave para o menos grave e depois por nome. */
export function alunosEmRisco(dados: DesempenhoTurma): AlunoEmRisco[] {
  return dados.alunos
    .filter((a) => a.ativo)
    .map((aluno) => {
      const alertas = alertasDoAluno(dados, aluno);
      return { aluno, alertas, gravidade: new Set(alertas.map((a) => a.tipo)).size };
    })
    .filter((r) => r.alertas.length > 0)
    .sort((a, b) => b.gravidade - a.gravidade || b.alertas.length - a.alertas.length || a.aluno.nome.localeCompare(b.aluno.nome, 'pt-BR'));
}

/** Escala 0–1 para desenhar a barrinha de um valor comparável. */
export function proporcaoNaEscala(valor: number, procedimento: ProcedimentoDesempenho): number {
  let menor = 0;
  let maior = 10;
  if (procedimento.forma === 'NOTA') {
    menor = procedimento.menorValor ?? 0;
    maior = procedimento.maiorValor ?? 10;
  } else if (procedimento.forma === 'NIVEL' && procedimento.conceitos.length) {
    const ordens = procedimento.conceitos.map((c) => c.ordem);
    menor = Math.min(...ordens);
    maior = Math.max(...ordens);
  }
  if (maior <= menor) return 1;
  return Math.min(1, Math.max(0, (valor - menor) / (maior - menor)));
}
