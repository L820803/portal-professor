import { useEffect, useRef, useState } from 'react';
import Screen from '@/portal/components/Screen';
import { Carregando, EmptyState, ErrorBanner, SelectableList } from '@/portal/components/ui';
import { formatDatePtBr, todayApiDateString, weekdayLabelPtBr } from '@/portal/lib/dateUtils';
import { ir, useQuery, voltar } from '@/portal/lib/nav';
import { extractErrorMessage } from '@/portal/services/client';
import * as diarioService from '@/portal/services/diarioService';
import type { Turma } from '@/portal/types';

/** Turmas com aula prevista na data (TurmaSelectScreen do mobile); com uma só, pula direto para a chamada. */
export default function FrequenciaTurmas() {
    const query = useQuery();
    const escola = query.get('escola') ?? '';
    const data = query.get('data') ?? todayApiDateString();
    const [turmas, setTurmas] = useState<Turma[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const autoNavegou = useRef<string | null>(null);

    useEffect(() => {
        let ativo = true;
        setLoading(true);
        setError(null);
        diarioService
            .turmasNoDia(escola, data)
            .then((lista) => {
                if (ativo) setTurmas(lista);
            })
            .catch((err) => {
                if (ativo) setError(extractErrorMessage(err, 'Não foi possível carregar as turmas do dia.'));
            })
            .finally(() => {
                if (ativo) setLoading(false);
            });
        return () => {
            ativo = false;
        };
    }, [escola, data]);

    function abrir(turma: Turma, replace = false) {
        ir('/frequencia/lancamento', { escola, turma: turma.codigo, data }, { replace });
    }

    useEffect(() => {
        if (!loading && turmas.length === 1 && autoNavegou.current !== data) {
            autoNavegou.current = data;
            abrir(turmas[0], true);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [loading, turmas, data]);

    return (
        <Screen title="Selecione a turma" subtitle={`${weekdayLabelPtBr(data)}, ${formatDatePtBr(data)}`} onBack={() => voltar('/inicio')}>
            <ErrorBanner message={error} />
            {loading || turmas.length === 1 ? (
                <Carregando message="Carregando turmas do dia..." />
            ) : turmas.length === 0 ? (
                <EmptyState title="Nenhuma turma encontrada" description="Nenhuma turma com aula prevista nesta data." />
            ) : (
                <SelectableList items={turmas} onSelect={(t) => abrir(t)} emptyLabel="Nenhuma turma com aula prevista nesta data." />
            )}
        </Screen>
    );
}
