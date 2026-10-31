import { Loader2, X } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * Componentes básicos do portal — equivalentes web dos componentes do app
 * mobile (AppButton, ErrorBanner, EmptyState, ChipSelect, SelectableList,
 * SectionHeader, LoadingOverlay, Logo), com o mesmo visual.
 */

// ----------------------------------------------------------------- AppButton

type Variant = 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';

const VARIANTES: Record<Variant, string> = {
    primary: 'bg-sd-primary text-white hover:bg-sd-primary-light',
    secondary: 'bg-sd-accent text-white hover:brightness-95',
    outline: 'border-[1.5px] border-sd-primary text-sd-primary bg-transparent hover:bg-sd-primary-soft',
    danger: 'bg-sd-danger text-white hover:brightness-95',
    ghost: 'bg-transparent text-sd-primary hover:bg-sd-primary-soft',
};

interface AppButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    label: ReactNode;
    variant?: Variant;
    loading?: boolean;
    size?: 'md' | 'sm';
}

export function AppButton({
    label,
    variant = 'primary',
    loading = false,
    size = 'md',
    disabled,
    className,
    type = 'button',
    ...rest
}: AppButtonProps) {
    return (
        <button
            type={type}
            disabled={disabled || loading}
            className={cn(
                'inline-flex items-center justify-center gap-2 rounded-full font-bold whitespace-nowrap transition disabled:cursor-not-allowed disabled:opacity-50',
                size === 'md' ? 'min-h-[50px] px-6 text-base' : 'min-h-[38px] px-3 text-sm sm:px-4',
                VARIANTES[variant],
                className,
            )}
            {...rest}
        >
            {loading ? <Loader2 className="size-5 animate-spin" /> : null}
            {label}
        </button>
    );
}

// --------------------------------------------------------------- ErrorBanner

const BANNER = {
    error: 'bg-sd-danger-bg text-sd-danger',
    info: 'bg-sd-primary-soft text-sd-primary',
    warning: 'bg-sd-accent-soft text-sd-accent-dark',
    success: 'bg-sd-success-bg text-sd-success',
};

export function ErrorBanner({
    message,
    variant = 'error',
    className,
}: {
    message: ReactNode | null | undefined;
    variant?: keyof typeof BANNER;
    className?: string;
}) {
    if (!message) return null;
    return (
        <div role={variant === 'error' ? 'alert' : 'status'} className={cn('mb-4 rounded-xl px-4 py-2.5 text-sm font-semibold', BANNER[variant], className)}>
            {message}
        </div>
    );
}

// ---------------------------------------------------------------- EmptyState

export function EmptyState({ title, description }: { title: string; description?: string }) {
    return (
        <div className="flex flex-col items-center justify-center px-8 py-12 text-center">
            <p className="text-[17px] font-semibold text-sd-text">{title}</p>
            {description ? <p className="mt-2 max-w-md text-sm text-sd-muted">{description}</p> : null}
        </div>
    );
}

// ---------------------------------------------------------------- Carregando

export function Carregando({ message, className }: { message?: string; className?: string }) {
    return (
        <div className={cn('flex flex-col items-center justify-center gap-3 py-16 text-sd-primary', className)}>
            <Loader2 className="size-9 animate-spin" />
            {message ? <p className="text-sm font-semibold text-sd-muted">{message}</p> : null}
        </div>
    );
}

/** Equivalente ao LoadingOverlay do mobile: cobre a tela durante uma operação. */
export function LoadingOverlay({ visible, message }: { visible: boolean; message?: string }) {
    if (!visible) return null;
    return (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-[rgba(18,48,42,0.35)]" role="status" aria-live="polite">
            <div className="flex flex-col items-center gap-3 rounded-2xl bg-sd-surface px-10 py-7 shadow-sd-hover">
                <Loader2 className="size-9 animate-spin text-sd-primary" />
                {message ? <p className="text-sm font-semibold text-sd-muted">{message}</p> : null}
            </div>
        </div>
    );
}

// ------------------------------------------------------------ SelectableList

