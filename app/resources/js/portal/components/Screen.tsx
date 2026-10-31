import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    Bell,
    BookOpenCheck,
    CalendarX2,
    ChevronLeft,
    CircleHelp,
    ClipboardCheck,
    FileBarChart2,
    House,
    LogOut,
    Menu,
    TrendingUp,
    TriangleAlert,
    X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import type { ComponentType, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { formatDateTimePtBr } from '../lib/dateUtils';
import { authStore, logout } from '../stores/authStore';
import { carregarMensagens, notificationsStore } from '../stores/notificationsStore';
import { AppAlert, AppAlertHost } from './AppAlert';
import ManualAppModal from './ManualAppModal';
import { Logo, Marca } from './ui';
import { useStore } from '../lib/store';

export const APP_NOME = 'Giz';
export const APP_VERSAO = '1.0.0';

function useOnline(): boolean {
    const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine));
    useEffect(() => {
        const on = () => setOnline(true);
        const off = () => setOnline(false);
        window.addEventListener('online', on);
        window.addEventListener('offline', off);
        return () => {
            window.removeEventListener('online', on);
            window.removeEventListener('offline', off);
        };
    }, []);
    return online;
}

function ConnectionStatusDot() {
    const online = useOnline();
    return (
        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.3px] text-white/60 uppercase" title={online ? 'Conectado' : 'Sem conexão'}>
            <span className="relative flex size-2">
                {online ? <span className="absolute inline-flex size-full animate-ping rounded-full bg-sd-chalk opacity-60" /> : null}
                <span className={cn('relative inline-flex size-2 rounded-full', online ? 'bg-sd-chalk' : 'bg-sd-danger')} />
            </span>
            {online ? 'Online' : 'Sem conexão'}
        </span>
    );
}

// ---------------------------------------------------------------- Navegação

interface ItemNav {
    titulo: string;
    url: string;
    icone: ComponentType<{ className?: string }>;
    ativo: (caminho: string, modo: string | null) => boolean;
}

/** Páginas de desempenho que não carregam `modo` na URL, mapeadas para o card de origem. */
const MODO_POR_PAGINA: Record<string, string> = {
    evolucao: 'evolucao',
    relatorio: 'relatorio',
    risco: 'risco',
    faltas: 'frequencia',
};

function desempenhoAtivo(modo: string) {
    return (caminho: string, modoUrl: string | null) => {
        if (!caminho.startsWith('/desempenho')) return false;
        if (modoUrl) return modoUrl === modo;
        return MODO_POR_PAGINA[caminho.split('/')[2] ?? ''] === modo;
    };
}

const NAV_SALA: ItemNav[] = [
    { titulo: 'Início', url: '/inicio', icone: House, ativo: (c) => c === '/inicio' },
    { titulo: 'Registro de aula', url: '/registro-aula', icone: BookOpenCheck, ativo: (c) => c.startsWith('/registro-aula') },
    { titulo: 'Frequência', url: '/frequencia', icone: ClipboardCheck, ativo: (c) => c.startsWith('/frequencia') },
];

const NAV_DESEMPENHO: ItemNav[] = [
    { titulo: 'Evolução das notas', url: '/desempenho/turmas?modo=evolucao', icone: TrendingUp, ativo: desempenhoAtivo('evolucao') },
    { titulo: 'Relatório da turma', url: '/desempenho/turmas?modo=relatorio', icone: FileBarChart2, ativo: desempenhoAtivo('relatorio') },
    { titulo: 'Alunos em risco', url: '/desempenho/turmas?modo=risco', icone: TriangleAlert, ativo: desempenhoAtivo('risco') },
    { titulo: 'Quem está faltando', url: '/desempenho/turmas?modo=frequencia', icone: CalendarX2, ativo: desempenhoAtivo('frequencia') },
];

function useLocalAtual(): { caminho: string; modo: string | null } {
    const { url } = usePage();
    const [caminho, query = ''] = url.split('?');
    return { caminho, modo: new URLSearchParams(query).get('modo') };
}

