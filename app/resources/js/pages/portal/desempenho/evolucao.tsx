import { cn } from '@/lib/utils';
import { DesempenhoShell, NotaSerie, paramsUrl } from '@/portal/components/desempenho';
import { EmptyState } from '@/portal/components/ui';
import { disciplinaDoAluno, formatarNota, serieDisciplina, tendenciaSerie } from '@/portal/lib/desempenhoIndicadores';
import type { Tendencia } from '@/portal/lib/desempenhoIndicadores';
import { ir } from '@/portal/lib/nav';

const TENDENCIA: Record<Tendencia, { icone: string; classe: string; rotulo: string }> = {
    subiu: { icone: '↗', classe: 'text-sd-success', rotulo: 'Subiu' },
    caiu: { icone: '↘', classe: 'text-sd-danger', rotulo: 'Caiu' },
    estavel: { icone: '→', classe: 'text-sd-muted', rotulo: 'Estável' },
    insuficiente: { icone: '·', classe: 'text-sd-disabled', rotulo: 'Aguardando' },
};

/**
 * Card "Evolução das notas": um aluno por cartão com a nota (ou conceito)
 * de cada período e a tendência entre os dois últimos períodos lançados.
 */
export default function DesempenhoEvolucao() {
    return (
        <DesempenhoShell title="Evolução das notas" hint="Barras verdes atingiram o mínimo; vermelhas não. A seta compara os dois últimos períodos lançados.">
            {(dados, regencia, params) => {
                const alunos = [...dados.alunos.filter((a) => a.ativo), ...dados.alunos.filter((a) => !a.ativo)];
                if (alunos.length === 0) return <EmptyState title="Turma sem alunos" description="Nenhuma matrícula encontrada nesta turma e etapa." />;
                return (
                    <>
                        {dados.procedimento.forma === 'PARECER' ? (
                            <p className="mb-3 rounded-xl bg-sd-primary-soft px-4 py-2.5 text-sm text-sd-primary">
                                Turma avaliada por parecer descritivo: as barras mostram em quais períodos o parecer já foi escrito — não há nota nem mínimo.
                            </p>
                        ) : null}
                        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                            {alunos.map((aluno) => {
                                const disc = disciplinaDoAluno(aluno, regencia.codigo);
                                const serie = disc ? serieDisciplina(disc, dados.procedimento) : [];
                                const { tendencia, delta } = tendenciaSerie(serie, dados.procedimento);
                                const info = TENDENCIA[tendencia];
                                const deltaTexto =
                                    delta !== null && dados.procedimento.forma === 'NOTA' && tendencia !== 'estavel' ? ` ${delta > 0 ? '+' : ''}${formatarNota(delta)}` : '';
                                return (
                                    <button
                                        key={aluno.matricula || aluno.codigo}
                                        type="button"
                                        onClick={() => ir('/desempenho/aluno', paramsUrl(params, { aluno: aluno.codigo }))}
                                        className={cn(
                                            'rounded-xl bg-sd-surface p-4 text-left shadow-sd-card transition hover:shadow-sd-hover',
                                            !aluno.ativo && 'opacity-60',
                                        )}
                                    >
                                        <div className="mb-3 flex items-start justify-between gap-2">
                                            <div className="min-w-0">
                                                <p className="text-[13px] font-semibold text-sd-text">{aluno.nome}</p>
                                                {!aluno.ativo && aluno.situacao ? <p className="text-xs font-semibold text-sd-danger">{aluno.situacao}</p> : null}
                                            </div>
                                            <div className={cn('flex shrink-0 items-center gap-1 text-sm font-bold', info.classe)}>
                                                <span className="text-xl leading-none">{info.icone}</span>
                                                {info.rotulo}
                                                {deltaTexto}
                                            </div>
                                        </div>
                                        <NotaSerie periodos={dados.periodos} disciplina={disc} procedimento={dados.procedimento} compact />
                                    </button>
                                );
                            })}
                        </div>
                    </>
                );
            }}
        </DesempenhoShell>
    );
}
