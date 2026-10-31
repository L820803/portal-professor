import { Check, ChevronDown, ChevronRight, Minus, Search, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import * as registroAulaService from '../services/registroAulaService';
import { extractErrorMessage } from '../services/client';
import type { DisciplinaBncc, UnidadeTematicaBncc } from '../types';
import { Carregando, ErrorBanner } from './ui';

/**
 * Seleção de habilidades BNCC (CampoHabilidadesSection +
 * HabilidadesUnificadasSection do mobile): busca por código/ano/palavra,
 * painel das selecionadas e árvore unidade → objeto → habilidade com
 * seleção em cascata. Com várias disciplinas (regência polivalente), cada
 * disciplina vira um ramo da mesma árvore.
 */

interface No {
    key: string;
    label: string;
    codigo?: string;
    disciplina?: number;
    children?: No[];
    /** Chaves `${disciplina}|${codigo}` de todas as folhas abaixo. */
    folhas: string[];
}

function normalizar(texto: string): string {
    return texto
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase();
}

function montarArvore(disciplina: DisciplinaBncc, unidades: UnidadeTematicaBncc[], prefixo: string): No[] {
    return unidades.map((u, i) => {
        const objetos = u.objetosConhecimento.map((o, j) => {
            const habilidades: No[] = o.habilidades.map((h) => ({
                key: `${prefixo}u${i}-o${j}-${h.codigo}`,
                label: h.nome,
                codigo: h.codigo,
                disciplina: disciplina.codigo,
                folhas: [`${disciplina.codigo}|${h.codigo}`],
            }));
            return { key: `${prefixo}u${i}-o${j}`, label: o.nome, children: habilidades, folhas: habilidades.flatMap((x) => x.folhas) };
        });
        return { key: `${prefixo}u${i}`, label: u.nome, children: objetos, folhas: objetos.flatMap((x) => x.folhas) };
    });
}

function filtrar(nos: No[], q: string): No[] {
    const resultado: No[] = [];
    nos.forEach((no) => {
        const bate = (no.codigo && normalizar(no.codigo).includes(q)) || normalizar(no.label).includes(q);
        if (!no.children) {
            if (bate) resultado.push(no);
            return;
        }
        if (bate) {
            resultado.push(no);
            return;
        }
        const filhos = filtrar(no.children, q);
        if (filhos.length) resultado.push({ ...no, children: filhos, folhas: filhos.flatMap((f) => f.folhas) });
    });
    return resultado;
}

function Destaque({ texto, termo }: { texto: string; termo: string }) {
    if (!termo) return <>{texto}</>;
    const i = normalizar(texto).indexOf(termo);
    if (i < 0) return <>{texto}</>;
    return (
        <>
            {texto.slice(0, i)}
            <mark className="rounded bg-sd-accent-soft px-0.5 text-sd-text">{texto.slice(i, i + termo.length)}</mark>
            {texto.slice(i + termo.length)}
        </>
    );
}

function CaixaSelecao({ estado }: { estado: 'checked' | 'partial' | 'unchecked' }) {
    return (
        <span
            className={cn(
                'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border-2',
                estado === 'unchecked' ? 'border-sd-border bg-sd-surface' : 'border-sd-primary bg-sd-primary text-white',
            )}
        >
            {estado === 'checked' ? <Check className="size-3.5" strokeWidth={3} /> : estado === 'partial' ? <Minus className="size-3.5" strokeWidth={3} /> : null}
        </span>
    );
}

export default function HabilidadesSection({
    escola,
    regencia,
    disciplinas,
    selecao,
    onChange,
    onCarregado,
}: {
    escola: string;
    regencia: number;
    disciplinas: DisciplinaBncc[];
    /** Habilidades marcadas por disciplina BNCC. */
    selecao: Map<number, string[]>;
    onChange: (selecao: Map<number, string[]>) => void;
    onCarregado: (carregado: boolean) => void;
}) {
    const [arvores, setArvores] = useState<{ disciplina: DisciplinaBncc; nos: No[] }[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [pesquisa, setPesquisa] = useState('');
    const [expandidos, setExpandidos] = useState<Set<string>>(new Set());

    const chaveDisciplinas = disciplinas.map((d) => d.codigo).join(',');

    useEffect(() => {
        let ativo = true;
        setLoading(true);
        setError(null);
        onCarregado(false);
        Promise.all(
            disciplinas.map(async (d) => ({
                disciplina: d,
                nos: montarArvore(d, await registroAulaService.getHabilidadesBncc(escola, regencia, d.codigo), disciplinas.length > 1 ? `d${d.codigo}-` : ''),
            })),
        )
            .then((lista) => {
                if (!ativo) return;
                setArvores(lista);
                onCarregado(true);
            })
            .catch((err) => {
                if (ativo) setError(extractErrorMessage(err, 'Não foi possível carregar as habilidades BNCC.'));
            })
            .finally(() => {
                if (ativo) setLoading(false);
            });
        return () => {
            ativo = false;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [escola, regencia, chaveDisciplinas]);

    const raiz: No[] = useMemo(() => {
        if (arvores.length === 1) return arvores[0].nos;
        return arvores.map(({ disciplina, nos }) => ({
            key: `d${disciplina.codigo}`,
            label: disciplina.nome,
            children: nos,
            folhas: nos.flatMap((n) => n.folhas),
        }));
    }, [arvores]);

    const selecionados = useMemo(() => {
        const set = new Set<string>();
        selecao.forEach((codigos, disc) => codigos.forEach((c) => set.add(`${disc}|${c}`)));
        return set;
    }, [selecao]);

    const nomes = useMemo(() => {
        const mapa = new Map<string, string>();
        const visitar = (nos: No[]) =>
            nos.forEach((n) => {
                if (n.codigo && n.disciplina) mapa.set(`${n.disciplina}|${n.codigo}`, n.label);
                if (n.children) visitar(n.children);
            });
        visitar(raiz);
        return mapa;
    }, [raiz]);

    const termo = normalizar(pesquisa.trim());
    const emBusca = termo.length > 0;
    const visiveis = emBusca ? filtrar(raiz, termo) : raiz;

    function aplicar(chaves: string[], marcar: boolean) {
        const set = new Set(selecionados);
        chaves.forEach((k) => (marcar ? set.add(k) : set.delete(k)));
        const nova = new Map<number, string[]>(disciplinas.map((d) => [d.codigo, []]));
        set.forEach((k) => {
            const [disc, codigo] = k.split('|');
            nova.get(Number(disc))?.push(codigo);
        });
        onChange(nova);
    }

    function estado(no: No): 'checked' | 'partial' | 'unchecked' {
        const marcados = no.folhas.filter((f) => selecionados.has(f)).length;
        if (marcados === 0) return 'unchecked';
        return marcados === no.folhas.length ? 'checked' : 'partial';
    }

    function alternarExpandido(key: string) {
        setExpandidos((prev) => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });
    }

    function renderNos(nos: No[], depth: number): ReactNode {
        return nos.map((no) => {
            const folha = !no.children;
            const aberto = emBusca || expandidos.has(no.key);
            const est = estado(no);
            return (
                <li key={no.key}>
                    <div className={cn('flex items-start gap-1 rounded-lg py-1.5 pr-2 hover:bg-sd-bg', folha && est === 'checked' && 'bg-sd-primary-soft/60')} style={{ paddingLeft: depth * 20 }}>
                        {folha ? (
                            <span className="w-6 shrink-0" />
                        ) : (
                            <button
                                type="button"
                                onClick={() => alternarExpandido(no.key)}
                                disabled={emBusca}
                                className="flex size-6 shrink-0 items-center justify-center rounded text-sd-primary-light hover:bg-sd-primary-soft disabled:opacity-60"
                                aria-label={aberto ? 'Recolher' : 'Expandir'}
                                aria-expanded={aberto}
                            >
                                {aberto ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                            </button>
                        )}
                        <button type="button" onClick={() => aplicar(no.folhas, est !== 'checked')} className="flex flex-1 items-start gap-2 text-left" role="checkbox" aria-checked={est === 'checked' ? true : est === 'partial' ? 'mixed' : false}>
                            <CaixaSelecao estado={est} />
                            <span className={cn('text-sm', folha ? 'text-sd-text' : 'font-semibold text-sd-primary')}>
                                {no.codigo ? (
                                    <span className="mr-1.5 font-bold text-sd-primary-light">
                                        <Destaque texto={no.codigo} termo={termo} />
                                    </span>
                                ) : null}
                                <Destaque texto={no.label} termo={termo} />
                                {!folha ? <span className="ml-1 text-xs font-normal text-sd-muted">({no.folhas.length})</span> : null}
                            </span>
                        </button>
                    </div>
                    {!folha && aberto ? <ul>{renderNos(no.children!, depth + 1)}</ul> : null}
                </li>
            );
        });
    }

    const listaSelecionados = Array.from(selecionados);

    return (
        <div>
            <div className="relative mb-3">
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-sd-muted" />
                <input
                    value={pesquisa}
                    onChange={(e) => setPesquisa(e.target.value)}
                    placeholder="Buscar por código, ano ou palavra-chave (ex.: 06, EF06LP04, concordância)"
                    className="w-full rounded-xl border border-sd-border bg-sd-bg py-2.5 pr-20 pl-9 text-sm text-sd-text outline-none placeholder:text-sd-muted focus:border-sd-primary-light focus:ring-2 focus:ring-sd-primary-soft"
                />
                {pesquisa ? (
                    <button type="button" onClick={() => setPesquisa('')} className="absolute top-1/2 right-2 -translate-y-1/2 rounded-lg px-2 py-1 text-xs font-semibold text-sd-primary hover:bg-sd-primary-soft">
                        Limpar
                    </button>
                ) : null}
            </div>

            {listaSelecionados.length > 0 ? (
                <div className="mb-3 rounded-xl bg-sd-primary-soft p-3">
                    <p className="mb-2 text-xs font-bold text-sd-primary">
                        {listaSelecionados.length} habilidade{listaSelecionados.length === 1 ? '' : 's'} selecionada{listaSelecionados.length === 1 ? '' : 's'}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                        {listaSelecionados.map((k) => (
                            <button
                                key={k}
                                type="button"
                                onClick={() => aplicar([k], false)}
                                title={nomes.get(k)}
                                className="inline-flex items-center gap-1 rounded-full bg-sd-surface px-2.5 py-1 text-xs font-bold text-sd-primary hover:bg-sd-danger-bg hover:text-sd-danger"
                            >
                                {k.split('|')[1]}
                                <X className="size-3" />
                            </button>
                        ))}
                    </div>
                </div>
            ) : null}

            {loading ? (
                <Carregando message="Carregando habilidades..." className="py-8" />
            ) : error ? (
                <ErrorBanner message={error} />
            ) : visiveis.length === 0 ? (
                <div className="rounded-xl bg-sd-bg p-4 text-center">
                    <p className="font-semibold">{emBusca ? 'Nenhum resultado' : 'Nenhuma habilidade encontrada'}</p>
                    <p className="mt-1 text-sm text-sd-muted">
                        {emBusca ? `Nenhuma habilidade com "${pesquisa.trim()}" no código ou no enunciado.` : 'Não há habilidades BNCC cadastradas.'}
                    </p>
                </div>
            ) : (
                <ul className="max-h-[480px] overflow-y-auto rounded-xl border border-sd-border p-2">{renderNos(visiveis, 0)}</ul>
            )}
        </div>
    );
}
