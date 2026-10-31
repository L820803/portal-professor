import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { todayApiDateString, toApiDateString } from '../lib/dateUtils';

const MESES = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];
const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

/**
 * Calendário mensal (substitui o react-native-calendars do app). Com
 * `habilitados`, só esses dias podem ser escolhidos e aparecem marcados
 * (dias letivos da frequência); senão, vale o intervalo `min`–`max`.
 */
export default function Calendario({
    selecionado,
    onSelect,
    habilitados,
    min,
    max,
}: {
    selecionado: string | null;
    onSelect: (data: string) => void;
    habilitados?: Set<string>;
    min?: string;
    max?: string;
}) {
    const base = selecionado ?? todayApiDateString();
    const [mes, setMes] = useState(() => {
        const [y, m] = base.split('-').map(Number);
        return { ano: y, mes: m - 1 };
    });
    const hoje = todayApiDateString();

    const primeiro = new Date(mes.ano, mes.mes, 1);
    const totalDias = new Date(mes.ano, mes.mes + 1, 0).getDate();
    const celulas: (string | null)[] = [
        ...Array.from({ length: primeiro.getDay() }, () => null),
        ...Array.from({ length: totalDias }, (_, i) => toApiDateString(new Date(mes.ano, mes.mes, i + 1))),
    ];

    function mudarMes(delta: number) {
        setMes((atual) => {
            const d = new Date(atual.ano, atual.mes + delta, 1);
            return { ano: d.getFullYear(), mes: d.getMonth() };
        });
    }

    function permitido(data: string): boolean {
        if (habilitados) return habilitados.has(data);
        if (min && data < min) return false;
        if (max && data > max) return false;
        return true;
    }

    return (
        <div className="w-full max-w-sm rounded-xl border border-sd-border bg-sd-surface p-3 shadow-sd-card">
            <div className="mb-2 flex items-center justify-between">
                <button type="button" onClick={() => mudarMes(-1)} className="rounded-lg p-1.5 text-sd-primary hover:bg-sd-primary-soft" aria-label="Mês anterior">
                    <ChevronLeft className="size-5" />
                </button>
                <span className="text-[15px] font-semibold text-sd-text">
                    {MESES[mes.mes]} {mes.ano}
                </span>
                <button type="button" onClick={() => mudarMes(1)} className="rounded-lg p-1.5 text-sd-primary hover:bg-sd-primary-soft" aria-label="Próximo mês">
                    <ChevronRight className="size-5" />
                </button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center">
                {DIAS.map((d) => (
                    <span key={d} className="py-1 text-[11px] font-semibold text-sd-muted">
                        {d}
                    </span>
                ))}
                {celulas.map((data, i) => {
                    if (!data) return <span key={`v-${i}`} />;
                    const ok = permitido(data);
                    const ativo = data === selecionado;
                    const marcado = habilitados?.has(data);
                    return (
                        <button
                            key={data}
                            type="button"
                            disabled={!ok}
                            onClick={() => onSelect(data)}
                            className={cn(
                                'mx-auto flex size-9 items-center justify-center rounded-lg text-sm transition',
                                ativo
                                    ? 'bg-sd-primary font-bold text-white'
                                    : marcado
                                      ? 'bg-sd-primary-light font-semibold text-white hover:bg-sd-primary'
                                      : ok
                                        ? 'text-sd-text hover:bg-sd-primary-soft'
                                        : 'cursor-not-allowed text-sd-disabled',
                                data === hoje && !ativo && !marcado && 'font-bold text-sd-primary',
                                data === hoje && 'ring-2 ring-sd-accent ring-offset-1',
                            )}
                            aria-label={data}
                            aria-pressed={ativo}
                        >
                            {Number(data.slice(8))}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
