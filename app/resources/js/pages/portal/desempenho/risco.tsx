import { ChevronRight, IdCard } from 'lucide-react';
import { useState } from 'react';
import { AlertaBadge, DesempenhoShell, paramsUrl } from '@/portal/components/desempenho';
import { ChipSelect, EmptyState } from '@/portal/components/ui';
import { alunosEmRisco } from '@/portal/lib/desempenhoIndicadores';
import type { TipoAlerta } from '@/portal/lib/desempenhoIndicadores';
import { href, ir } from '@/portal/lib/nav';
import { Link } from '@inertiajs/react';

const FILTROS: { codigo: number; label: string; tipos: TipoAlerta[] }[] = [
    { codigo: 1, label: 'Frequência baixa', tipos: ['frequenciaBaixa'] },
    { codigo: 2, label: 'Abaixo do mínimo', tipos: ['abaixoMinimo'] },
    { codigo: 3, label: 'Nota em queda', tipos: ['notaEmQueda'] },
];

const COR_GRAVIDADE = ['#C3C2BA', '#C98A12', '#D2483F', '#D2483F'];

/**
 * Card "Alunos em risco": alunos ativos com frequência abaixo do mínimo,
 * último período abaixo do mínimo ou nota em queda, do mais grave ao menos.
 */
export default function DesempenhoRisco() {
    const [filtro, setFiltro] = useState<number | null>(null);

    return (
        <DesempenhoShell title="Alunos em risco">
            {(dados, _regencia, params) => {
                const todos = alunosEmRisco(dados);
                const tipos = FILTROS.find((f) => f.codigo === filtro)?.tipos ?? null;
                const lista = tipos ? todos.filter((r) => r.alertas.some((a) => tipos.includes(a.tipo))) : todos;
                const ativos = dados.alunos.filter((a) => a.ativo).length;
                const contagem = (tipo: TipoAlerta) => todos.filter((r) => r.alertas.some((a) => a.tipo === tipo)).length;

                return (
                    <>
                        <div className="mb-4 flex items-center gap-4 rounded-xl bg-sd-surface p-4 shadow-sd-card">
                            <span className="text-4xl font-extrabold text-sd-danger">{todos.length}</span>
                            <div>
                                <p className="text-[13px] font-semibold text-sd-text">
                                    de {ativos} aluno{ativos === 1 ? '' : 's'} com algum alerta
                                </p>
                                <p className="text-xs text-sd-muted">
                                    {contagem('frequenciaBaixa')} frequência baixa · {contagem('abaixoMinimo')} abaixo do mínimo · {contagem('notaEmQueda')} nota em queda
                                </p>
                            </div>
                        </div>
                        <ChipSelect options={FILTROS.map(({ codigo, label }) => ({ codigo, label }))} selected={filtro} onSelect={setFiltro} />
                        <p className="mt-2 mb-4 text-[13px] text-sd-muted">
                            Frequência calculada pelas aulas com presença lançada; mínimo de {Math.round(dados.procedimento.frequenciaMinima)}%.
                            {dados.procedimento.forma === 'PARECER' ? ' Turma avaliada por parecer: só o alerta de frequência se aplica.' : ''}
                        </p>

                        {lista.length === 0 ? (
                            <EmptyState
                                title={todos.length === 0 ? 'Nenhum aluno em risco' : 'Nenhum aluno neste filtro'}
                                description={
                                    todos.length === 0
                                        ? 'Nenhum aluno ativo está com frequência baixa, nota abaixo do mínimo ou em queda.'
                                        : 'Clique no filtro de novo para ver todos os alertas.'
                                }
                            />
                        ) : (
                            <div className="grid gap-3 lg:grid-cols-2">
                                {lista.map(({ aluno, alertas, gravidade }) => (
                                    <div key={aluno.matricula || aluno.codigo} className="flex overflow-hidden rounded-xl bg-sd-surface shadow-sd-card transition hover:shadow-sd-hover">
                                        <span className="w-1.5 shrink-0" style={{ backgroundColor: COR_GRAVIDADE[Math.min(gravidade, 3)] }} />
                                        <button
                                            type="button"
                                            onClick={() => ir('/desempenho/aluno', paramsUrl(params, { aluno: aluno.codigo }))}
                                            className="min-w-0 flex-1 p-3 text-left"
                                        >
                                            <p className="text-[13px] font-semibold text-sd-text">{aluno.nome}</p>
                                            <div className="mt-2 flex flex-wrap gap-1.5">
                                                {alertas.map((alerta, i) => (
                                                    <AlertaBadge key={`${alerta.tipo}-${alerta.regencia}-${i}`} tipo={alerta.tipo} detalhe={alerta.descricao} />
                                                ))}
                                            </div>
                                            <p className="mt-2 flex items-center text-xs text-sd-muted">
                                                Clique para o boletim <ChevronRight className="size-3" />
                                            </p>
                                        </button>
                                        <Link
                                            href={href('/desempenho/ficha', paramsUrl(params, { aluno: aluno.codigo }))}
                                            className="flex w-20 shrink-0 flex-col items-center justify-center border-l border-sd-border text-sd-primary hover:bg-sd-primary-soft"
                                            aria-label={`Ficha de ${aluno.nome}`}
                                        >
                                            <IdCard className="size-6" />
                                            <span className="mt-1 text-[11px] font-bold">Ficha</span>
                                        </Link>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                );
            }}
        </DesempenhoShell>
    );
}
