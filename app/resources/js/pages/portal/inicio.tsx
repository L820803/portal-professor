import { Link } from '@inertiajs/react';
import { ArrowUpRight, BookOpenCheck, CalendarX2, ClipboardCheck, FileBarChart2, TrendingUp, TriangleAlert } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import Screen from '@/portal/components/Screen';
import { href } from '@/portal/lib/nav';
import { authStore } from '@/portal/stores/authStore';
import type { DesempenhoModo } from '@/portal/types';
import { useStore } from '@/portal/lib/store';

// Cor de cada card de desempenho (ícone e fundo do ícone).
const PALETA = {
    teal: { bg: 'bg-sd-teal-soft', fg: 'text-sd-teal' },
    purple: { bg: 'bg-sd-purple-soft', fg: 'text-sd-purple' },
    danger: { bg: 'bg-sd-danger-bg', fg: 'text-sd-danger' },
    rose: { bg: 'bg-sd-rose-soft', fg: 'text-sd-rose' },
};

function firstName(fullName?: string | null): string {
    if (!fullName) return 'Professor(a)';
    const primeiro = fullName.trim().split(/\s+/)[0];
    return primeiro.charAt(0).toUpperCase() + primeiro.slice(1).toLowerCase();
}

/** Ação principal do dia (registro de aula e frequência): card grande e colorido. */
function AcaoCard({
    title,
    description,
    icon: Icone,
    url,
    escuro = false,
}: {
    title: string;
    description: string;
    icon: LucideIcon;
    url: string;
    escuro?: boolean;
}) {
    return (
        <Link
            href={url}
            className={cn(
                'group relative flex min-h-[200px] flex-col overflow-hidden rounded-3xl p-6 transition hover:-translate-y-0.5 hover:shadow-sd-hover focus-visible:ring-4 focus-visible:ring-sd-chalk focus-visible:outline-none',
                escuro ? 'bg-lousa text-white' : 'bg-sd-chalk text-sd-primary-dark',
            )}
        >
            <span className={cn('flex size-12 items-center justify-center rounded-2xl', escuro ? 'bg-white/10 text-sd-chalk' : 'bg-sd-primary-dark/10')} aria-hidden>
                <Icone className="size-6" />
            </span>
            <span className="mt-auto pt-6 font-brand text-[26px] leading-tight font-bold tracking-[-0.02em]">{title}</span>
            <span className={cn('mt-1 max-w-xs text-sm', escuro ? 'text-white/70' : 'text-sd-primary-dark/75')}>{description}</span>
            <ArrowUpRight
                className={cn('absolute top-6 right-6 size-6 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5', escuro ? 'text-white/50' : 'text-sd-primary-dark/50')}
                aria-hidden
            />
        </Link>
    );
}

function FeatureCard({
    title,
    description,
    icon: Icone,
    paleta,
    url,
}: {
    title: string;
    description: string;
    icon: LucideIcon;
    paleta: keyof typeof PALETA;
    url: string;
}) {
    const cor = PALETA[paleta];
    return (
        <Link
            href={url}
            className="group flex flex-col rounded-3xl border border-sd-border bg-sd-surface p-5 transition hover:-translate-y-0.5 hover:border-sd-primary/30 hover:shadow-sd-hover focus-visible:ring-4 focus-visible:ring-sd-primary-soft focus-visible:outline-none"
        >
            <span className="mb-5 flex items-center justify-between">
                <span className={cn('flex size-11 items-center justify-center rounded-2xl', cor.bg, cor.fg)} aria-hidden>
                    <Icone className="size-[22px]" />
                </span>
                <ArrowUpRight className="size-5 text-sd-disabled transition group-hover:text-sd-primary" aria-hidden />
            </span>
            <span className="mb-1 font-brand text-[18px] font-bold tracking-[-0.01em] text-sd-text">{title}</span>
            <span className="text-[13px] leading-[19px] text-sd-muted">{description}</span>
        </Link>
    );
}

const desempenho = (modo: DesempenhoModo) => href('/desempenho/turmas', { modo });

export default function Inicio() {
    const professor = useStore(authStore, (s) => s.professor);
    const hoje = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });

    return (
        <Screen welcomeLabel={`Bem-vindo(a) · ${hoje}`} welcomeName={firstName(professor?.nome)}>
            <div className="grid gap-4 md:grid-cols-2">
                <AcaoCard title="Registro de aula" description="Lance o conteúdo ministrado e as habilidades da BNCC." icon={BookOpenCheck} url="/registro-aula" escuro />
                <AcaoCard title="Frequência" description="Faça a chamada e lance presenças e faltas da turma." icon={ClipboardCheck} url="/frequencia" />
            </div>

            {/* Cards de desempenho: leitura das notas/faltas já lançadas; nada é gravado a partir deles. */}
            <h2 className="mt-10 mb-4 flex items-center gap-3 text-[11px] font-bold tracking-[1.2px] text-sd-muted uppercase">
                Acompanhe sua turma
                <span className="h-px flex-1 bg-sd-border" />
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <FeatureCard
                    title="Evolução das notas"
                    description="Acompanhe cada aluno ao longo dos períodos, não só a nota do momento."
                    icon={TrendingUp}
                    paleta="teal"
                    url={desempenho('evolucao')}
                />
                <FeatureCard
                    title="Relatório da turma"
                    description="Resumo do desempenho da turma e boletim individual de cada aluno."
                    icon={FileBarChart2}
                    paleta="purple"
                    url={desempenho('relatorio')}
                />
                <FeatureCard
                    title="Alunos em risco"
                    description="Baixa frequência, nota abaixo do mínimo ou em queda."
                    icon={TriangleAlert}
                    paleta="danger"
                    url={desempenho('risco')}
                />
                <FeatureCard
                    title="Quem está faltando"
                    description="Mapa de faltas por dia, alunos com faltas seguidas e últimos 7 dias."
                    icon={CalendarX2}
                    paleta="rose"
                    url={desempenho('frequencia')}
                />
            </div>
        </Screen>
    );
}
