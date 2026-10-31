import { useState } from 'react';
import { cn } from '@/lib/utils';
import Screen from '@/portal/components/Screen';
import { EmptyState } from '@/portal/components/ui';
import { formatDateTimePtBr } from '@/portal/lib/dateUtils';
import { voltar } from '@/portal/lib/nav';
import { marcarComoLida, marcarTodasComoLidas, notificationsStore } from '@/portal/stores/notificationsStore';
import type { Mensagem } from '@/portal/types';
import { useStore } from '@/portal/lib/store';

type Aba = 'novas' | 'lidas';

function MensagemRow({ mensagem }: { mensagem: Mensagem }) {
    return (
        <button
            type="button"
            onClick={() => marcarComoLida(mensagem.id)}
            className={cn(
                'flex w-full items-start gap-3 rounded-xl border-l-4 bg-sd-surface p-4 text-left shadow-sd-card transition hover:shadow-sd-hover',
                mensagem.lida ? 'border-transparent' : 'border-sd-accent',
            )}
        >
            {!mensagem.lida ? <span className="mt-1.5 size-2.5 shrink-0 rounded-full bg-sd-accent" aria-label="Não lida" /> : null}
            <span className="min-w-0 flex-1">
                <span className={cn('block text-[13px] text-sd-text', mensagem.lida ? 'font-semibold' : 'font-bold')}>{mensagem.titulo}</span>
                <span className="mt-1 block text-sm text-sd-muted">{mensagem.corpo}</span>
                <span className="mt-2 block text-xs text-sd-muted">{formatDateTimePtBr(new Date(mensagem.data))}</span>
            </span>
        </button>
    );
}

export default function Mensagens() {
    const mensagens = useStore(notificationsStore, (s) => s.mensagens);
    const [aba, setAba] = useState<Aba>('novas');

    const novas = mensagens.filter((m) => !m.lida);
    const lidas = mensagens.filter((m) => m.lida);
    const daAba = aba === 'novas' ? novas : lidas;

    return (
        <Screen title="Mensagens" subtitle="Avisos e comunicados da escola" onBack={() => voltar()}>
            <div className="mx-auto max-w-3xl">
                <div className="mb-4 flex rounded-xl bg-sd-surface p-1 shadow-sd-card" role="tablist">
                    {(
                        [
                            ['novas', 'Novas', novas.length],
                            ['lidas', 'Lidas', lidas.length],
                        ] as const
                    ).map(([valor, label, count]) => (
                        <button
                            key={valor}
                            type="button"
                            role="tab"
                            aria-selected={aba === valor}
                            onClick={() => setAba(valor)}
                            className={cn(
                                'flex-1 rounded-lg py-2 text-sm font-semibold transition',
                                aba === valor ? 'bg-sd-primary text-white' : 'text-sd-muted hover:bg-sd-bg',
                            )}
                        >
                            {label} ({count})
                        </button>
                    ))}
                </div>

                {aba === 'novas' && novas.length > 0 ? (
                    <div className="mb-3 flex justify-end">
                        <button type="button" onClick={marcarTodasComoLidas} className="text-sm font-semibold text-sd-primary-light hover:underline">
                            Marcar todas como lidas
                        </button>
                    </div>
                ) : null}

                {daAba.length === 0 ? (
                    <EmptyState
                        title={aba === 'novas' ? 'Nenhuma mensagem nova' : 'Nenhuma mensagem lida'}
                        description={aba === 'novas' ? 'Você está em dia — não há mensagens novas.' : 'As mensagens que você já leu aparecem aqui.'}
                    />
                ) : (
                    <div className="space-y-2">
                        {daAba.map((m) => (
                            <MensagemRow key={m.id} mensagem={m} />
                        ))}
                    </div>
                )}
            </div>
        </Screen>
    );
}