function iniciais(nome?: string | null): string {
    if (!nome) return 'P';
    const partes = nome.trim().split(/\s+/);
    return ((partes[0]?.[0] ?? '') + (partes.length > 1 ? partes[partes.length - 1][0] : '')).toUpperCase();
}

function NavLink({ item, ativo, badge }: { item: ItemNav; ativo: boolean; badge?: number }) {
    const Icone = item.icone;
    return (
        <Link
            href={item.url}
            aria-current={ativo ? 'page' : undefined}
            className={cn(
                'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-semibold transition',
                ativo ? 'bg-white/[0.12] text-white' : 'text-white/65 hover:bg-white/[0.06] hover:text-white',
            )}
        >
            {ativo ? <span className="absolute top-2 bottom-2 -left-3 w-1 rounded-r-full bg-sd-chalk" aria-hidden /> : null}
            <Icone className={cn('size-[18px] shrink-0', ativo ? 'text-sd-chalk' : 'text-white/50 group-hover:text-white/80')} />
            <span className="flex-1 truncate">{item.titulo}</span>
            {badge ? (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-sd-accent px-1.5 text-[10px] font-bold text-white">
                    {badge > 9 ? '9+' : badge}
                </span>
            ) : null}
        </Link>
    );
}

/** Conteúdo da barra lateral — o mesmo no desktop (fixa) e no celular (gaveta). */
function SidebarConteudo({ onManual, onSair, onFechar }: { onManual: () => void; onSair: () => void; onFechar?: () => void }) {
    const { caminho, modo } = useLocalAtual();
    const unreadCount = useStore(notificationsStore, (s) => s.unreadCount);
    const professor = useStore(authStore, (s) => s.professor);
    const mensagens: ItemNav = { titulo: 'Mensagens', url: '/mensagens', icone: Bell, ativo: (c) => c === '/mensagens' };

    return (
        <div className="flex h-full flex-col bg-lousa text-white">
            <div className="flex items-center gap-2.5 px-6 pt-6 pb-7">
                <Link href="/inicio" className="flex items-center gap-2.5" aria-label="Ir para a tela inicial">
                    <Logo size={34} claro />
                    <Marca className="text-[28px] leading-none text-white" />
                </Link>
                {onFechar ? (
                    <button type="button" onClick={onFechar} className="ml-auto rounded-lg p-1.5 text-white/70 hover:bg-white/10" aria-label="Fechar menu">
                        <X className="size-5" />
                    </button>
                ) : null}
            </div>

            <nav className="flex-1 space-y-6 overflow-y-auto px-4" aria-label="Navegação principal">
                <div className="space-y-0.5">
                    {NAV_SALA.map((item) => (
                        <NavLink key={item.url} item={item} ativo={item.ativo(caminho, modo)} />
                    ))}
                    <NavLink item={mensagens} ativo={mensagens.ativo(caminho, modo)} badge={unreadCount} />
                </div>
                <div>
                    <p className="mb-2 px-3 text-[10px] font-bold tracking-[1.2px] text-white/40 uppercase">Desempenho</p>
                    <div className="space-y-0.5">
                        {NAV_DESEMPENHO.map((item) => (
                            <NavLink key={item.url} item={item} ativo={item.ativo(caminho, modo)} />
                        ))}
                    </div>
                </div>
            </nav>

            <div className="border-t border-white/10 p-4">
                <div className="mb-3 flex items-center justify-between px-2">
                    <ConnectionStatusDot />
                    <button type="button" onClick={onManual} className="inline-flex items-center gap-1 text-[12px] font-semibold text-white/60 hover:text-white">
                        <CircleHelp className="size-4" /> Manual
                    </button>
                </div>
                <div className="flex items-center gap-3 rounded-xl bg-white/[0.06] p-2.5">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-sd-chalk font-brand text-sm font-extrabold text-sd-primary-dark">
                        {iniciais(professor?.nome)}
                    </span>
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-semibold">{professor?.nome ?? 'Professor(a)'}</p>
                        <p className="text-[11px] text-white/50">Professor(a)</p>
                    </div>
                    <button type="button" onClick={onSair} className="rounded-lg p-2 text-white/60 hover:bg-white/10 hover:text-white" aria-label="Sair" title="Sair">
                        <LogOut className="size-[18px]" />
                    </button>
                </div>
            </div>
        </div>
    );
}

