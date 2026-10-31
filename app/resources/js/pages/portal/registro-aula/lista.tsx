import { CircleHelp, Plus, SlidersHorizontal, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppAlert } from '@/portal/components/AppAlert';
import { ConteudoAulaCard, RegistroAulaAjudaModal, RegistroAulaFiltrosModal } from '@/portal/components/registroAula';
import Screen from '@/portal/components/Screen';
import { AppButton, Carregando, EmptyState, ErrorBanner, LoadingOverlay, SelectableList } from '@/portal/components/ui';
import { formatDatePtBr } from '@/portal/lib/dateUtils';
import { ir, useQuery, voltar } from '@/portal/lib/nav';
import * as authService from '@/portal/services/authService';
import { extractErrorMessage } from '@/portal/services/client';
import * as registroAulaService from '@/portal/services/registroAulaService';
import type { ConteudoRegistroAula, DadosRegente, Escola, RegistroAulaFiltros } from '@/portal/types';

const ITENS_POR_PAGINA = 12;

function FiltroChip({ label, onRemove }: { label: string; onRemove: () => void }) {
    return (
        <button
            type="button"
            onClick={onRemove}
            className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-sd-primary-soft px-3 py-1 text-xs font-semibold text-sd-primary hover:bg-sd-danger-bg hover:text-sd-danger"
        >
            <span className="truncate">{label}</span>
            <X className="size-3" />
        </button>
    );
}

