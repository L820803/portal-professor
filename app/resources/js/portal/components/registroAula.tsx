import { Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { formatDatePtBr, weekdayLabelPtBr } from '../lib/dateUtils';
import type { ConteudoRegistroAula, DadosRegente, RegistroAulaFiltros } from '../types';
import Calendario from './Calendario';
import ManualAppModal, { SECOES_REGISTRO_AULA } from './ManualAppModal';
import { AppButton, ChipSelect, Modal, SectionHeader } from './ui';

/** Card de um conteúdo lançado na lista do Registro de aula. */
export function ConteudoAulaCard({
    item,
    onAbrir,
    onExcluir,
}: {
    item: ConteudoRegistroAula;
    onAbrir: () => void;
    onExcluir: () => void;
}) {
    return (
        <div className="group relative flex flex-col rounded-xl bg-sd-surface p-4 shadow-sd-card transition hover:shadow-sd-hover">
            <button type="button" onClick={onAbrir} className="flex flex-1 flex-col text-left" aria-label={`Abrir conteúdo de ${formatDatePtBr(item.data)}`}>
                <div className="mb-2 flex items-start justify-between gap-2">
                    <div>
                        <p className="text-[15px] font-bold text-sd-primary">{formatDatePtBr(item.data)}</p>
                        <p className="text-xs text-sd-muted">{weekdayLabelPtBr(item.data)}</p>
                    </div>
                    {item.turno ? (
                        <span className="rounded-full bg-sd-accent-soft px-2.5 py-0.5 text-[11px] font-bold text-sd-accent-dark">{item.turno}</span>
                    ) : null}
                </div>
                <p className="truncate text-[17px] font-semibold text-sd-text">{item.disciplina}</p>
                <p className="mb-2 truncate text-[13px] text-sd-muted">
                    {item.turma.nome} · {item.etapa.nome}
                </p>
                <p className="line-clamp-4 text-[15px] text-sd-text">{item.conteudo}</p>
            </button>
            <div className="mt-3 flex items-center justify-between border-t border-sd-border pt-2">
                <div className="flex flex-wrap gap-x-3 text-xs font-semibold text-sd-muted">
                    <span>
                        {item.aulasDadas} aula{item.aulasDadas === 1 ? '' : 's'} dada{item.aulasDadas === 1 ? '' : 's'}
                    </span>
                    {item.tipoInstrumento ? <span>{item.tipoInstrumento}</span> : null}
                </div>
                <button
                    type="button"
                    onClick={onExcluir}
                    className="rounded-lg p-1.5 text-sd-danger hover:bg-sd-danger-bg"
                    aria-label="Excluir conteúdo"
                    title="Excluir"
                >
                    <Trash2 className="size-5" />
                </button>
            </div>
        </div>
    );
}

/** Filtros da lista (RegistroAulaFiltrosModal do mobile): data, turma, etapa e regência, em cascata. */
export function RegistroAulaFiltrosModal({
    open,
    onClose,
    dadosRegente,
    filtros,
    onApply,
}: {
    open: boolean;
    onClose: () => void;
    dadosRegente: DadosRegente | null;
    filtros: RegistroAulaFiltros;
    onApply: (filtros: RegistroAulaFiltros) => void;
}) {
    const [rascunho, setRascunho] = useState<RegistroAulaFiltros>(filtros);
    useEffect(() => {
        if (open) setRascunho(filtros);
    }, [open, filtros]);

    const etapas = (dadosRegente?.etapas ?? []).filter((e) => rascunho.turma === undefined || e.turmaCodigo === rascunho.turma);
    const etapasUnicas = etapas.filter((e, i) => etapas.findIndex((x) => x.codigo === e.codigo) === i);
    const regencias = (dadosRegente?.regencias ?? []).filter(
        (r) => (rascunho.turma === undefined || r.turmaCodigo === rascunho.turma) && (rascunho.etapa === undefined || r.etapaCodigo === rascunho.etapa),
    );

    function set(patch: Partial<RegistroAulaFiltros>) {
        setRascunho((prev) => {
            const next = { ...prev, ...patch };
            (Object.keys(next) as (keyof RegistroAulaFiltros)[]).forEach((k) => next[k] === undefined && delete next[k]);
            return next;
        });
    }

    return (
        <Modal
            open={open}
            onClose={onClose}
            title="Filtros"
            description="Mostre só os conteúdos de uma data, turma, etapa ou regência."
            footer={
                <>
                    <AppButton label="Limpar" variant="ghost" size="sm" onClick={() => setRascunho({})} />
                    <AppButton
                        label="Aplicar"
                        size="sm"
                        onClick={() => {
                            onApply(rascunho);
                            onClose();
                        }}
                    />
                </>
            }
        >
            <div className="space-y-5">
                <div>
                    <SectionHeader title="DATA" />
                    <Calendario selecionado={rascunho.data ?? null} onSelect={(data) => set({ data: data === rascunho.data ? undefined : data })} />
                    {rascunho.data ? (
                        <button type="button" onClick={() => set({ data: undefined })} className="mt-2 text-xs font-semibold text-sd-primary-light hover:underline">
                            Qualquer data
                        </button>
                    ) : null}
                </div>
                <div>
                    <SectionHeader title="TURMA" />
                    <ChipSelect
                        options={(dadosRegente?.turmas ?? []).map((t) => ({ codigo: t.codigo, label: t.nome }))}
                        selected={rascunho.turma ?? null}
                        onSelect={(c) => set({ turma: c ?? undefined, etapa: undefined, regencia: undefined })}
                    />
                </div>
                <div>
                    <SectionHeader title="ETAPA" />
                    <ChipSelect
                        options={etapasUnicas.map((e) => ({ codigo: e.codigo, label: e.nome }))}
                        selected={rascunho.etapa ?? null}
                        onSelect={(c) => set({ etapa: c ?? undefined, regencia: undefined })}
                    />
                </div>
                <div>
                    <SectionHeader title="REGÊNCIA" />
                    <ChipSelect
                        options={regencias.map((r) => ({
                            codigo: r.codigo,
                            label: (dadosRegente?.turmas.length ?? 0) > 1 && rascunho.turma === undefined
                                ? `${r.disciplina} · ${dadosRegente?.turmas.find((t) => t.codigo === r.turmaCodigo)?.nome ?? ''}`
                                : r.disciplina,
                            cor: r.cor,
                        }))}
                        selected={rascunho.regencia ?? null}
                        onSelect={(c) => set({ regencia: c ?? undefined })}
                    />
                </div>
            </div>
        </Modal>
    );
}

export function RegistroAulaAjudaModal({ open, onClose }: { open: boolean; onClose: () => void }) {
    return <ManualAppModal open={open} onClose={onClose} secoes={SECOES_REGISTRO_AULA} titulo="Como usar o Registro de aula" />;
}
