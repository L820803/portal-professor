import { IdCard } from 'lucide-react';
import { useCallback, useState } from 'react';
import {
    AlertaBadge,
    COR_CLASSIFICACAO,
    NotaSerie,
    ObservacoesBloco,
    ProjecaoNotaBloco,
    paramsUrl,
    subtituloTurma,
    useCarregar,
    useDesempenhoTurma,
    useTurmaParams,
} from '@/portal/components/desempenho';
import Screen from '@/portal/components/Screen';
import { AppButton, Carregando, EmptyState, ErrorBanner } from '@/portal/components/ui';
import {
    alertasDoAluno,
    classificarPeriodo,
    disciplinaDoAluno,
    formatarNota,
    formatarPercentual,
    frequenciaDisciplina,
    rotuloValor,
    serieDisciplina,
    tendenciaSerie,
} from '@/portal/lib/desempenhoIndicadores';
import { ir, numero, voltar } from '@/portal/lib/nav';
import { extractErrorMessage } from '@/portal/services/client';
import * as gestaoSalaService from '@/portal/services/gestaoSalaService';
import type { AlunoDesempenho, DesempenhoTurma, ObservacaoAluno, ObservacoesTurma, ProjecaoNotas, RegenciaDesempenho } from '@/portal/types';

interface Extras {
    projecao: ProjecaoNotas | null;
    observacoes: ObservacoesTurma | null;
    /** Edições feitas nesta tela, por cima do que veio do servidor (chave `regencia|ordem`). */
    edicoes: Record<string, string>;
    onSalvarObservacao: (regencia: number, ordem: number, texto: string) => Promise<void>;
}

