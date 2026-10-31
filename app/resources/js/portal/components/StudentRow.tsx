import { Check, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Regencia } from '../types';

function Checkbox({ checked }: { checked: boolean }) {
    return (
        <span
            className={cn(
                'flex size-7 shrink-0 items-center justify-center rounded-lg border-2 transition',
                checked ? 'border-sd-success bg-sd-success text-white' : 'border-sd-danger bg-sd-danger-bg',
            )}
            aria-hidden
        >
            {checked ? <Check className="size-4" strokeWidth={3} /> : null}
        </span>
    );
}

function AlunoMeta({ codigo, situacao }: { codigo: number; situacao?: string }) {
    return (
        <span className="block truncate text-xs text-sd-muted">
            Cód. {codigo}
            {situacao ? ` · ${situacao}` : ''}
        </span>
    );
}

/**
 * Linha de aluno da chamada. Com uma aula no dia, clicar na linha alterna
 * presente/falta; com várias, há um checkbox por aula. Alunos bloqueados
 * (cadeado) não podem ser alterados.
 */
export default function StudentRow({
    codigo,
    nome,
    situacao,
    bloqueado,
    regencias,
    faltas,
    onToggleRegencia,
}: {
    codigo: number;
    nome: string;
    situacao?: string;
    bloqueado?: boolean;
    regencias: Regencia[];
    faltas: Set<number>;
    onToggleRegencia: (regenciaCodigo: number) => void;
}) {
    if (bloqueado) {
        return (
            <div className="flex items-center gap-3 rounded-xl bg-sd-bg px-4 py-3 opacity-80" aria-disabled>
                <span className="flex size-7 items-center justify-center rounded-lg bg-sd-border text-sd-muted">
                    <Lock className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-semibold text-sd-muted">{nome}</span>
                    <AlunoMeta codigo={codigo} situacao={situacao} />
                </span>
            </div>
        );
    }

    if (regencias.length <= 1) {
        const regenciaCodigo = regencias[0]?.codigo ?? 0;
        const presente = !faltas.has(regenciaCodigo);
        return (
            <button
                type="button"
                role="checkbox"
                aria-checked={presente}
                onClick={() => onToggleRegencia(regenciaCodigo)}
                className={cn(
                    'flex w-full items-center gap-3 rounded-xl border bg-sd-surface px-4 py-3 text-left shadow-sd-card transition hover:border-sd-primary-light',
                    presente ? 'border-transparent' : 'border-sd-danger/40 bg-sd-danger-bg/40',
                )}
            >
                <Checkbox checked={presente} />
                <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-semibold text-sd-text">{nome}</span>
                    <AlunoMeta codigo={codigo} situacao={situacao} />
                </span>
                <span className={cn('text-sm font-bold', presente ? 'text-sd-success' : 'text-sd-danger')}>{presente ? 'Presente' : 'Faltou'}</span>
            </button>
        );
    }

    return (
        <div className="flex flex-col gap-2 rounded-xl bg-sd-surface px-4 py-3 shadow-sd-card sm:flex-row sm:items-center">
            <span className="min-w-0 flex-1">
                <span className="block text-[15px] text-sd-text">{nome}</span>
                <AlunoMeta codigo={codigo} situacao={situacao} />
            </span>
            <span className="flex flex-wrap gap-2">
                {regencias.map((regencia) => {
                    const presente = !faltas.has(regencia.codigo);
                    return (
                        <button
                            key={regencia.codigo}
                            type="button"
                            role="checkbox"
                            aria-checked={presente}
                            onClick={() => onToggleRegencia(regencia.codigo)}
                            className="flex items-center gap-2 rounded-lg border border-sd-border px-2.5 py-1.5 hover:border-sd-primary-light"
                        >
                            <Checkbox checked={presente} />
                            <span className="text-xs font-semibold text-sd-muted">{regencia.descricao ?? `Aula ${regencia.codigo}`}</span>
                        </button>
                    );
                })}
            </span>
        </div>
    );
}
