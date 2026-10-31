import { useState } from 'react';
import { cn } from '@/lib/utils';
import { COR_CLASSIFICACAO, DesempenhoShell, paramsUrl } from '@/portal/components/desempenho';
import { ChipSelect } from '@/portal/components/ui';
import {
    aproveitamentoDoPeriodo,
    classificarPeriodo,
    disciplinaDoAluno,
    formatarNota,
    formatarPercentual,
    frequenciaDisciplina,
    periodoReferencia,
    resumoPeriodoTurma,
    rotuloValor,
} from '@/portal/lib/desempenhoIndicadores';
import { ir } from '@/portal/lib/nav';

function Tile({ valor, rotulo, cor }: { valor: string; rotulo: string; cor: string }) {
    return (
        <div className="rounded-xl bg-sd-surface p-4 text-center shadow-sd-card">
            <p className="text-3xl font-extrabold" style={{ color: cor }}>
                {valor}
            </p>
            <p className="mt-1 text-xs font-semibold text-sd-muted">{rotulo}</p>
        </div>
    );
}

/**
 * Card "Relatório da turma": totais do período, a mesma leitura para todos
 * os períodos e a lista de alunos com o valor do período e a frequência.
 */
export default function DesempenhoRelatorio() {
    const [periodoOrdem, setPeriodoOrdem] = useState<number | null>(null);

    return (
        <DesempenhoShell title="Relatório da turma">
            {(dados, regencia, params) => {
                const { procedimento } = dados;
                const parecer = procedimento.forma === 'PARECER';
                const periodo = dados.periodos.find((p) => p.ordem === periodoOrdem) ?? periodoReferencia(dados, regencia.codigo);
                if (!periodo) return <p className="text-sm text-sd-muted">A turma não tem períodos de avaliação configurados no e-cidade.</p>;
                const resumo = resumoPeriodoTurma(dados, regencia.codigo, periodo.ordem);
                const alunos = dados.alunos.filter((a) => a.ativo);
                const inativos = dados.alunos.length - alunos.length;
                const cel = 'px-3 py-2 text-center text-sm';

                return (
                    <div className="space-y-5">
                        <div>
                            <p className="mb-1.5 text-[13px] font-semibold text-sd-muted">Período</p>
                            <ChipSelect
                                options={dados.periodos.map((p) => ({ codigo: p.ordem, label: p.corrente ? `${p.abreviado} (atual)` : p.abreviado }))}
                                selected={periodo.ordem}
                                onSelect={(c) => setPeriodoOrdem(c ?? periodo.ordem)}
                                obrigatorio
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                            <Tile valor={String(resumo.acima)} rotulo={parecer ? 'Com parecer' : 'Atingiram o mínimo'} cor={COR_CLASSIFICACAO.acima} />
                            {parecer ? null : <Tile valor={String(resumo.abaixo)} rotulo="Abaixo do mínimo" cor={COR_CLASSIFICACAO.abaixo} />}
                            <Tile valor={String(resumo.sem)} rotulo={parecer ? 'Sem parecer' : 'Sem lançamento'} cor="#686C65" />
                            {resumo.media !== null ? <Tile valor={formatarNota(resumo.media)} rotulo="Média da turma" cor="#1F4A3D" /> : null}
                            {resumo.frequenciaMedia !== null ? <Tile valor={formatarPercentual(resumo.frequenciaMedia)} rotulo="Frequência média" cor="#1F4A3D" /> : null}
                        </div>

                        <p className="text-[13px] text-sd-muted">
                            {resumo.total} aluno{resumo.total === 1 ? '' : 's'} ativo{resumo.total === 1 ? '' : 's'}
                            {inativos > 0 ? ` (${inativos} fora da contagem: transferidos, remanejados etc.)` : ''}
                            {procedimento.forma === 'NOTA' && procedimento.minimo !== null
                                ? ` · mínimo ${formatarNota(procedimento.minimo)}`
                                : procedimento.forma === 'NIVEL' && procedimento.minimoConceito
                                  ? ` · mínimo ${procedimento.minimoConceito}`
                                  : ''}
                            {` · frequência mínima ${formatarPercentual(procedimento.frequenciaMinima)}`}
                        </p>

                        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] lg:items-start">
                            {dados.periodos.length > 1 ? (
                                <div className="overflow-hidden rounded-xl bg-sd-surface shadow-sd-card">
                                    <p className="border-b border-sd-border px-4 py-3 text-[13px] font-semibold text-sd-muted">Todos os períodos</p>
                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead>
                                                <tr className="bg-sd-bg text-xs font-bold text-sd-muted">
                                                    <th className="px-3 py-2 text-left">Período</th>
                                                    <th className={cel} style={{ color: COR_CLASSIFICACAO.acima }}>
                                                        {parecer ? 'Com' : 'Acima'}
                                                    </th>
                                                    {parecer ? null : (
                                                        <th className={cel} style={{ color: COR_CLASSIFICACAO.abaixo }}>
                                                            Abaixo
                                                        </th>
                                                    )}
                                                    <th className={cel}>{parecer ? 'Sem' : 'Sem lanç.'}</th>
                                                    {procedimento.forma === 'NOTA' ? <th className={cel}>Média</th> : null}
                                                    <th className={cel}>Freq.</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {dados.periodos.map((p) => {
                                                    const r = resumoPeriodoTurma(dados, regencia.codigo, p.ordem);
                                                    return (
                                                        <tr
                                                            key={p.ordem}
                                                            onClick={() => setPeriodoOrdem(p.ordem)}
                                                            className={cn('cursor-pointer border-t border-sd-border hover:bg-sd-bg', p.ordem === periodo.ordem && 'bg-sd-primary-soft')}
                                                        >
                                                            <td className="px-3 py-2 text-sm font-semibold">{p.abreviado}</td>
                                                            <td className={cel}>{r.acima}</td>
                                                            {parecer ? null : <td className={cel}>{r.abaixo}</td>}
                                                            <td className={cel}>{r.sem}</td>
                                                            {procedimento.forma === 'NOTA' ? <td className={cel}>{r.media === null ? '—' : formatarNota(r.media)}</td> : null}
                                                            <td className={cel}>{r.frequenciaMedia === null ? '—' : formatarPercentual(r.frequenciaMedia)}</td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            ) : null}

                            <div>
                                <p className="mb-2 text-[13px] font-semibold text-sd-muted">Alunos — {periodo.descricao}</p>
                                <div className="space-y-2">
                                    {alunos.map((aluno) => {
                                        const disc = disciplinaDoAluno(aluno, regencia.codigo);
                                        const ap = aproveitamentoDoPeriodo(disc, periodo.ordem);
                                        const classificacao = classificarPeriodo(ap, procedimento);
                                        const freq = disc ? frequenciaDisciplina(disc) : null;
                                        const freqBaixa = freq?.percentual != null && freq.percentual < procedimento.frequenciaMinima;
                                        return (
                                            <button
                                                key={aluno.matricula || aluno.codigo}
                                                type="button"
                                                onClick={() => ir('/desempenho/aluno', paramsUrl(params, { aluno: aluno.codigo }))}
                                                className="flex w-full items-center gap-3 rounded-xl bg-sd-surface p-3 text-left shadow-sd-card transition hover:shadow-sd-hover"
                                            >
                                                <span className="h-10 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: COR_CLASSIFICACAO[classificacao] }} />
                                                <span className="min-w-0 flex-1">
                                                    <span className="block text-[13px] font-semibold text-sd-text">{aluno.nome}</span>
                                                    <span className={cn('block text-xs', freqBaixa ? 'font-semibold text-sd-accent-dark' : 'text-sd-muted')}>
                                                        {freq?.percentual == null
                                                            ? 'Frequência: sem aulas lançadas'
                                                            : `Frequência ${formatarPercentual(freq.percentual)} · ${freq.faltas} falta${freq.faltas === 1 ? '' : 's'} em ${freq.aulas} aula${freq.aulas === 1 ? '' : 's'}`}
                                                    </span>
                                                </span>
                                                <span className="text-lg font-extrabold" style={{ color: COR_CLASSIFICACAO[classificacao] }}>
                                                    {rotuloValor(ap ?? null, procedimento)}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                );
            }}
        </DesempenhoShell>
    );
}