// ------------------------------------------------------------------ Cabeçalho

const botaoNav =
    'flex size-9 items-center justify-center rounded-full border border-sd-border bg-sd-surface text-sd-primary transition hover:border-sd-primary hover:bg-sd-primary-soft';

/** Cabeçalho da página: voltar/início, título ou saudação e ações da tela. */
function PageHeader({
    title,
    subtitle,
    onBack,
    welcomeLabel,
    welcomeName,
    rightActions,
}: {
    title?: string;
    subtitle?: string;
    onBack?: () => void;
    welcomeLabel?: string;
    welcomeName?: string;
    rightActions?: ReactNode;
}) {
    return (
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-3 px-4 py-4 sm:px-8 sm:py-5">
            {onBack ? (
                <div className="flex items-center gap-1.5">
                    <button type="button" onClick={onBack} aria-label="Voltar" title="Voltar" className={botaoNav}>
                        <ChevronLeft className="size-5" strokeWidth={2.5} />
                    </button>
                    <Link href="/inicio" aria-label="Ir para a tela inicial" title="Início" className={botaoNav}>
                        <House className="size-[17px]" />
                    </Link>
                </div>
            ) : null}

            {welcomeName ? (
                <div className="min-w-0 flex-1">
                    {welcomeLabel ? <p className="text-sm font-medium text-sd-muted">{welcomeLabel}</p> : null}
                    <p className="truncate font-brand text-[32px] leading-tight font-extrabold tracking-[-0.02em] text-sd-text sm:text-[40px]">
                        {welcomeName}
                        <span className="text-sd-accent">.</span>
                    </p>
                </div>
            ) : (
                <div className="min-w-0 flex-1">
                    {title ? (
                        <h1 className="truncate font-brand text-[22px] leading-tight font-bold tracking-[-0.01em] text-sd-text sm:text-[26px]">{title}</h1>
                    ) : null}
                    {subtitle ? <p className="mt-0.5 truncate text-[13px] font-medium text-sd-muted">{subtitle}</p> : null}
                </div>
            )}

            {rightActions ? <div className="flex items-center gap-2">{rightActions}</div> : null}
        </div>
    );
}

/** Rodapé discreto: versão e horário de acesso. */
export function Footer() {
    const [acesso] = useState(() => new Date());
    return (
        <footer className="mt-auto border-t border-sd-border">
            <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-1 px-4 py-4 text-[11px] font-medium text-sd-muted sm:px-8">
                <span className="inline-flex items-center gap-1.5">
                    <Logo size={14} />
                    <span className="font-semibold text-sd-text">{APP_NOME}</span> · Prefeitura do Município
                </span>
                <span className="flex-1" />
                <span>Homologação {APP_VERSAO} · dados de demonstração</span>
                <span>Acesso {formatDateTimePtBr(acesso)}</span>
            </div>
        </footer>
    );
}

interface ScreenProps {
    title?: string;
    subtitle?: string;
    onBack?: () => void;
    welcomeLabel?: string;
    welcomeName?: string;
    rightActions?: ReactNode;
    /** Área fixa no rodapé da tela (ex.: botão "Salvar frequência"). */
    bottomBar?: ReactNode;
    /** Esconde o rodapé institucional (telas com barra de ação fixa). */
    semRodape?: boolean;
    contentClassName?: string;
    children: ReactNode;
}

/**
 * Casca comum a todas as telas autenticadas: barra lateral (gaveta no
 * celular), cabeçalho da página, rodapé e o host do AppAlert. Sem sessão,
 * manda para o login.
 */
