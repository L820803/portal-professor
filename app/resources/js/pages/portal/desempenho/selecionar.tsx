import { useEffect, useMemo, useRef, useState } from 'react';
import Screen from '@/portal/components/Screen';
import { AppButton, Carregando, EmptyState, ErrorBanner, SelectableList } from '@/portal/components/ui';
import { ir, useQuery, voltar } from '@/portal/lib/nav';
import * as authService from '@/portal/services/authService';
import { extractErrorMessage } from '@/portal/services/client';
import * as registroAulaService from '@/portal/services/registroAulaService';
import type { DadosRegente, DesempenhoModo, Escola } from '@/portal/types';

const TITULO: Record<DesempenhoModo, string> = {
    evolucao: 'Evolução das notas',
    relatorio: 'Relatório da turma',
    risco: 'Alunos em risco',
    frequencia: 'Quem está faltando',
};

const DESTINO: Record<DesempenhoModo, string> = {
    evolucao: '/desempenho/evolucao',
    relatorio: '/desempenho/relatorio',
    risco: '/desempenho/risco',
    frequencia: '/desempenho/faltas',
};

interface ItemTurma {
    codigo: string;
    nome: string;
    descricao?: string;
    turma: { codigo: number; nome: string };
    etapa: { codigo: number; nome: string };
}

/**
 * Escolha de escola e turma/etapa dos cards de desempenho
 * (DesempenhoSelectScreen do mobile). Pula a escolha quando há uma só
 * escola ou uma só turma.
 */
export default function DesempenhoSelecionar() {
    const query = useQuery();
    const modo = (query.get('modo') as DesempenhoModo) in TITULO ? (query.get('modo') as DesempenhoModo) : 'evolucao';
    const escolaParam = query.get('escola');

    const [escolas, setEscolas] = useState<Escola[]>([]);
    const [dados, setDados] = useState<DadosRegente | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [tentativa, setTentativa] = useState(0);
    const redirecionou = useRef(false);

    const escola = escolas.find((e) => e.codigo === escolaParam) ?? (escolas.length === 1 ? escolas[0] : null);

    useEffect(() => {
        let ativo = true;
        setLoading(true);
        setError(null);
        authService
            .escolas()
            .then((lista) => {
                if (!ativo) return;
                setEscolas(lista);
                // Sem escola resolvida, a lista de escolas é mostrada; senão espera as turmas.
                if (lista.length !== 1 && !lista.some((e) => e.codigo === escolaParam)) setLoading(false);
            })
            .catch((err) => {
                if (!ativo) return;
                setError(extractErrorMessage(err, 'Não foi possível carregar as escolas.'));
                setLoading(false);
            });
        return () => {
            ativo = false;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tentativa]);

    useEffect(() => {
        if (!escola) return;
        let ativo = true;
        redirecionou.current = false;
        setLoading(true);
        setError(null);
        setDados(null);
        registroAulaService
            .getDadosRegente(escola.codigo)
            .then((valor) => {
                if (ativo) setDados(valor);
            })
            .catch((err) => {
                if (ativo) setError(extractErrorMessage(err, 'Não foi possível carregar suas turmas.'));
            })
            .finally(() => {
                if (ativo) setLoading(false);
            });
        return () => {
            ativo = false;
        };
    }, [escola?.codigo, tentativa]);

    // Uma linha por turma × etapa (turmas multisseriadas têm mais de uma etapa).
    const itens = useMemo<ItemTurma[]>(() => {
        if (!dados) return [];
        return dados.etapas
            .map((etapa): ItemTurma | null => {
                const turma = dados.turmas.find((t) => t.codigo === etapa.turmaCodigo);
                if (!turma) return null;
                return {
                    codigo: `${turma.codigo}_${etapa.codigo}`,
                    nome: turma.nome,
                    descricao: `${etapa.nome}${turma.turno?.nome ? ` · ${turma.turno.nome}` : ''}`,
                    turma: { codigo: turma.codigo, nome: turma.nome },
                    etapa: { codigo: etapa.codigo, nome: etapa.nome },
                };
            })
            .filter((i): i is ItemTurma => i !== null)
            .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    }, [dados]);

    function abrir(item: ItemTurma, replace = false) {
        if (!escola) return;
        ir(
            DESTINO[modo],
            { escola: escola.codigo, turma: item.turma.codigo, etapa: item.etapa.codigo, turmaNome: item.turma.nome, etapaNome: item.etapa.nome },
            { replace },
        );
    }

    const unicaTurma = !loading && !error && !!escola && !!dados && itens.length === 1;
    useEffect(() => {
        if (!unicaTurma || redirecionou.current) return;
        redirecionou.current = true;
        abrir(itens[0], escolas.length <= 1);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [unicaTurma]);

    const mostrandoEscolas = !escola && escolas.length > 1;

    return (
        <Screen
            title={TITULO[modo]}
            subtitle={escola ? `${escola.nome} — escolha a turma` : 'Escolha a escola'}
            onBack={() => (escola && escolas.length > 1 ? ir('/desempenho/turmas', { modo }) : voltar())}
        >
            {error ? (
                <>
                    <ErrorBanner message={error} />
                    <AppButton label="Tentar novamente" variant="outline" onClick={() => setTentativa((t) => t + 1)} className="mb-4" />
                </>
            ) : null}
            {loading || unicaTurma ? (
                <Carregando />
            ) : mostrandoEscolas ? (
                <SelectableList items={escolas} onSelect={(e) => ir('/desempenho/turmas', { modo, escola: e.codigo })} emptyLabel="Nenhuma escola vinculada." />
            ) : escola && !error ? (
                itens.length === 0 ? (
                    <EmptyState title="Nenhuma turma encontrada" description="O e-cidade não retornou turmas em que você seja regente nesta escola." />
                ) : (
                    <>
                        <p className="mb-2 text-[13px] font-semibold text-sd-muted">
                            {itens.length} turma{itens.length === 1 ? '' : 's'}
                        </p>
                        <SelectableList items={itens} onSelect={(item) => abrir(item)} />
                    </>
                )
            ) : escolas.length === 0 && !error ? (
                <EmptyState title="Nenhuma escola encontrada" description="Seu usuário não está vinculado a nenhuma escola." />
            ) : null}
        </Screen>
    );
}
