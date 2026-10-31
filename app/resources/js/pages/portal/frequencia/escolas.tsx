import { useCallback, useEffect, useRef, useState } from 'react';
import Screen from '@/portal/components/Screen';
import { AppButton, Carregando, ErrorBanner, SelectableList } from '@/portal/components/ui';
import { todayApiDateString } from '@/portal/lib/dateUtils';
import { ir, voltar } from '@/portal/lib/nav';
import * as authService from '@/portal/services/authService';
import { extractErrorMessage } from '@/portal/services/client';
import * as diarioService from '@/portal/services/diarioService';
import type { Escola } from '@/portal/types';

/**
 * Primeiro passo da frequência (EscolaSelectScreen do mobile): escolhe a
 * escola e já resolve a disciplina e as turmas com aula hoje. Com uma só
 * escola, pula direto para a escolha da turma.
 */
export default function FrequenciaEscolas() {
    const [escolas, setEscolas] = useState<Escola[]>([]);
    const [loading, setLoading] = useState(true);
    const [resolvendo, setResolvendo] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const autoNavegou = useRef(false);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            setEscolas(await authService.escolas());
        } catch (err) {
            setError(extractErrorMessage(err, 'Não foi possível carregar as escolas.'));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void load();
    }, [load]);

    const resolverFrequenciaHoje = useCallback(async (escola: Escola, autoNav: boolean) => {
        setResolvendo(true);
        setError(null);
        try {
            const disciplina = (await diarioService.disciplinas(escola.codigo))[0];
            if (!disciplina) {
                setError('Nenhuma disciplina encontrada para esta escola.');
                return;
            }
            ir('/frequencia/turmas', { escola: escola.codigo, data: todayApiDateString() }, { replace: autoNav });
        } catch (err) {
            setError(extractErrorMessage(err, 'Não foi possível carregar a frequência de hoje.'));
        } finally {
            setResolvendo(false);
        }
    }, []);

    useEffect(() => {
        if (!loading && escolas.length === 1 && !autoNavegou.current) {
            autoNavegou.current = true;
            void resolverFrequenciaHoje(escolas[0], true);
        }
    }, [loading, escolas, resolverFrequenciaHoje]);

    const mostrarRetentativa = !loading && !resolvendo && !!error && escolas.length <= 1;

    return (
        <Screen title="Selecione a escola" subtitle="Escolas vinculadas ao seu cadastro" onBack={() => voltar()}>
            <ErrorBanner message={error} />
            {loading || resolvendo ? (
                <Carregando message={loading ? 'Carregando escolas...' : 'Carregando frequência de hoje...'} />
            ) : escolas.length > 1 ? (
                <SelectableList
                    items={escolas}
                    onSelect={(escola) => void resolverFrequenciaHoje(escola, false)}
                    emptyLabel="Nenhuma escola vinculada ao seu usuário."
                />
            ) : null}
            {mostrarRetentativa ? (
                <AppButton label="Tentar novamente" onClick={() => (escolas.length === 1 ? void resolverFrequenciaHoje(escolas[0], true) : void load())} />
            ) : null}
        </Screen>
    );
}