export interface ItemSelecionavel {
    codigo: string;
    nome: string;
    descricao?: string;
}

export function SelectableList<T extends ItemSelecionavel>({
    items,
    onSelect,
    emptyLabel,
}: {
    items: T[];
    onSelect: (item: T) => void;
    emptyLabel?: string;
}) {
    if (items.length === 0) return <EmptyState title={emptyLabel ?? 'Nenhum item encontrado.'} />;
    return (
        <ul className="grid gap-2 sm:grid-cols-2">
            {items.map((item) => (
                <li key={item.codigo}>
                    <button
                        type="button"
                        onClick={() => onSelect(item)}
                        className="group flex w-full items-center rounded-xl border-[1.5px] border-transparent bg-sd-surface px-6 py-4 text-left shadow-sd-card transition hover:border-sd-primary hover:bg-sd-primary-soft"
                    >
                        <span className="flex-1">
                            <span className="block text-[17px] font-semibold text-sd-text">{item.nome}</span>
                            {item.descricao ? <span className="mt-0.5 block text-sm text-sd-muted">{item.descricao}</span> : null}
                        </span>
                        <span className="ml-2 text-2xl text-sd-primary-light group-hover:font-bold group-hover:text-sd-primary">›</span>
                    </button>
                </li>
            ))}
        </ul>
    );
}

// ---------------------------------------------------------------- ChipSelect

export interface ChipOption {
    codigo: number;
    label: string;
    cor?: string;
    /** Bolinha âmbar antes do rótulo (ex.: regência polivalente). */
    indicador?: boolean;
}

function Chip({ option, ativo, onClick }: { option: ChipOption; ativo: boolean; onClick: () => void }) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-pressed={ativo}
            className={cn(
                'inline-flex max-w-full items-center rounded-full border-[1.5px] px-4 py-1 text-[13px] font-semibold transition',
                ativo ? 'border-sd-primary bg-sd-primary-soft text-sd-primary' : 'border-sd-border bg-sd-surface text-sd-muted hover:border-sd-primary-light',
            )}
            style={option.cor && ativo ? { borderColor: option.cor, color: option.cor } : undefined}
        >
            {option.indicador ? <span className="mr-1.5 size-2 rounded-full bg-sd-accent" /> : null}
            {option.cor ? <span className="mr-1.5 size-2 rounded-full" style={{ backgroundColor: option.cor }} /> : null}
            <span className="truncate">{option.label}</span>
        </button>
    );
}

/** Seleção única; clicar no chip ativo desmarca (`null`), como no mobile. */
export function ChipSelect({
    options,
    selected,
    onSelect,
    emptyLabel,
    obrigatorio = false,
}: {
    options: ChipOption[];
    selected: number | null;
    onSelect: (codigo: number | null) => void;
    emptyLabel?: string;
    /** Não permite desmarcar o chip ativo. */
    obrigatorio?: boolean;
}) {
    if (options.length === 0) return <p className="text-[13px] italic text-sd-muted">{emptyLabel ?? 'Nenhuma opção.'}</p>;
    return (
        <div className="flex flex-wrap gap-2">
            {options.map((o) => (
                <Chip
                    key={o.codigo}
                    option={o}
                    ativo={o.codigo === selected}
                    onClick={() => onSelect(o.codigo === selected && !obrigatorio ? null : o.codigo)}
                />
            ))}
        </div>
    );
}

export function ChipMultiSelect({
    options,
    selected,
    onToggle,
}: {
    options: ChipOption[];
    selected: number[];
    onToggle: (codigo: number) => void;
}) {
    return (
        <div className="flex flex-wrap gap-2">
            {options.map((o) => (
                <Chip key={o.codigo} option={o} ativo={selected.includes(o.codigo)} onClick={() => onToggle(o.codigo)} />
            ))}
        </div>
    );
}

// ------------------------------------------------------------- SectionHeader