function BlocoDisciplina({ dados, regencia, aluno, extras }: { dados: DesempenhoTurma; regencia: RegenciaDesempenho; aluno: AlunoDesempenho; extras: Extras }) {
    const { procedimento } = dados;
    const disc = disciplinaDoAluno(aluno, regencia.codigo);
    if (!disc) {
        return (
            <div className="rounded-2xl bg-sd-surface p-4 shadow-sd-card">
                <p className="text-[17px] font-semibold">{regencia.disciplina}</p>
                <p className="text-sm text-sd-muted">Sem diário nesta disciplina.</p>
            </div>
        );
    }
    const projecaoAluno = extras.projecao?.alunos.find((a) => a.codigo === aluno.codigo);
    const projecaoDisc = projecaoAluno?.disciplinas.find((d) => d.regencia === regencia.codigo);
    const doServidor = extras.observacoes?.alunos.find((a) => a.codigo === aluno.codigo)?.observacoes.filter((o) => o.regencia === regencia.codigo) ?? [];
    const periodosObs = extras.observacoes?.periodos ?? dados.periodos;
    const observacoes: ObservacaoAluno[] = periodosObs.map((p) => {
        const chave = `${regencia.codigo}|${p.ordem}`;
        return {
            regencia: regencia.codigo,
            ordem: p.ordem,
            periodo: p.abreviado,
            texto: chave in extras.edicoes ? extras.edicoes[chave] : (doServidor.find((o) => o.ordem === p.ordem)?.texto ?? ''),
        };
    });
    const freq = frequenciaDisciplina(disc);
    const { tendencia, delta } = tendenciaSerie(serieDisciplina(disc, procedimento), procedimento);
    const freqBaixa = freq.percentual !== null && freq.percentual < procedimento.frequenciaMinima;

    return (
        <div className="rounded-2xl bg-sd-surface p-4 shadow-sd-card sm:p-5">
            <div className="mb-3 flex items-center gap-2">
                {regencia.cor ? <span className="size-3 rounded-full" style={{ backgroundColor: regencia.cor }} /> : null}
                <p className="text-[17px] font-semibold text-sd-text">{regencia.disciplina}</p>
            </div>
            <div className="mb-3 max-w-md">
                <NotaSerie periodos={dados.periodos} disciplina={disc} procedimento={procedimento} />
            </div>
            <div className="mb-3 flex flex-wrap gap-x-6 gap-y-1 text-sm text-sd-muted">
                <p>
                    Frequência:{' '}
                    <span className={freqBaixa ? 'font-bold text-sd-accent-dark' : 'font-bold text-sd-text'}>
                        {freq.percentual === null ? 'sem aulas lançadas' : formatarPercentual(freq.percentual)}
                    </span>
                    {freq.aulas > 0 ? ` (${freq.faltas} falta${freq.faltas === 1 ? '' : 's'} em ${freq.aulas} aula${freq.aulas === 1 ? '' : 's'})` : ''}
                </p>
                {tendencia !== 'insuficiente' && procedimento.forma !== 'PARECER' ? (
                    <p>
                        Tendência:{' '}
                        <span className={tendencia === 'caiu' ? 'font-bold text-sd-danger' : tendencia === 'subiu' ? 'font-bold text-sd-success' : 'font-bold text-sd-text'}>
                            {tendencia === 'caiu' ? 'em queda' : tendencia === 'subiu' ? 'em alta' : 'estável'}
                            {delta !== null && procedimento.forma === 'NOTA' ? ` (${delta > 0 ? '+' : ''}${formatarNota(delta)})` : ''}
                        </span>
                    </p>
                ) : null}
            </div>

            <div className="divide-y divide-sd-border rounded-xl border border-sd-border">
                {dados.periodos.map((periodo) => {
                    const ap = disc.periodos.find((p) => p.ordem === periodo.ordem);
                    const classificacao = classificarPeriodo(ap, procedimento);
                    return (
                        <div key={periodo.ordem} className="px-3 py-2.5">
                            <div className="flex items-center justify-between">
                                <p className="text-[13px] font-semibold text-sd-text">
                                    {periodo.descricao}
                                    {periodo.corrente ? ' · atual' : ''}
                                    {ap?.encerrado ? ' · encerrado' : ''}
                                </p>
                                <p className="text-lg font-extrabold" style={{ color: COR_CLASSIFICACAO[classificacao] }}>
                                    {rotuloValor(ap ?? null, procedimento)}
                                </p>
                            </div>
                            <p className="text-xs text-sd-muted">
                                {ap && ap.aulas && ap.aulas > 0
                                    ? `${ap.faltas ?? 0} falta${ap.faltas === 1 ? '' : 's'} em ${ap.aulas} aula${ap.aulas === 1 ? '' : 's'}`
                                    : 'Sem frequência lançada'}
                                {procedimento.forma === 'PARECER' ? (ap?.temParecer ? ' · parecer registrado' : ' · sem parecer') : ''}
                            </p>
                            {ap && ap.parciais.length > 0 ? (
                                <div className="mt-1.5 flex flex-wrap gap-1.5">
                                    {ap.parciais.map((parcial) => (
                                        <span key={parcial.ordem} className="rounded-full bg-sd-bg px-2 py-0.5 text-xs font-semibold text-sd-muted">
                                            {parcial.ordem}ª avaliação: {parcial.ausencia ? 'ausente' : parcial.nota !== null ? formatarNota(parcial.nota) : (parcial.conceito ?? '—')}
                                        </span>
                                    ))}
                                </div>
                            ) : null}
                        </div>
                    );
                })}
            </div>

            {extras.projecao ? (
                <ProjecaoNotaBloco procedimento={extras.projecao.procedimento} projecao={projecaoDisc} avaliadoPorParecer={projecaoAluno?.avaliadoPorParecer ?? aluno.avaliadoPorParecer} />
            ) : null}
            {extras.observacoes ? (
                <ObservacoesBloco periodos={periodosObs} observacoes={observacoes} onSalvar={(ordem, texto) => extras.onSalvarObservacao(regencia.codigo, ordem, texto)} />
            ) : null}
        </div>
    );
}