/** Lista de conteúdos lançados (RegistroAulaListScreen do mobile). */
export default function RegistroAulaLista() {
    const query = useQuery();
    const escolaParam = query.get('escola');

    const [escolas, setEscolas] = useState<Escola[]>([]);
    const [loadingEscolas, setLoadingEscolas] = useState(true);
    const [erroEscolas, setErroEscolas] = useState<string | null>(null);
    const [dadosRegente, setDadosRegente] = useState<DadosRegente | null>(null);
    const [filtros, setFiltros] = useState<RegistroAulaFiltros>({});
    const [filtroAberto, setFiltroAberto] = useState(false);
    const [ajudaAberta, setAjudaAberta] = useState(false);
    const [itens, setItens] = useState<ConteudoRegistroAula[]>([]);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [excluindo, setExcluindo] = useState(false);

    const escola = escolas.find((e) => e.codigo === escolaParam) ?? (escolas.length === 1 ? escolas[0] : null);

    useEffect(() => {
        let ativo = true;
        authService
            .escolas()
            .then((lista) => {
                if (ativo) setEscolas(lista);
            })
            .catch((err) => {
                if (ativo) setErroEscolas(extractErrorMessage(err, 'Não foi possível carregar as escolas.'));
            })
            .finally(() => {
                if (ativo) setLoadingEscolas(false);
            });
        return () => {
            ativo = false;
        };
    }, []);

    useEffect(() => {
        if (!escola) return;
        setDadosRegente(null);
        registroAulaService
            .getDadosRegente(escola.codigo)
            .then(setDadosRegente)
            .catch(() => {
                // Sem isso os filtros ficam vazios; a lista em si não depende deste resultado.
            });
    }, [escola?.codigo]);

    const loadPage = useCallback(
        async (pagina: number, replace: boolean) => {
            if (!escola) return;
            if (replace) setLoading(true);
            else setLoadingMore(true);
            setError(null);
            try {
                const result = await registroAulaService.getConteudosRegenteEscola(escola.codigo, pagina, ITENS_POR_PAGINA, filtros);
                setItens((prev) => {
                    if (replace) return result.items;
                    const existentes = new Set(prev.map((i) => i.codigo));
                    return [...prev, ...result.items.filter((i) => !existentes.has(i.codigo))];
                });
                setTotal(result.total);
                setPage(pagina);
            } catch (err) {
                setError(extractErrorMessage(err, 'Não foi possível carregar os conteúdos lançados.'));
            } finally {
                setLoading(false);
                setLoadingMore(false);
            }
        },
        [escola?.codigo, filtros],
    );

    useEffect(() => {
        if (!escola) return;
        setItens([]);
        void loadPage(1, true);
    }, [loadPage]);

    function handleExcluir(item: ConteudoRegistroAula) {
        if (!escola) return;
        AppAlert.confirm({
            title: 'Excluir conteúdo?',
            message: 'Deseja mesmo excluir este lançamento? Esta ação não pode ser desfeita.',
            confirmText: 'Excluir',
            destructive: true,
            onConfirm: async () => {
                setExcluindo(true);
                setError(null);
                try {
                    await registroAulaService.excluirConteudo(escola.codigo, item.codigo);
                    setItens((prev) => prev.filter((i) => i.codigo !== item.codigo));
                    setTotal((prev) => Math.max(0, prev - 1));
                    AppAlert.success('Sucesso!', 'Excluído com sucesso.');
                } catch (err) {
                    setError(extractErrorMessage(err, 'Não foi possível excluir este conteúdo.'));
                } finally {
                    setExcluindo(false);
                }
            },
        });
    }

    const nomeTurma = useMemo(() => dadosRegente?.turmas.find((t) => t.codigo === filtros.turma)?.nome, [dadosRegente, filtros.turma]);
    const nomeEtapa = useMemo(() => dadosRegente?.etapas.find((e) => e.codigo === filtros.etapa)?.nome, [dadosRegente, filtros.etapa]);
    const nomeRegencia = useMemo(() => dadosRegente?.regencias.find((r) => r.codigo === filtros.regencia)?.disciplina, [dadosRegente, filtros.regencia]);
    const filtroAtivoCount = [filtros.turma, filtros.etapa, filtros.regencia, filtros.data].filter((v) => v !== undefined).length;

    function removerFiltro(chave: keyof RegistroAulaFiltros) {
        setFiltros((prev) => {
            const next = { ...prev };
            delete next[chave];
            return next;
        });
    }

    if (loadingEscolas) {
        return (
            <Screen title="Registro de aula" onBack={() => voltar()}>
                <Carregando message="Carregando escolas..." />
            </Screen>
        );
    }

    if (!escola) {
        return (
            <Screen title="Registro de aula" subtitle="Selecione a escola" onBack={() => voltar()}>
                <ErrorBanner message={erroEscolas} />
                <SelectableList items={escolas} onSelect={(e) => ir('/registro-aula', { escola: e.codigo })} emptyLabel="Nenhuma escola vinculada ao seu usuário." />
            </Screen>
        );
    }

    return (
        <Screen
            title="Registro de aula"
            subtitle={escola.nome}
            onBack={() => (escolas.length > 1 ? ir('/registro-aula') : voltar())}
            rightActions={<AppButton label={<><Plus className="size-5" /> <span className="hidden sm:inline">Novo registro</span></>} size="sm" onClick={() => ir('/registro-aula/formulario', { escola: escola.codigo })} />}
        >
            <ErrorBanner message={error} />

            <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-sm text-sd-muted">
                    {total} registro{total === 1 ? '' : 's'} encontrado{total === 1 ? '' : 's'}
                </p>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setAjudaAberta(true)}
                        className="flex size-9 items-center justify-center rounded-full border-[1.5px] border-sd-primary text-sd-primary hover:bg-sd-primary-soft"
                        aria-label="Como usar o Registro de Aula"
                    >
                        <CircleHelp className="size-5" />
                    </button>
                    <button
                        type="button"
                        onClick={() => setFiltroAberto(true)}
                        className="inline-flex items-center gap-2 rounded-full bg-sd-primary px-4 py-2 text-sm font-bold text-white hover:bg-sd-primary-light"
                    >
                        <SlidersHorizontal className="size-4" />
                        Filtros{filtroAtivoCount > 0 ? ` (${filtroAtivoCount})` : ''}
                    </button>
                </div>
            </div>

            {filtroAtivoCount > 0 ? (
                <div className="mb-3 flex flex-wrap gap-2">
                    {filtros.data ? <FiltroChip label={`Data: ${formatDatePtBr(filtros.data)}`} onRemove={() => removerFiltro('data')} /> : null}
                    {filtros.turma && nomeTurma ? <FiltroChip label={`Turma: ${nomeTurma}`} onRemove={() => removerFiltro('turma')} /> : null}
                    {filtros.etapa && nomeEtapa ? <FiltroChip label={`Etapa: ${nomeEtapa}`} onRemove={() => removerFiltro('etapa')} /> : null}
                    {filtros.regencia && nomeRegencia ? <FiltroChip label={`Regência: ${nomeRegencia}`} onRemove={() => removerFiltro('regencia')} /> : null}
                </div>
            ) : null}

            {loading ? (
                <Carregando message="Carregando conteúdos..." />
            ) : itens.length === 0 && !error ? (
                <EmptyState
                    title="Nenhum conteúdo encontrado"
                    description={filtroAtivoCount > 0 ? 'Nenhum lançamento corresponde aos filtros selecionados.' : 'Nenhum conteúdo de aula foi lançado ainda.'}
                />
            ) : (
                <>
                    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                        {itens.map((item) => (
                            <ConteudoAulaCard
                                key={item.codigo}
                                item={item}
                                onAbrir={() => ir('/registro-aula/formulario', { escola: escola.codigo, codigo: item.codigo })}
                                onExcluir={() => handleExcluir(item)}
                            />
                        ))}
                    </div>
                    {itens.length < total ? (
                        <div className="mt-5 flex justify-center">
                            <AppButton label="Carregar mais" variant="outline" size="sm" loading={loadingMore} onClick={() => void loadPage(page + 1, false)} />
                        </div>
                    ) : null}
                </>
            )}

            <RegistroAulaFiltrosModal open={filtroAberto} onClose={() => setFiltroAberto(false)} dadosRegente={dadosRegente} filtros={filtros} onApply={setFiltros} />
            <RegistroAulaAjudaModal open={ajudaAberta} onClose={() => setAjudaAberta(false)} />
            <LoadingOverlay visible={excluindo} message="Excluindo..." />
        </Screen>
    );
}
