import * as Dialog from '@radix-ui/react-dialog';
import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react';
import { createStore, useStore } from '../lib/store';
import { AppButton } from './ui';

/**
 * Alerta/diálogo imperativo, mesma API do `AppAlert` do mobile
 * (`AppAlert.success(...)`, `AppAlert.confirm({...})`). Renderizado pelo
 * `AppAlertHost`, montado uma vez na casca das telas.
 */

export type AppAlertType = 'success' | 'error' | 'warning' | 'info' | 'confirm';

export interface AppAlertButton {
    text: string;
    style?: 'default' | 'cancel' | 'destructive';
    onPress?: () => void | Promise<void>;
}

interface AlertaAtual {
    type: AppAlertType;
    title: string;
    message?: string;
    buttons: AppAlertButton[];
}

const alertStore = createStore<{ atual: AlertaAtual | null }>({ atual: null });

function show(options: { type: AppAlertType; title: string; message?: string; buttons?: AppAlertButton[] }) {
    alertStore.setState({
        atual: {
            type: options.type,
            title: options.title,
            message: options.message,
            buttons: options.buttons?.length ? options.buttons : [{ text: 'OK' }],
        },
    });
}

export const AppAlert = {
    show,
    success: (title: string, message?: string, buttons?: AppAlertButton[]) => show({ type: 'success', title, message, buttons }),
    error: (title: string, message?: string, buttons?: AppAlertButton[]) => show({ type: 'error', title, message, buttons }),
    warning: (title: string, message?: string, buttons?: AppAlertButton[]) => show({ type: 'warning', title, message, buttons }),
    info: (title: string, message?: string, buttons?: AppAlertButton[]) => show({ type: 'info', title, message, buttons }),
    confirm: (options: {
        title: string;
        message?: string;
        confirmText?: string;
        cancelText?: string;
        destructive?: boolean;
        onConfirm: () => void | Promise<void>;
        onCancel?: () => void | Promise<void>;
    }) =>
        show({
            type: 'confirm',
            title: options.title,
            message: options.message,
            buttons: [
                { text: options.cancelText ?? 'Cancelar', style: 'cancel', onPress: options.onCancel },
                {
                    text: options.confirmText ?? 'Confirmar',
                    style: options.destructive ? 'destructive' : 'default',
                    onPress: options.onConfirm,
                },
            ],
        }),
};

const ICONES = {
    success: <CheckCircle2 className="size-12 text-sd-success" />,
    error: <XCircle className="size-12 text-sd-danger" />,
    warning: <AlertTriangle className="size-12 text-sd-accent" />,
    info: <Info className="size-12 text-sd-primary-light" />,
    confirm: <Info className="size-12 text-sd-primary" />,
};

export function AppAlertHost() {
    const atual = useStore(alertStore, (s) => s.atual);

    function fechar(botao?: AppAlertButton) {
        alertStore.setState({ atual: null });
        void botao?.onPress?.();
    }

    return (
        <Dialog.Root
            open={atual !== null}
            onOpenChange={(aberto) => {
                if (!aberto) fechar(atual?.buttons.find((b) => b.style === 'cancel'));
            }}
        >
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 z-[60] bg-[rgba(18,48,42,0.55)]" />
                <Dialog.Content className="fixed top-1/2 left-1/2 z-[60] w-[calc(100%-32px)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-sd-surface p-6 text-center shadow-sd-hover outline-none">
                    {atual ? (
                        <>
                            <div className="mb-3 flex justify-center">{ICONES[atual.type]}</div>
                            <Dialog.Title className="text-xl font-bold text-sd-text">{atual.title}</Dialog.Title>
                            {atual.message ? (
                                <Dialog.Description className="mt-2 text-[15px] whitespace-pre-line text-sd-muted">{atual.message}</Dialog.Description>
                            ) : (
                                <Dialog.Description className="sr-only">{atual.title}</Dialog.Description>
                            )}
                            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-center">
                                {atual.buttons.map((botao) => (
                                    <AppButton
                                        key={botao.text}
                                        label={botao.text}
                                        size="sm"
                                        variant={botao.style === 'cancel' ? 'outline' : botao.style === 'destructive' ? 'danger' : 'primary'}
                                        onClick={() => fechar(botao)}
                                        className="sm:min-w-32"
                                    />
                                ))}
                            </div>
                        </>
                    ) : null}
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}