/** Boletim individual: por disciplina, notas por período, parciais, faltas, frequência, projeção e observações. */
export default function DesempenhoAluno() {
    const { params, query } = useTurmaParams();
    const codigoAluno = numero(query.get('aluno'));
    const { dados, loading, error, recarregar } = useDesempenhoTurma(params);
    const aluno = dados?.alunos.find((a) => a.codigo === codigoAluno) ?? null;
    const alertas = dados && aluno ? alertasDoAluno(dados, aluno) : [];

    const chave = params ? `${params.escola.codigo}|${params.turma.codigo}|${params.etapa.codigo}` : null;
    const projecao = useCarregar(chave, () => gestaoSalaService.getProjecao(params!.escola.codigo, params!.turma.codigo, params!.etapa.codigo), 'Não foi possível carregar a projeção de notas.');
    const observacoes = useCarregar(chave, () => gestaoSalaService.getObservacoes(params!.escola.codigo, params!.turma.codigo, params!.etapa.codigo), 'Não foi possível carregar as observações.');
    const [edicoes, setEdicoes] = useState<Record<string, string>>({});

    const matricula = aluno?.matricula ?? 0;
    const escolaCodigo = params?.escola.codigo ?? '';
    const onSalvarObservacao = useCallback(
        async (regencia: number, ordem: number, texto: string) => {
            if (!matricula) throw new Error('Matrícula do aluno não encontrada.');
            try {
                const resposta = await gestaoSalaService.salvarObservacao(escolaCodigo, { matricula, regencia, ordem, observacao: texto });
                setEdicoes((atual) => ({ ...atual, [`${regencia}|${ordem}`]: resposta.texto ?? texto }));
            } catch (err) {
                throw new Error(extractErrorMessage(err, 'Não foi possível gravar a observação.'));
            }
        },
        [escolaCodigo, matricula],
    );

    const avisos = [projecao.error, observacoes.error].filter((e): e is string => Boolean(e));

    return (
        <Screen title="Boletim do aluno" subtitle={subtituloTurma(params, dados)} onBack={() => voltar('/inicio')}>
            {loading ? (
                <Carregando message="Carregando boletim..." />
            ) : (
                <div className="space-y-4">
                    {error ? (
                        <>
                            <ErrorBanner message={error} />
                            <AppButton label="Tentar novamente" variant="outline" onClick={recarregar} />
                        </>
                    ) : null}
                    {dados && !aluno ? <EmptyState title="Aluno não encontrado" description="O aluno não está mais na lista desta turma." /> : null}
                    {dados && aluno && params ? (
                        <>
                            <div className="flex flex-col gap-3 rounded-2xl bg-sd-surface p-4 shadow-sd-card sm:flex-row sm:items-start sm:p-5">
                                <div className="flex-1">
                                    <p className="text-[19px] font-bold text-sd-text">{aluno.nome}</p>
                                    <p className="text-sm text-sd-muted">
                                        Cód. {aluno.codigo}
                                        {aluno.situacao ? ` · ${aluno.situacao}` : ''}
                                        {aluno.avaliadoPorParecer ? ' · avaliado por parecer' : ''}
                                    </p>
                                    {alertas.length > 0 ? (
                                        <div className="mt-2 flex flex-wrap gap-1.5">
                                            {alertas.map((a, i) => (
                                                <AlertaBadge key={`${a.tipo}-${a.regencia}-${i}`} tipo={a.tipo} detalhe={a.descricao} />
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="mt-2 text-sm font-semibold text-sd-success">Sem alertas no momento.</p>
                                    )}
                                </div>
                                <AppButton
                                    label={
                                        <>
                                            <IdCard className="size-5" /> Ficha do aluno
                                        </>
                                    }
                                    variant="outline"
                                    size="sm"
                                    onClick={() => ir('/desempenho/ficha', paramsUrl(params, { aluno: aluno.codigo }))}
                                    title="Responsável, matrícula, AEE"
                                />
                            </div>
                            {avisos.map((aviso) => (
                                <ErrorBanner key={aviso} variant="info" message={aviso} />
                            ))}
                            {projecao.loading || observacoes.loading ? <p className="text-sm text-sd-muted">Carregando projeção e observações…</p> : null}
                            <div className="grid gap-4 xl:grid-cols-2">
                                {dados.regencias.map((regencia) => (
                                    <BlocoDisciplina
                                        key={regencia.codigo}
                                        dados={dados}
                                        regencia={regencia}
                                        aluno={aluno}
                                        extras={{ projecao: projecao.dados, observacoes: observacoes.dados, edicoes, onSalvarObservacao }}
                                    />
                                ))}
                            </div>
                        </>
                    ) : null}
                </div>
            )}
        </Screen>
    );
}