export default function Screen({
    title,
    subtitle,
    onBack,
    welcomeLabel,
    welcomeName,
    rightActions,
    bottomBar,
    semRodape = false,
    contentClassName,
    children,
}: ScreenProps) {
    const isAuthenticated = useStore(authStore, (s) => s.isAuthenticated);
    const unreadCount = useStore(notificationsStore, (s) => s.unreadCount);
    const [manualVisible, setManualVisible] = useState(false);
    const [menuAberto, setMenuAberto] = useState(false);
    // A sessão só existe no navegador (localStorage): no SSR e na hidratação a
    // tela fica vazia, e a checagem de login só vale depois de montar.
    const [montado, setMontado] = useState(false);

    useEffect(() => {
        setMontado(true);
    }, []);

    useEffect(() => {
        if (!montado) return;
        if (!isAuthenticated) router.visit('/entrar', { replace: true });
        else carregarMensagens();
    }, [montado, isAuthenticated]);

    if (!montado || !isAuthenticated) return null;

    function handleLogout() {
        AppAlert.confirm({
            title: 'Sair',
            message: 'Deseja encerrar a sessão?',
            confirmText: 'Sair',
            destructive: true,
            onConfirm: async () => {
                await logout();
                router.visit('/entrar', { replace: true });
            },
        });
    }

    const abrirManual = () => {
        setMenuAberto(false);
        setManualVisible(true);
    };

    return (
        <div className="min-h-screen bg-sd-bg font-sans text-sd-text">
            <Head title={title ?? 'Início'} />

            <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 lg:block">
                <SidebarConteudo onManual={abrirManual} onSair={handleLogout} />
            </aside>

            {menuAberto ? (
                <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
                    <button type="button" className="absolute inset-0 bg-[rgba(18,48,42,0.55)]" onClick={() => setMenuAberto(false)} aria-label="Fechar menu" />
                    <div className="absolute inset-y-0 left-0 w-72 max-w-[85%] shadow-sd-hover animate-in slide-in-from-left">
                        <SidebarConteudo onManual={abrirManual} onSair={handleLogout} onFechar={() => setMenuAberto(false)} />
                    </div>
                </div>
            ) : null}

            <div className="flex min-h-screen flex-col lg:pl-64">
                <header className="sticky top-0 z-20 border-b border-sd-border bg-sd-bg/85 backdrop-blur-md">
                    <div className="flex items-center gap-2 border-b border-sd-border px-4 py-2 lg:hidden">
                        <button type="button" onClick={() => setMenuAberto(true)} className="rounded-lg p-1.5 text-sd-primary hover:bg-sd-primary-soft" aria-label="Abrir menu">
                            <Menu className="size-6" />
                        </button>
                        <Link href="/inicio" className="flex items-center gap-2" aria-label="Ir para a tela inicial">
                            <Logo size={26} />
                            <Marca className="text-[22px] leading-none" />
                        </Link>
                        <span className="flex-1" />
                        <Link
                            href="/mensagens"
                            className="relative rounded-lg p-1.5 text-sd-primary hover:bg-sd-primary-soft"
                            aria-label={unreadCount > 0 ? `Mensagens, ${unreadCount} não lidas` : 'Mensagens'}
                        >
                            <Bell className="size-[22px]" />
                            {unreadCount > 0 ? <span className="absolute top-1 right-1 size-2.5 rounded-full border-2 border-sd-bg bg-sd-accent" /> : null}
                        </Link>
                    </div>
                    <PageHeader
                        title={title}
                        subtitle={subtitle}
                        onBack={onBack}
                        welcomeLabel={welcomeLabel}
                        welcomeName={welcomeName}
                        rightActions={rightActions}
                    />
                </header>

                <main className={cn('mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-8', contentClassName)}>{children}</main>
                {bottomBar ? (
                    <div className="sticky bottom-0 z-20 border-t border-sd-border bg-sd-surface/95 shadow-[0_-8px_24px_-12px_rgb(18_48_42/0.18)] backdrop-blur-md">
                        <div className="mx-auto max-w-6xl px-4 py-3 sm:px-8">{bottomBar}</div>
                    </div>
                ) : null}
                {semRodape ? null : <Footer />}
            </div>

            <ManualAppModal open={manualVisible} onClose={() => setManualVisible(false)} />
            <AppAlertHost />
        </div>
    );
}
