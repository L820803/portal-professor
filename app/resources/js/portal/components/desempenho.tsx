import { useCallback, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { formatarNota } from '../lib/desempenhoIndicadores';
import {
    aproveitamentoDoPeriodo,
    classificarPeriodo,
    proporcaoNaEscala,
    rotuloAlerta,
    rotuloValor,
    valorComparavel,
} from '../lib/desempenhoIndicadores';
import type { TipoAlerta } from '../lib/desempenhoIndicadores';
import { numero, useQuery, voltar } from '../lib/nav';
import * as authService from '../services/authService';
import { extractErrorMessage } from '../services/client';
import * as desempenhoService from '../services/desempenhoService';
import type {
    DesempenhoTurma,
    DesempenhoTurmaParams,
    DisciplinaAlunoDesempenho,
    ObservacaoAluno,
    PeriodoDesempenho,
    ProcedimentoDesempenho,
    ProjecaoDisciplina,
    ProjecaoNotas,
    RegenciaDesempenho,
    SituacaoProjecao,
} from '../types';
import Screen from './Screen';
import { AppButton, Carregando, ChipSelect, EmptyState, ErrorBanner, Modal } from './ui';

export const COR_CLASSIFICACAO = { acima: '#2F9466', abaixo: '#D2483F', sem: '#C3C2BA' } as const;

// --------------------------------------------------------------------- Dados

/** Parâmetros da turma (escola/turma/etapa) lidos da URL, com os nomes resolvidos. */
export function useTurmaParams(): { params: DesempenhoTurmaParams | null; query: URLSearchParams } {
    const query = useQuery();
    const escolaCodigo = query.get('escola') ?? '';
    const turma = numero(query.get('turma'));
    const etapa = numero(query.get('etapa'));
    const [escolaNome, setEscolaNome] = useState('');

    useEffect(() => {
        authService
            .escolas()
            .then((lista) => setEscolaNome(lista.find((e) => e.codigo === escolaCodigo)?.nome ?? ''))
            .catch(() => undefined);
    }, [escolaCodigo]);

    if (!escolaCodigo || turma === null || etapa === null) return { params: null, query };
    return {
        params: {
            escola: { codigo: escolaCodigo, nome: escolaNome },
            turma: { codigo: turma, nome: query.get('turmaNome') ?? '' },
            etapa: { codigo: etapa, nome: query.get('etapaNome') ?? '' },
        },
        query,
    };
}

export function paramsUrl(p: DesempenhoTurmaParams, extra: Record<string, string | number> = {}) {
    return { escola: p.escola.codigo, turma: p.turma.codigo, etapa: p.etapa.codigo, turmaNome: p.turma.nome, etapaNome: p.etapa.nome, ...extra };
}

export interface Carregado<T> {
    dados: T | null;
    loading: boolean;
    error: string | null;
    recarregar: () => void;
}

/** Equivalente web de `useCarregarComCache`/`useDesempenhoTurma` (sem cache offline). */
export function useCarregar<T>(chave: string | null, buscar: () => Promise<T>, mensagemErro: string): Carregado<T> {
    const [dados, setDados] = useState<T | null>(null);
    const [loading, setLoading] = useState(chave !== null);
    const [error, setError] = useState<string | null>(null);
    const [tentativa, setTentativa] = useState(0);

    useEffect(() => {
        if (chave === null) return;
        let ativo = true;
        setLoading(true);
        setError(null);
        buscar()
            .then((valor) => {
                if (ativo) setDados(valor);
            })
            .catch((err) => {
                if (ativo) setError(extractErrorMessage(err, mensagemErro));
            })
            .finally(() => {
                if (ativo) setLoading(false);
            });
        return () => {
            ativo = false;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [chave, tentativa]);

    const recarregar = useCallback(() => setTentativa((t) => t + 1), []);
    return { dados, loading, error, recarregar };
}

export function useDesempenhoTurma(params: DesempenhoTurmaParams | null): Carregado<DesempenhoTurma> {
    return useCarregar(
        params ? `${params.escola.codigo}|${params.turma.codigo}|${params.etapa.codigo}` : null,
        () => desempenhoService.getDesempenhoTurma(params!.escola.codigo, params!.turma.codigo, params!.etapa.codigo),
        'Não foi possível carregar o desempenho da turma.',
    );
}

export function subtituloTurma(params: DesempenhoTurmaParams | null, dados?: { turma: { nome: string }; etapa: { nome: string } } | null): string {
    const turma = dados?.turma.nome || params?.turma.nome;
    const etapa = dados?.etapa.nome || params?.etapa.nome;
    return [turma, etapa].filter(Boolean).join(' · ');
}

// -------------------------------------------------------------------- Shell

/**
 * Casca das telas dos cards de desempenho (DesempenhoShell do mobile):
 * carregamento, erro com "Tentar novamente" e a escolha da disciplina
 * quando o professor tem mais de uma regência na turma.
 */
export function DesempenhoShell({
    title,
    hint,
    children,
}: {
    title: string;
    hint?: string;
    children: (dados: DesempenhoTurma, regencia: RegenciaDesempenho, params: DesempenhoTurmaParams) => ReactNode;
}) {
    const { params } = useTurmaParams();
    const { dados, loading, error, recarregar } = useDesempenhoTurma(params);
    const [regenciaCodigo, setRegenciaCodigo] = useState<number | null>(null);
    const regencia = dados?.regencias.find((r) => r.codigo === regenciaCodigo) ?? dados?.regencias[0] ?? null;

    return (
        <Screen title={title} subtitle={subtituloTurma(params, dados)} onBack={() => voltar('/inicio')}>
            {!params ? <EmptyState title="Turma não informada" description="Volte e escolha a turma novamente." /> : null}
            {error ? (
                <>
                    <ErrorBanner message={error} />
                    <AppButton label="Tentar novamente" variant="outline" onClick={recarregar} className="mb-4" />
                </>
            ) : null}
            {dados && dados.regencias.length > 1 && regencia ? (
                <div className="mb-3">
                    <p className="mb-1.5 text-[13px] font-semibold text-sd-muted">Disciplina</p>
                    <ChipSelect
                        options={dados.regencias.map((r) => ({ codigo: r.codigo, label: r.disciplina, cor: r.cor }))}
                        selected={regencia.codigo}
                        onSelect={(c) => setRegenciaCodigo(c ?? dados.regencias[0].codigo)}
                        obrigatorio
                    />
                </div>
            ) : null}
            {dados && hint ? <p className="mb-4 text-[13px] text-sd-muted">{hint}</p> : null}
            {loading ? (
                <Carregando message="Carregando desempenho da turma..." />
            ) : dados && regencia && params ? (
                children(dados, regencia, params)
            ) : dados && !regencia ? (
                <EmptyState title="Nenhuma disciplina sua nesta turma" description="O e-cidade não encontrou regência do seu cadastro nesta turma e etapa." />
            ) : null}
        </Screen>
    );
}

// ---------------------------------------------------------------- NotaSerie

/** Uma coluna por período: barra proporcional à escala, valor e abreviação (verde/vermelho/cinza). */
export function NotaSerie({
    periodos,
    disciplina,
    procedimento,
    compact = false,
}: {
    periodos: PeriodoDesempenho[];
    disciplina?: DisciplinaAlunoDesempenho;
    procedimento: ProcedimentoDesempenho;
    compact?: boolean;
}) {
    const alturaMax = compact ? 24 : 48;
    return (
        <div className="flex gap-2" role="img" aria-label="Notas por período">
            {periodos.map((periodo) => {
                const ap = aproveitamentoDoPeriodo(disciplina, periodo.ordem);
                const classificacao = classificarPeriodo(ap, procedimento);
                const valor = ap ? valorComparavel(ap, procedimento) : null;
                let altura = 0;
                if (procedimento.forma === 'PARECER') altura = ap?.temParecer ? alturaMax : 0;
                else if (valor !== null) altura = Math.max(3, Math.round(proporcaoNaEscala(valor, procedimento) * alturaMax));
                const cor = COR_CLASSIFICACAO[classificacao];
                return (
                    <div key={periodo.ordem} className="flex flex-1 flex-col items-center">
                        <div className="flex w-full max-w-10 items-end overflow-hidden rounded-md bg-sd-bg" style={{ height: alturaMax }}>
                            <div className="w-full rounded-md" style={{ height: altura, backgroundColor: cor }} />
                        </div>
                        <span className={cn('mt-1 font-bold', compact ? 'text-xs' : 'text-sm')} style={{ color: cor }}>
                            {rotuloValor(ap ?? null, procedimento)}
                        </span>
                        <span className="text-[10px] font-semibold text-sd-muted">{periodo.abreviado}</span>
                    </div>
                );
            })}
        </div>
    );
}

// --------------------------------------------------------------- AlertaBadge

const PALETA_ALERTA: Record<TipoAlerta, { classe: string; icone: string }> = {
    frequenciaBaixa: { classe: 'bg-sd-accent-soft text-sd-accent-dark', icone: '⏰' },
    abaixoMinimo: { classe: 'bg-sd-danger-bg text-sd-danger', icone: '▼' },
    notaEmQueda: { classe: 'bg-sd-purple-soft text-sd-purple', icone: '↘' },
};

export function AlertaBadge({ tipo, detalhe }: { tipo: TipoAlerta; detalhe?: string }) {
    const p = PALETA_ALERTA[tipo];
    return (
        <span className={cn('inline-flex rounded-lg px-2 py-1 text-xs font-semibold', p.classe)}>
            {p.icone} {rotuloAlerta(tipo)}
            {detalhe ? ` · ${detalhe}` : ''}
        </span>
    );
}

// --------------------------------------------------------- ProjecaoNotaBloco

const VISUAL_PROJECAO: Record<SituacaoProjecao, { classe: string; titulo: string }> = {
    garantido: { classe: 'bg-sd-success-bg text-sd-success', titulo: 'Mínimo garantido' },
    atingivel: { classe: 'bg-sd-accent-soft text-sd-accent-dark', titulo: 'Ainda alcança o mínimo' },
    inalcancavel: { classe: 'bg-sd-danger-bg text-sd-danger', titulo: 'Não alcança pela média' },
    concluido: { classe: 'bg-sd-primary-soft text-sd-primary', titulo: 'Todos os períodos lançados' },
    indisponivel: { classe: 'bg-sd-bg text-sd-muted', titulo: 'Sem projeção' },
};

function plural(n: number, singular: string, pluralForm: string): string {
    return `${n} ${n === 1 ? singular : pluralForm}`;
}

/** "Quanto falta para a média": resultado parcial e nota necessária nos períodos restantes. */
export function ProjecaoNotaBloco({
    procedimento,
    projecao,
    avaliadoPorParecer,
}: {
    procedimento: ProjecaoNotas['procedimento'];
    projecao: ProjecaoDisciplina | undefined;
    avaliadoPorParecer: boolean;
}) {
    const minimo = procedimento.minimo !== null ? formatarNota(procedimento.minimo) : null;
    let situacao: SituacaoProjecao = projecao?.situacao ?? 'indisponivel';
    let texto: string;
    if (!procedimento.calculavel || procedimento.forma !== 'NOTA') {
        situacao = 'indisponivel';
        texto =
            procedimento.motivo ??
            (procedimento.forma === 'PARECER'
                ? 'Turma avaliada por parecer descritivo: não há nota a projetar.'
                : procedimento.forma === 'NIVEL'
                  ? 'Turma avaliada por conceito: o e-cidade não projeta a escala de conceitos.'
                  : 'O e-cidade não calcula projeção para esta forma de obtenção do resultado.');
    } else if (avaliadoPorParecer) {
        situacao = 'indisponivel';
        texto = 'Aluno avaliado por parecer nesta matrícula: não há nota a projetar.';
    } else if (!projecao) {
        texto = 'O e-cidade não devolveu projeção para este aluno nesta disciplina.';
    } else {
        const parcial = projecao.resultadoParcial !== null ? formatarNota(projecao.resultadoParcial) : '—';
        const restantes = plural(projecao.periodosRestantes, 'período restante', 'períodos restantes');
        switch (projecao.situacao) {
            case 'garantido':
                texto = `Resultado parcial ${parcial}. Mesmo tirando ${formatarNota(procedimento.menorValor ?? 0)} nos ${restantes}, fecha com o mínimo de ${minimo ?? '—'}.`;
                break;
            case 'atingivel':
                texto = `Resultado parcial ${parcial}. Precisa de ${projecao.notaNecessaria !== null ? formatarNota(projecao.notaNecessaria) : '—'} em cada um dos ${restantes} para chegar a ${minimo ?? '—'}.`;
                break;
            case 'inalcancavel':
                texto = `Resultado parcial ${parcial}. Precisaria de ${projecao.notaNecessaria !== null ? formatarNota(projecao.notaNecessaria) : 'mais que o máximo'} nos ${restantes}, acima do valor máximo (${procedimento.maiorValor !== null ? formatarNota(procedimento.maiorValor) : '—'}). O caminho passa por recuperação ou conselho.`;
                break;
            case 'concluido':
                texto = `Todos os períodos já têm nota. Resultado ${parcial}${minimo ? ` (mínimo ${minimo})` : ''}.`;
                break;
            default:
                texto = procedimento.motivo ?? 'Sem dados suficientes para projetar.';
        }
    }
    const visual = VISUAL_PROJECAO[situacao];
    return (
        <div className={cn('mt-4 rounded-xl p-3', visual.classe)}>
            <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-bold">🎯 {visual.titulo}</p>
                {projecao?.emRecuperacao ? <span className="rounded-full bg-sd-danger px-2 py-0.5 text-[11px] font-bold text-white">em recuperação</span> : null}
            </div>
            <p className="mt-1 text-sm text-sd-text">{texto}</p>
            {situacao !== 'indisponivel' && procedimento.obtencaoDescricao ? (
                <p className="mt-1 text-xs text-sd-muted">Cálculo do e-cidade: {procedimento.obtencaoDescricao.toLowerCase()}.</p>
            ) : null}
        </div>
    );
}

// ----------------------------------------------------------- ObservacoesBloco

export const OBSERVACAO_MAX = 2000;

/** Observações do professor por período, dentro do boletim do aluno. */
export function ObservacoesBloco({
    periodos,
    observacoes,
    onSalvar,
}: {
    periodos: PeriodoDesempenho[];
    observacoes: ObservacaoAluno[];
    onSalvar: (ordem: number, texto: string) => Promise<void>;
}) {
    const [edicao, setEdicao] = useState<{ ordem: number; periodo: string; textoInicial: string } | null>(null);
    const [texto, setTexto] = useState('');
    const [salvando, setSalvando] = useState(false);
    const [erro, setErro] = useState<string | null>(null);

    const textoDoPeriodo = (ordem: number) => observacoes.find((o) => o.ordem === ordem)?.texto ?? '';
    const total = observacoes.filter((o) => o.texto.trim() !== '').length;

    function abrir(ordem: number, periodo: string) {
        const atual = textoDoPeriodo(ordem);
        setEdicao({ ordem, periodo, textoInicial: atual });
        setTexto(atual);
        setErro(null);
    }

    async function confirmar(valor: string) {
        if (!edicao) return;
        setSalvando(true);
        setErro(null);
        try {
            await onSalvar(edicao.ordem, valor.trim());
            setEdicao(null);
        } catch (err) {
            setErro(err instanceof Error && err.message ? err.message : 'Não foi possível gravar a observação.');
        } finally {
            setSalvando(false);
        }
    }

    return (
        <div className="mt-4 rounded-xl border border-sd-border p-3">
            <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-bold text-sd-text">📝 Observações do professor</p>
                <p className="text-xs text-sd-muted">{total === 0 ? 'nenhuma' : total === 1 ? '1 registrada' : `${total} registradas`}</p>
            </div>
            <div className="divide-y divide-sd-border">
                {periodos.map((p) => {
                    const atual = textoDoPeriodo(p.ordem);
                    return (
                        <div key={p.ordem} className="py-2">
                            <div className="flex items-center justify-between">
                                <p className="text-[13px] font-semibold text-sd-text">
                                    {p.descricao}
                                    {p.corrente ? ' · atual' : ''}
                                </p>
                                <button type="button" onClick={() => abrir(p.ordem, p.descricao)} className="text-sm font-semibold text-sd-primary-light hover:underline">
                                    {atual ? 'Editar' : 'Escrever'}
                                </button>
                            </div>
                            {atual ? <p className="mt-1 text-sm text-sd-text">{atual}</p> : <p className="mt-1 text-xs text-sd-disabled italic">Sem observação.</p>}
                        </div>
                    );
                })}
            </div>
            <p className="mt-2 text-xs text-sd-muted">Gravadas no mesmo campo da tela de notas do e-cidade: coordenação e secretaria enxergam pela web.</p>

            <Modal
                open={edicao !== null}
                onClose={() => (salvando ? undefined : setEdicao(null))}
                title={`Observação · ${edicao?.periodo ?? ''}`}
                footer={
                    <>
                        {edicao?.textoInicial ? <AppButton label="Remover" variant="danger" size="sm" onClick={() => void confirmar('')} disabled={salvando} /> : null}
                        <AppButton label="Cancelar" variant="ghost" size="sm" onClick={() => setEdicao(null)} disabled={salvando} />
                        <AppButton
                            label="Salvar"
                            size="sm"
                            onClick={() => void confirmar(texto)}
                            loading={salvando}
                            disabled={salvando || texto.trim() === (edicao?.textoInicial ?? '').trim()}
                        />
                    </>
                }
            >
                <textarea
                    value={texto}
                    onChange={(e) => setTexto(e.target.value.slice(0, OBSERVACAO_MAX))}
                    rows={7}
                    autoFocus
                    disabled={salvando}
                    placeholder="Ex.: não entregou as atividades três vezes seguidas; melhorou após conversa com a família."
                    className="w-full resize-y rounded-xl border border-sd-border bg-sd-bg px-4 py-3 text-[15px] outline-none focus:border-sd-primary-light focus:ring-2 focus:ring-sd-primary-soft"
                />
                <p className="mt-1 text-right text-xs text-sd-muted">
                    {texto.length}/{OBSERVACAO_MAX}
                </p>
                {erro ? <p className="mt-1 text-sm font-semibold text-sd-danger">{erro}</p> : null}
            </Modal>
        </div>
    );
}
