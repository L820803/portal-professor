import { CalendarDays, ChevronDown, ChevronUp } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppAlert } from '@/portal/components/AppAlert';
import Calendario from '@/portal/components/Calendario';
import Screen from '@/portal/components/Screen';
import StudentRow from '@/portal/components/StudentRow';
import { AppButton, Carregando, EmptyState, ErrorBanner } from '@/portal/components/ui';
import { formatDatePtBr, todayApiDateString, weekdayLabelPtBr } from '@/portal/lib/dateUtils';
import { ir, useQuery, voltar } from '@/portal/lib/nav';
import * as authService from '@/portal/services/authService';
import { extractErrorMessage } from '@/portal/services/client';
import * as diarioService from '@/portal/services/diarioService';
import type { Aluno, DiaLetivo, Disciplina, Escola, Regencia, SalvarDiarioPayload } from '@/portal/types';

/**
 * Chamada da turma (FrequenciaScreen do mobile): todos começam presentes,
 * clicar marca falta (por aula, quando há mais de uma no dia). A data troca
 * pelo calendário, só entre os dias letivos da turma.
 */
export default function FrequenciaLancamento() {
    const query = useQuery();
    const escolaCodigo = query.get('escola') ?? '';
    const turmaCodigo = query.get('turma') ?? '';
    const data = query.get('data') ?? todayApiDateString();

    const [escola, setEscola] = useState<Escola | null>(null);
    const [disciplina, setDisciplina] = useState<Disciplina | null>(null);
    const [diasLetivos, setDiasLetivos] = useState<DiaLetivo[]>([]);
    const [alunos, setAlunos] = useState<Aluno[]>([]);
    const [regencias, setRegencias] = useState<Regencia[]>([]);
    const [faltasPorAluno, setFaltasPorAluno] = useState<Record<number, Set<number>>>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [calendarioAberto, setCalendarioAberto] = useState(false);

    // Contexto (escola, disciplina e dias letivos) — muda só com a escola.
    useEffect(() => {
        let ativo = true;
        (async () => {
            try {
                const [escolas, disciplinas] = await Promise.all([authService.escolas(), diarioService.disciplinas(escolaCodigo)]);
                if (!ativo) return;
                setEscola(escolas.find((e) => e.codigo === escolaCodigo) ?? null);
                const disc = disciplinas[0] ?? null;
                setDisciplina(disc);
                if (disc) {
                    const dias = await diarioService.diasLetivos(escolaCodigo, disc.codigo);
                    if (ativo) setDiasLetivos(dias);
                }
            } catch (err) {
                if (ativo) setError(extractErrorMessage(err, 'Não foi possível carregar a turma.'));
            }
        })();
        return () => {
            ativo = false;
        };
    }, [escolaCodigo]);

    const load = useCallback(async () => {
        // A API real pede a disciplina junto; espera o contexto carregar.
        if (!escolaCodigo || !turmaCodigo || !disciplina) return;
        setLoading(true);
        setError(null);
        try {
            const result = await diarioService.alunosTurma(escolaCodigo, data, disciplina.codigo, turmaCodigo);
            setAlunos(result.alunos);
            setRegencias(result.regencias);
            const iniciais: Record<number, Set<number>> = {};
            result.alunos.forEach((aluno) => {
                iniciais[aluno.codigo] = new Set(aluno.faltasLancadas ?? []);
            });
            setFaltasPorAluno(iniciais);
        } catch (err) {
            setError(extractErrorMessage(err, 'Não foi possível carregar a lista de alunos.'));
        } finally {
            setLoading(false);
        }
    }, [escolaCodigo, turmaCodigo, data, disciplina]);

    useEffect(() => {
        void load();
    }, [load]);

    const turmaNome = useMemo(() => {
        for (const dia of diasLetivos) {
            const t = dia.turmas.find((x) => x.codigo === turmaCodigo);
            if (t) return t.nome;
        }
        return 'Frequência';
    }, [diasLetivos, turmaCodigo]);

    const diasDaTurma = useMemo(
        () => new Set(diasLetivos.filter((d) => d.turmas.some((t) => t.codigo === turmaCodigo)).map((d) => d.data)),
        [diasLetivos, turmaCodigo],
    );

    function handleDayPress(novaData: string) {
        setCalendarioAberto(false);
        if (novaData !== data) ir('/frequencia/lancamento', { escola: escolaCodigo, turma: turmaCodigo, data: novaData }, { replace: true });
    }

    function toggleRegencia(alunoCodigo: number, regenciaCodigo: number) {
        if (alunos.find((a) => a.codigo === alunoCodigo)?.bloqueioFalta) return;
        setFaltasPorAluno((prev) => {
            const atual = new Set(prev[alunoCodigo] ?? []);
            if (atual.has(regenciaCodigo)) atual.delete(regenciaCodigo);
            else atual.add(regenciaCodigo);
            return { ...prev, [alunoCodigo]: atual };
        });
    }

    // Alunos com `bloqueioFalta` mantêm o estado já lançado e ficam fora das ações em massa.
    function marcarTodosPresentes() {
        setFaltasPorAluno((prev) => {
            const next = { ...prev };
            alunos.forEach((a) => {
                if (!a.bloqueioFalta) next[a.codigo] = new Set();
            });
            return next;
        });
    }

    function desmarcarTodos() {
        const todos = regencias.map((r) => r.codigo);
        setFaltasPorAluno((prev) => {
            const next = { ...prev };
            alunos.forEach((a) => {
                if (!a.bloqueioFalta) next[a.codigo] = new Set(todos);
            });
            return next;
        });
    }

    const totalAlunosAtivos = alunos.filter((a) => !a.bloqueioFalta).length;
    const totalPresentes = alunos.filter((a) => !a.bloqueioFalta && (faltasPorAluno[a.codigo]?.size ?? 0) === 0).length;
    const faltosos = totalAlunosAtivos - totalPresentes;

    async function handleSincronizarAcesso() {
        setSyncing(true);
        setError(null);
        try {
            const resposta = await diarioService.sincronizarAcesso(escolaCodigo);
            await load();
            AppAlert.info('Catraca sincronizada', resposta.mensagem);
        } catch (err) {
            setError(extractErrorMessage(err, 'Não foi possível sincronizar a catraca.'));
        } finally {
            setSyncing(false);
        }
    }

    function handleSalvarPress() {
        AppAlert.confirm({
            title: 'Confirmar lançamento',
            message: `${totalPresentes} presente(s) e ${faltosos} falta(s) serão registrados para ${formatDatePtBr(data)}.\n\nDeseja salvar?`,
            cancelText: 'Revisar',
            confirmText: 'Salvar',
            onConfirm: handleSalvarConfirmado,
        });
    }

    async function handleSalvarConfirmado() {
        setSaving(true);
        setError(null);
        try {
            const payload: SalvarDiarioPayload = {
                data,
                regencias: regencias.map((r) => r.codigo),
                alunos: alunos.map((a) => ({ codigo: a.codigo, faltas: Array.from(faltasPorAluno[a.codigo] ?? []) })),
            };
            await diarioService.salvar(escolaCodigo, payload, turmaCodigo);
            AppAlert.success('Frequência salva', 'O lançamento foi registrado com sucesso.', [
                { text: 'Continuar aqui', style: 'cancel' },
                { text: 'Lançar outra turma', onPress: () => ir('/frequencia/turmas', { escola: escolaCodigo, data }) },
            ]);
        } catch (err) {
            setError(extractErrorMessage(err, 'Não foi possível salvar a frequência.'));
        } finally {
            setSaving(false);
        }
    }

    if (!escolaCodigo || !turmaCodigo) {
        return (
            <Screen title="Frequência" onBack={() => voltar('/frequencia')}>
                <EmptyState title="Contexto incompleto" description="Volte e selecione a turma novamente." />
            </Screen>
        );
    }

    return (
        <Screen
            title={turmaNome}
            subtitle={`${escola?.nome ?? ''}${disciplina ? ` · ${disciplina.nome}` : ''} · ${formatDatePtBr(data)}`}
            onBack={() => voltar(`/frequencia/turmas?escola=${escolaCodigo}&data=${data}`)}
            semRodape
            bottomBar={
                !loading && alunos.length > 0 ? (
                    <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-sm text-sd-muted">
                            <span className="font-bold text-sd-success">{totalPresentes} presente(s)</span> ·{' '}
                            <span className="font-bold text-sd-danger">{faltosos} falta(s)</span>
                        </p>
                        <AppButton label={saving ? 'Salvando...' : '✓  Salvar frequência'} onClick={handleSalvarPress} loading={saving} className="sm:min-w-64" />
                    </div>
                ) : null
            }
        >
            <ErrorBanner message={error} />

            <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-start">
                <div className="lg:w-80">
                    <button
                        type="button"
                        onClick={() => setCalendarioAberto((v) => !v)}
                        className="flex w-full items-center gap-3 rounded-xl border border-sd-border bg-sd-surface px-4 py-3 text-left shadow-sd-card hover:border-sd-primary-light"
                        aria-expanded={calendarioAberto}
                    >
                        <CalendarDays className="size-5 text-sd-primary" />
                        <span className="flex-1">
                            <span className="block text-base font-semibold text-sd-text">{formatDatePtBr(data)}</span>
                            <span className="block text-xs text-sd-muted">{weekdayLabelPtBr(data)} · clique para trocar a data</span>
                        </span>
                        {calendarioAberto ? <ChevronUp className="size-4 text-sd-muted" /> : <ChevronDown className="size-4 text-sd-muted" />}
                    </button>
                    {calendarioAberto ? (
                        <div className="mt-2">
                            <Calendario selecionado={data} onSelect={handleDayPress} habilitados={diasDaTurma} />
                            <p className="mt-2 text-xs text-sd-muted">Dias em azul têm aula desta turma. Datas futuras ficam travadas.</p>
                        </div>
                    ) : null}
                </div>

                <div className="flex flex-1 flex-col gap-3">
                    <div className="flex flex-wrap gap-2">
                        <AppButton label="Marcar todos" variant="outline" size="sm" onClick={marcarTodosPresentes} className="flex-1 sm:flex-none" />
                        <AppButton label="Desmarcar" variant="outline" size="sm" onClick={desmarcarTodos} className="flex-1 sm:flex-none" />
                        <AppButton label="Sincronizar" variant="outline" size="sm" onClick={handleSincronizarAcesso} loading={syncing} className="flex-1 sm:flex-none" />
                    </div>
                    <p className="text-sm text-sd-muted">
                        {totalAlunosAtivos} aluno(s) · {totalPresentes} presente(s)
                        {regencias.length > 1 ? ` · ${regencias.length} aulas no dia: marque a falta em cada uma` : ''}
                    </p>
                </div>
            </div>

            {loading ? (
                <Carregando message="Carregando alunos..." />
            ) : alunos.length === 0 && !error ? (
                <EmptyState title="Nenhum aluno encontrado" description="Esta turma não possui alunos na grade." />
            ) : (
                <div className="grid gap-2 lg:grid-cols-2">
                    {alunos.map((aluno) => (
                        <StudentRow
                            key={aluno.codigo}
                            codigo={aluno.codigo}
                            nome={aluno.nome}
                            situacao={aluno.situacao}
                            bloqueado={aluno.bloqueioFalta}
                            regencias={regencias}
                            faltas={faltasPorAluno[aluno.codigo] ?? new Set()}
                            onToggleRegencia={(r) => toggleRegencia(aluno.codigo, r)}
                        />
                    ))}
                </div>
            )}
        </Screen>
    );
}