export function SectionHeader({ step, title, hint }: { step?: number; title: string; hint?: string }) {
    return (
        <div className="mb-2">
            <div className="mb-1 flex items-center">
                {step ? (
                    <span className="mr-2 flex size-[22px] items-center justify-center rounded-full bg-sd-primary text-xs font-bold text-white">{step}</span>
                ) : null}
                <span className="text-[13px] font-semibold text-sd-muted">{title}</span>
            </div>
            {hint ? <p className="text-[13px] leading-[18px] text-sd-muted">{hint}</p> : null}
        </div>
    );
}

// ---------------------------------------------------------------------- Card

export function Card({ className, children }: { className?: string; children: ReactNode }) {
    return <div className={cn('rounded-2xl bg-sd-surface p-4 shadow-sd-card', className)}>{children}</div>;
}

// ---------------------------------------------------------------------- Logo

/**
 * Marca do Giz: uma lousa com um traço de giz subindo, a faísca amarela e o
 * apoio do giz em coral. `claro` inverte a lousa para fundos escuros.
 */
export function Logo({ size = 96, claro = false, className }: { size?: number; claro?: boolean; className?: string }) {
    return (
        <svg
            viewBox="0 0 64 64"
            width={size}
            height={size}
            role="img"
            aria-label="Logo do Giz"
            className={cn('shrink-0', className)}
            style={{ width: size, height: size }}
        >
            <rect width="64" height="64" rx="18" fill={claro ? '#FBF8F1' : '#1F4A3D'} />
            <path
                d="M14 41c4-7 8-12 11-10.5S24 40 28 40.5 36 28 41 24"
                fill="none"
                stroke={claro ? '#1F4A3D' : '#FBF8F1'}
                strokeWidth={5.5}
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <path d="M47.5 10.5l1.9 5 5 1.9-5 1.9-1.9 5-1.9-5-5-1.9 5-1.9z" fill={claro ? '#E8552E' : '#F6D04D'} />
            <rect x="12" y="49" width="40" height="4" rx="2" fill="#E8552E" />
        </svg>
    );
}

export function Marca({ className }: { className?: string }) {
    return (
        <span className={cn('font-brand font-extrabold tracking-[-0.03em] text-sd-primary', className)}>
            giz<span className="text-sd-accent">.</span>
        </span>
    );
}

// --------------------------------------------------------------------- Modal

export function Modal({
    open,
    onClose,
    title,
    description,
    children,
    footer,
    className,
}: {
    open: boolean;
    onClose: () => void;
    title: ReactNode;
    description?: ReactNode;
    children?: ReactNode;
    footer?: ReactNode;
    className?: string;
}) {
    return (
        <Dialog.Root open={open} onOpenChange={(aberto) => (aberto ? undefined : onClose())}>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 z-50 bg-[rgba(18,48,42,0.55)] data-[state=open]:animate-in data-[state=open]:fade-in-0" />
                <Dialog.Content
                    className={cn(
                        'fixed top-1/2 left-1/2 z-50 flex max-h-[90vh] w-[calc(100%-32px)] max-w-lg -translate-x-1/2 -translate-y-1/2 flex-col rounded-2xl bg-sd-surface shadow-sd-hover outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
                        className,
                    )}
                >
                    <div className="flex items-start gap-3 border-b border-sd-border px-6 py-4">
                        <div className="flex-1">
                            <Dialog.Title className="text-[17px] font-bold text-sd-text">{title}</Dialog.Title>
                            {description ? (
                                <Dialog.Description className="mt-1 text-sm text-sd-muted">{description}</Dialog.Description>
                            ) : (
                                <Dialog.Description className="sr-only">{typeof title === 'string' ? title : 'Janela'}</Dialog.Description>
                            )}
                        </div>
                        <Dialog.Close className="rounded-lg p-1 text-sd-muted hover:bg-sd-bg" aria-label="Fechar">
                            <X className="size-5" />
                        </Dialog.Close>
                    </div>
                    <div className="overflow-y-auto px-6 py-4">{children}</div>
                    {footer ? <div className="flex flex-wrap justify-end gap-2 border-t border-sd-border px-6 py-4">{footer}</div> : null}
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}
