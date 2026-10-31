import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { paramsUrl, subtituloTurma, useCarregar, useTurmaParams } from '@/portal/components/desempenho';
import Screen from '@/portal/components/Screen';
import { AppButton, Carregando, ChipSelect, EmptyState, ErrorBanner, Modal } from '@/portal/components/ui';
import { formatDatePtBr } from '@/portal/lib/dateUtils';
import { formatarPercentual } from '@/portal/lib/desempenhoIndicadores';
import { ir, voltar } from '@/portal/lib/nav';
import * as gestaoSalaService from '@/portal/services/gestaoSalaService';
import type { AlunoFrequenciaDiaria, DiaComAula, FrequenciaDiaria, FrequenciaDiariaDisciplina, RegenciaDesempenho } from '@/portal/types';

/** A partir de quantos dias inteiros seguidos sem vir o aluno entra em destaque vermelho. */
const LIMIAR_FALTAS_SEGUIDAS = 3;
const LETRA_DIA = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
const MES_ABREV = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const NOME_DIA_CURTO = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

type EstadoCelula = 'presente' | 'falta' | 'parcial' | 'semAula' | 'anterior';

const COR_CELULA: Record<EstadoCelula, string> = {
    presente: 'bg-sd-presente',
    falta: 'bg-sd-danger',
    parcial: 'bg-sd-accent',
    semAula: 'bg-sd-bg',
    anterior: 'bg-transparent border border-dashed border-sd-border',
};

const ORDENACOES = [
    { codigo: 1, label: 'Mais dias seguidos' },
    { codigo: 2, label: 'Mais faltas (7 dias)' },
    { codigo: 3, label: 'Menor frequência' },
];

function disciplinaDe(aluno: AlunoFrequenciaDiaria, regencia: number): FrequenciaDiariaDisciplina | undefined {
    return aluno.disciplinas.find((d) => d.regencia === regencia);
}

function estadoCelula(dia: DiaComAula, regencia: number, aluno: AlunoFrequenciaDiaria): EstadoCelula {
    const aulasDia = dia.aulas[String(regencia)] ?? 0;
    if (aulasDia <= 0) return 'semAula';
    if (aluno.dataMatricula && dia.data < aluno.dataMatricula) return 'anterior';
    const falta = disciplinaDe(aluno, regencia)?.datasComFalta.find((f) => f.data === dia.data);
    if (!falta || falta.faltas <= 0) return 'presente';
    const aulas = falta.aulas > 0 ? falta.aulas : aulasDia;
    return falta.faltas >= aulas ? 'falta' : 'parcial';
}

function plural(n: number, singular: string, pluralForm: string): string {
    return `${n} ${n === 1 ? singular : pluralForm}`;
}

function Tile({ numero, rotulo, destaque }: { numero: string | number; rotulo: string; destaque?: string }) {
    return (
        <div className="rounded-xl bg-sd-bg p-3 text-center">
            <p className={cn('text-2xl font-extrabold text-sd-text', destaque)}>{numero}</p>
            <p className="mt-0.5 text-xs font-semibold text-sd-muted">{rotulo}</p>
        </div>
    );
}

