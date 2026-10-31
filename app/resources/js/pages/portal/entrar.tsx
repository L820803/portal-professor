import { Head, router } from '@inertiajs/react';
import { Eye, EyeOff } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { AppButton, ErrorBanner, Logo, Marca } from '@/portal/components/ui';
import { extractErrorMessage } from '@/portal/services/client';
import { authStore, login } from '@/portal/stores/authStore';
import { useStore } from '@/portal/lib/store';

const inputClass =
    'mt-1.5 w-full rounded-xl border-[1.5px] border-sd-border bg-sd-surface px-4 py-3 text-base text-sd-text outline-none transition placeholder:text-sd-disabled focus:border-sd-primary focus:ring-4 focus:ring-sd-primary-soft';

export default function Entrar() {
    const isAuthenticated = useStore(authStore, (s) => s.isAuthenticated);
    const [loginValue, setLoginValue] = useState('');
    const [password, setPassword] = useState('');
    const [mostrarSenha, setMostrarSenha] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isAuthenticated) router.visit('/inicio', { replace: true });
    }, [isAuthenticated]);

    const canSubmit = loginValue.trim().length > 0 && password.length > 0 && !loading;

    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        if (!canSubmit) return;
        setError(null);
        setLoading(true);
        try {
            await login(loginValue.trim(), password);
        } catch (err) {
            setError(extractErrorMessage(err, 'Não foi possível entrar. Tente novamente.'));
            setLoading(false);
        }
    }

    return (
        <div className="flex min-h-screen bg-sd-bg font-sans text-sd-text">
            <Head title="Entrar" />

            {/* Lousa institucional — só em telas largas. */}
            <aside className="relative hidden w-[48%] flex-col justify-between overflow-hidden bg-lousa p-12 text-white lg:flex xl:p-16">
                <svg className="pointer-events-none absolute -right-10 bottom-24 w-[70%] text-white/[0.07]" viewBox="0 0 400 160" fill="none" aria-hidden>
                    <path d="M10 120c40-60 80-100 110-90s-10 90 30 95 70-110 120-120 70 40 120 20" stroke="currentColor" strokeWidth="18" strokeLinecap="round" />
                </svg>
                <div className="relative flex items-center gap-3">
                    <Logo size={44} claro />
                    <div>
                        <p className="text-[11px] font-semibold tracking-[1px] text-white/55 uppercase">Prefeitura do Município</p>
                        <p className="text-sm font-semibold">Secretaria Municipal de Educação</p>
                    </div>
                </div>
                <div className="relative">
                    <p className="font-brand text-[56px] leading-[1.02] font-extrabold tracking-[-0.03em] xl:text-[64px]">
                        Escreva a aula.
                        <br />
                        <span className="text-sd-chalk">O resto, o giz organiza.</span>
                    </p>
                    <ul className="mt-10 grid max-w-md gap-3 text-[15px] text-white/80">
                        {[
                            ['Frequência', 'a chamada da turma em poucos cliques'],
                            ['Registro de aula', 'conteúdo e habilidades da BNCC'],
                            ['Desempenho', 'evolução das notas e alunos em risco'],
                        ].map(([titulo, texto]) => (
                            <li key={titulo} className="flex items-baseline gap-3 border-t border-white/10 pt-3">
                                <span className="size-1.5 shrink-0 translate-y-[-2px] rounded-full bg-sd-accent" />
                                <span>
                                    <strong className="font-semibold text-white">{titulo}</strong> — {texto}
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>
                <p className="relative text-xs text-white/45">Mesmo acesso do aplicativo do professor.</p>
            </aside>

            <main className="flex flex-1 items-center justify-center px-4 py-12">
                <div className="w-full max-w-sm">
                    <div className="mb-8">
                        <div className="mb-6 flex items-center gap-2.5">
                            <Logo size={44} />
                            <Marca className="text-[40px] leading-none" />
                        </div>
                        <h1 className="font-brand text-[28px] leading-tight font-bold tracking-[-0.02em]">Boas-vindas de volta</h1>
                        <p className="mt-1 text-sm text-sd-muted">Entre com seu CPF e senha para abrir sua sala.</p>
                    </div>

                    <form onSubmit={handleSubmit}>
                        <ErrorBanner message={error} />

                        <label htmlFor="login" className="text-[13px] font-semibold text-sd-text">
                            CPF
                        </label>
                        <input
                            id="login"
                            className={inputClass}
                            placeholder="Login ou matrícula"
                            autoComplete="username"
                            autoCapitalize="none"
                            autoFocus
                            maxLength={11}
                            value={loginValue}
                            onChange={(e) => setLoginValue(e.target.value)}
                        />

                        <label htmlFor="senha" className="mt-5 block text-[13px] font-semibold text-sd-text">
                            Senha
                        </label>
                        <div className="relative">
                            <input
                                id="senha"
                                type={mostrarSenha ? 'text' : 'password'}
                                className={`${inputClass} pr-12`}
                                placeholder="Sua senha"
                                autoComplete="current-password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                            <button
                                type="button"
                                onClick={() => setMostrarSenha((v) => !v)}
                                className="absolute top-1/2 right-3 mt-0.5 -translate-y-1/2 text-sd-muted hover:text-sd-primary"
                                aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
                            >
                                {mostrarSenha ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
                            </button>
                        </div>

                        <AppButton type="submit" label="Entrar" loading={loading} disabled={!canSubmit} className="mt-8 w-full" />

                        <p className="mt-5 rounded-xl border border-dashed border-sd-chalk bg-sd-chalk-soft px-3 py-2.5 text-center text-xs font-medium text-sd-text">
                            Ambiente de demonstração: qualquer CPF e senha (3+ caracteres) entram. Os dados são fictícios.
                        </p>
                    </form>
                </div>
            </main>
        </div>
    );
}