function DetalheAluno({
    aluno,
    disc,
    dados,
    regencia,
    onFechar,
    onBoletim,
    onFicha,
}: {
    aluno: AlunoFrequenciaDiaria;
    disc: FrequenciaDiariaDisciplina | undefined;
    dados: FrequenciaDiaria;
    regencia: RegenciaDesempenho;
    onFechar: () => void;
    onBoletim: () => void;
    onFicha: () => void;
}) {
    const porDia = disc?.faltasPorDiaSemana ?? [];
    const maxDia = Math.max(1, ...porDia);
    const diasExibidos = [1, 2, 3, 4, 5, ...(porDia[6] > 0 ? [6] : []), ...(porDia[0] > 0 ? [0] : [])];
    const ultimasFaltas = (disc?.datasComFalta ?? [])
        .slice()
        .sort((a, b) => (a.data < b.data ? 1 : -1))
        .slice(0, 10);
    const abaixo = disc?.percentualFrequencia != null && disc.percentualFrequencia < dados.frequenciaMinima;

    return (
        <Modal
            open
            onClose={onFechar}
            title={aluno.nome}
            description={`${regencia.disciplina}${aluno.situacao ? ` · ${aluno.situacao}` : ''}${aluno.dataMatricula ? ` · matrícula em ${formatDatePtBr(aluno.dataMatricula)}` : ''}`}
            className="max-w-xl"
            footer={
                <>
                    <AppButton label="Boletim" variant="outline" size="sm" onClick={onBoletim} />
                    <AppButton label="Ficha do aluno" size="sm" onClick={onFicha} />
                </>
            }
        >
            {!disc ? (
                <p className="text-sm text-sd-muted">Sem diário nesta disciplina.</p>
            ) : (
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                        <Tile
                            numero={disc.percentualFrequencia === null ? '—' : formatarPercentual(disc.percentualFrequencia)}
                            rotulo={`frequência (mín. ${Math.round(dados.frequenciaMinima)}%)`}
                            destaque={abaixo ? 'text-sd-danger' : undefined}
                        />
                        <Tile numero={disc.faltasConsecutivas} rotulo="dias seguidos sem vir" destaque={disc.faltasConsecutivas >= LIMIAR_FALTAS_SEGUIDAS ? 'text-sd-danger' : undefined} />
                        <Tile numero={disc.faltasUltimos7Dias} rotulo="faltas nos últimos 7 dias" />
                        <Tile numero={`${disc.faltasNotificadas}/${disc.faltas}`} rotulo="faltas avisadas à família" />
                    </div>
                    <p className="text-sm text-sd-text">
                        <b>{plural(disc.faltas, 'falta', 'faltas')}</b> em {plural(disc.aulas, 'aula lançada', 'aulas lançadas')} no intervalo.
                        {disc.faltouNaUltimaAula ? ' Faltou na última aula.' : ' Presente na última aula.'}
                    </p>
                    <p className="text-sm text-sd-text">
                        Última presença: <b>{disc.ultimaPresenca ? formatDatePtBr(disc.ultimaPresenca) : 'nenhuma no intervalo'}</b> · Última falta:{' '}
                        <b>{disc.ultimaFalta ? formatDatePtBr(disc.ultimaFalta) : 'nenhuma'}</b>
                    </p>
                    <div>
                        <p className="mb-2 text-[13px] font-semibold text-sd-muted">Faltas por dia da semana</p>
                        <div className="flex h-32 items-end gap-3">
                            {diasExibidos.map((i) => {
                                const valor = porDia[i] ?? 0;
                                return (
                                    <div key={i} className="flex flex-1 flex-col items-center">
                                        <span className="text-xs font-bold text-sd-text">{valor > 0 ? valor : ''}</span>
                                        <div className="flex h-20 w-full max-w-10 items-end rounded-md bg-sd-bg">
                                            <div
                                                className={cn('w-full rounded-md', valor === maxDia && valor > 0 ? 'bg-sd-danger' : 'bg-sd-primary-light')}
                                                style={{ height: `${Math.round((valor / maxDia) * 100)}%` }}
                                            />
                                        </div>
                                        <span className="mt-1 text-xs text-sd-muted">{NOME_DIA_CURTO[i]}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                    <div>
                        <p className="mb-1 text-[13px] font-semibold text-sd-muted">
                            Datas com falta{ultimasFaltas.length < disc.datasComFalta.length ? ' (10 mais recentes)' : ''}
                        </p>
                        {ultimasFaltas.length === 0 ? (
                            <p className="text-sm text-sd-muted">Nenhuma falta no intervalo.</p>
                        ) : (
                            <ul className="divide-y divide-sd-border">
                                {ultimasFaltas.map((f) => (
                                    <li key={f.data} className="flex justify-between py-1.5 text-sm">
                                        <span className="font-semibold">
                                            {formatDatePtBr(f.data)} · {NOME_DIA_CURTO[new Date(`${f.data}T12:00:00`).getDay()]}
                                        </span>
                                        <span className="text-sd-muted">
                                            {f.aulas > 0 && f.faltas < f.aulas ? `${f.faltas} de ${f.aulas} aulas` : 'dia inteiro'}
                                            {f.notificadas > 0 ? ' · avisada' : ''}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            )}
        </Modal>
    );
}

/**
 * Card "Quem está faltando": mapa aluno × dia das faltas do período
 * corrente, com faltas seguidas, últimos 7 dias e detalhes por aluno.
 */
export default function FrequenciaDiariaPage() {
    const { params } = useTurmaParams();
    const { dados, loading, error, recarregar } = useCarregar(
        params ? `${params.escola.codigo}|${params.turma.codigo}|${params.etapa.codigo}` : null,
        () => gestaoSalaService.getFrequenciaDiaria(params!.escola.codigo, params!.turma.codigo, params!.etapa.codigo),
        'Não foi possível carregar a frequência diária da turma.',
    );
    const [regenciaCodigo, setRegenciaCodigo] = useState<number | null>(null);
    const [ordenacao, setOrdenacao] = useState<number | null>(1);
    const [mostrarInativos, setMostrarInativos] = useState(false);
    const [selecionado, setSelecionado] = useState<AlunoFrequenciaDiaria | null>(null);

    const regencia = dados?.regencias.find((r) => r.codigo === regenciaCodigo) ?? dados?.regencias[0] ?? null;

    const dias = useMemo(() => (dados && regencia ? dados.dias.filter((d) => (d.aulas[String(regencia.codigo)] ?? 0) > 0) : []), [dados, regencia]);

    const alunos = useMemo(() => {
        if (!dados || !regencia) return [];
        const porNome = (a: AlunoFrequenciaDiaria, b: AlunoFrequenciaDiaria) => a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' });
        return dados.alunos
            .filter((a) => mostrarInativos || a.ativo)
            .slice()
            .sort((a, b) => {
                const da = disciplinaDe(a, regencia.codigo);
                const db = disciplinaDe(b, regencia.codigo);
                if (ordenacao === 1) return (db?.faltasConsecutivas ?? 0) - (da?.faltasConsecutivas ?? 0) || porNome(a, b);
                if (ordenacao === 2) return (db?.faltasUltimos7Dias ?? 0) - (da?.faltasUltimos7Dias ?? 0) || porNome(a, b);
                if (ordenacao === 3) return (da?.percentualFrequencia ?? Infinity) - (db?.percentualFrequencia ?? Infinity) || porNome(a, b);
                return porNome(a, b);
            });
    }, [dados, regencia, ordenacao, mostrarInativos]);

    const resumo = useMemo(() => {
        if (!dados || !regencia) return null;
        const ativos = dados.alunos.filter((a) => a.ativo);
        let ultimaAula = 0;
        let seguidas = 0;
        let abaixo = 0;
        ativos.forEach((a) => {
            const d = disciplinaDe(a, regencia.codigo);
            if (!d) return;
            if (d.faltouNaUltimaAula) ultimaAula += 1;
            if (d.faltasConsecutivas >= LIMIAR_FALTAS_SEGUIDAS) seguidas += 1;
            if (d.percentualFrequencia !== null && d.percentualFrequencia < dados.frequenciaMinima) abaixo += 1;
        });
        return { ativos: ativos.length, ultimaAula, seguidas, abaixo, inativos: dados.alunos.length - ativos.length };
    }, [dados, regencia]);

    function abrir(caminho: string, aluno: AlunoFrequenciaDiaria) {
        setSelecionado(null);
        if (params) ir(caminho, paramsUrl(params, { aluno: aluno.codigo }));
    }

    return (
        <Screen title="Quem está faltando" subtitle={subtituloTurma(params, dados)} onBack={() => voltar('/inicio')}>
            {loading ? (
                <Carregando message="Carregando frequência da turma..." />
            ) : (
                <div className="space-y-4">
                    {error ? (
                        <>
                            <ErrorBanner message={error} />
                            <AppButton label="Tentar novamente" variant="outline" onClick={recarregar} />
                        </>
                    ) : null}
                    {dados && !regencia ? (
                        <EmptyState title="Nenhuma disciplina sua nesta turma" description="O e-cidade não encontrou regência do seu cadastro nesta turma e etapa." />
                    ) : null}
                    {dados && regencia && resumo ? (
                        <>
                            {dados.regencias.length > 1 ? (
                                <div>
                                    <p className="mb-1.5 text-[13px] font-semibold text-sd-muted">Disciplina</p>
                                    <ChipSelect
                                        options={dados.regencias.map((r) => ({ codigo: r.codigo, label: r.disciplina, cor: r.cor }))}
                                        selected={regencia.codigo}
                                        onSelect={(c) => setRegenciaCodigo(c ?? dados.regencias[0].codigo)}
                                        obrigatorio
                                    />
                                </div>
                            ) : null}

                            <div className="rounded-2xl bg-sd-surface p-4 shadow-sd-card">
                                <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                                    <Tile
                                        numero={resumo.ultimaAula}
                                        rotulo={`faltaram na última aula${dados.resumo.ultimaAulaLancada ? ` (${formatDatePtBr(dados.resumo.ultimaAulaLancada).slice(0, 5)})` : ''}`}
                                        destaque={resumo.ultimaAula > 0 ? 'text-sd-accent-dark' : undefined}
                                    />
                                    <Tile numero={resumo.seguidas} rotulo={`${LIMIAR_FALTAS_SEGUIDAS}+ dias seguidos sem vir`} destaque={resumo.seguidas > 0 ? 'text-sd-danger' : undefined} />
                                    <Tile
                                        numero={resumo.abaixo}
                                        rotulo={`abaixo de ${Math.round(dados.frequenciaMinima)}% no intervalo`}
                                        destaque={resumo.abaixo > 0 ? 'text-sd-accent-dark' : undefined}
                                    />
                                    <Tile numero={resumo.ativos} rotulo="alunos ativos" />
                                </div>
                                <p className="mt-3 text-xs text-sd-muted">
                                    {dados.periodo ? `${dados.periodo.descricao} · ` : ''}
                                    {formatDatePtBr(dados.intervalo.inicio)} a {formatDatePtBr(dados.intervalo.fim)} · {plural(dias.length, 'dia com aula sua', 'dias com aula sua')}
                                </p>
                            </div>

                            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                                <div>
                                    <p className="mb-1.5 text-[13px] font-semibold text-sd-muted">Ordenar por</p>
                                    <ChipSelect options={ORDENACOES} selected={ordenacao} onSelect={setOrdenacao} />
                                </div>
                                <div className="flex flex-wrap gap-3 text-xs text-sd-muted">
                                    {(
                                        [
                                            ['presente', 'presente'],
                                            ['falta', 'faltou o dia'],
                                            ['parcial', 'faltou parte'],
                                            ['semAula', 'sem aula sua'],
                                        ] as const
                                    ).map(([estado, rotulo]) => (
                                        <span key={estado} className="inline-flex items-center gap-1.5">
                                            <span className={cn('size-3.5 rounded', COR_CELULA[estado], estado === 'semAula' && 'border border-sd-border')} />
                                            {rotulo}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {dias.length === 0 ? (
                                <EmptyState title="Nenhuma chamada lançada" description='Ainda não há frequência lançada nesta disciplina no intervalo. Lance pelo card "Frequência".' />
                            ) : alunos.length === 0 ? (
                                <EmptyState title="Nenhum aluno ativo" description='Ative "Mostrar inativos" para ver transferidos e remanejados.' />
                            ) : (
                                <div className="w-fit max-w-full overflow-x-auto rounded-2xl bg-sd-surface shadow-sd-card">
                                    <table className="border-separate border-spacing-0">
                                        <thead>
                                            <tr>
                                                <th className="sticky left-0 z-10 min-w-56 border-b border-sd-border bg-sd-surface px-3 py-2 text-left text-xs font-bold text-sd-muted">Aluno</th>
                                                {dias.map((dia, i) => {
                                                    const [, mes, diaNum] = dia.data.split('-');
                                                    const mostrarMes = i === 0 || dia.data.slice(5, 7) !== dias[i - 1].data.slice(5, 7);
                                                    return (
                                                        <th key={dia.data} className="border-b border-sd-border px-0.5 py-1 text-center font-normal" title={formatDatePtBr(dia.data)}>
                                                            <span className="block h-3 text-[9px] text-sd-muted">{mostrarMes ? MES_ABREV[Number(mes) - 1] : ''}</span>
                                                            <span className="block text-[10px] text-sd-muted">{LETRA_DIA[dia.diaSemana]}</span>
                                                            <span className="block text-[11px] font-bold text-sd-text">{diaNum}</span>
                                                        </th>
                                                    );
                                                })}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {alunos.map((aluno) => {
                                                const disc = disciplinaDe(aluno, regencia.codigo);
                                                const alerta =
                                                    (disc?.faltasConsecutivas ?? 0) >= LIMIAR_FALTAS_SEGUIDAS
                                                        ? 'font-bold text-sd-danger'
                                                        : disc?.percentualFrequencia != null && disc.percentualFrequencia < dados.frequenciaMinima
                                                          ? 'font-bold text-sd-accent-dark'
                                                          : 'text-sd-muted';
                                                return (
                                                    <tr key={aluno.matricula || aluno.codigo} onClick={() => setSelecionado(aluno)} className="group cursor-pointer">
                                                        <td className="sticky left-0 z-10 border-b border-sd-border bg-sd-surface px-3 py-1.5 group-hover:bg-sd-primary-soft">
                                                            <span className={cn('block max-w-56 truncate text-xs font-semibold', aluno.ativo ? 'text-sd-text' : 'text-sd-disabled line-through')}>
                                                                {aluno.nome}
                                                            </span>
                                                            <span className={cn('block text-[11px]', alerta)}>
                                                                {disc
                                                                    ? `${disc.faltasConsecutivas > 0 ? `${disc.faltasConsecutivas}d seguidos · ` : ''}${
                                                                          disc.percentualFrequencia === null ? '—' : formatarPercentual(disc.percentualFrequencia)
                                                                      }`
                                                                    : 'sem diário'}
                                                            </span>
                                                        </td>
                                                        {dias.map((dia) => (
                                                            <td key={dia.data} className="border-b border-sd-border px-0.5 py-1.5 group-hover:bg-sd-primary-soft/50">
                                                                <span className={cn('mx-auto block size-5 rounded', COR_CELULA[estadoCelula(dia, regencia.codigo, aluno)])} />
                                                            </td>
                                                        ))}
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {resumo.inativos > 0 ? (
                                <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl bg-sd-surface px-4 py-3 shadow-sd-card">
                                    <span className="text-sm text-sd-text">
                                        Mostrar inativos ({plural(resumo.inativos, 'aluno transferido/remanejado', 'alunos transferidos/remanejados')})
                                    </span>
                                    <input
                                        type="checkbox"
                                        checked={mostrarInativos}
                                        onChange={(e) => setMostrarInativos(e.target.checked)}
                                        className="size-5 accent-sd-primary-light"
                                    />
                                </label>
                            ) : null}
                            <p className="text-xs text-sd-muted">
                                "Dias seguidos" conta os dias inteiros sem comparecer, da última chamada para trás. Datas anteriores à matrícula do aluno não contam. Clique no
                                aluno para ver os detalhes.
                            </p>
                        </>
                    ) : null}
                </div>
            )}
            {selecionado && dados && regencia ? (
                <DetalheAluno
                    aluno={selecionado}
                    disc={disciplinaDe(selecionado, regencia.codigo)}
                    dados={dados}
                    regencia={regencia}
                    onFechar={() => setSelecionado(null)}
                    onBoletim={() => abrir('/desempenho/aluno', selecionado)}
                    onFicha={() => abrir('/desempenho/ficha', selecionado)}
                />
            ) : null}
        </Screen>
    );
}
