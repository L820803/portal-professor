import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { subtituloTurma, useCarregar, useTurmaParams } from '@/portal/components/desempenho';
import Screen from '@/portal/components/Screen';
import { AppButton, Carregando, ErrorBanner } from '@/portal/components/ui';
import { formatDatePtBr } from '@/portal/lib/dateUtils';
import { numero, voltar } from '@/portal/lib/nav';
import * as gestaoSalaService from '@/portal/services/gestaoSalaService';
import type { FichaAluno } from '@/portal/types';

const SEXO: Record<string, string> = { M: 'Masculino', F: 'Feminino' };

/** Linha "rótulo: valor"; omitida sem valor. Com `link`, vira tel:/mailto:. */
function Linha({ rotulo, valor, link }: { rotulo: string; valor: string | null | undefined; link?: string }) {
    if (!valor) return null;
    return (
        <div className="flex flex-col py-1.5 sm:flex-row sm:gap-4">
            <span className="text-xs font-semibold text-sd-muted sm:w-40 sm:shrink-0 sm:text-sm">{rotulo}</span>
            {link ? (
                <a href={link} className="text-[15px] font-semibold text-sd-primary-light hover:underline">
                    {valor}
                </a>
            ) : (
                <span className="text-[15px] text-sd-text">{valor}</span>
            )}
        </div>
    );
}

function Bloco({ titulo, temConteudo, vazio, children }: { titulo: string; temConteudo: boolean; vazio?: string; children?: ReactNode }) {
    return (
        <section className="rounded-2xl bg-sd-surface p-4 shadow-sd-card sm:p-5">
            <h2 className="mb-2 text-xs font-bold tracking-[0.5px] text-sd-primary-light uppercase">{titulo}</h2>
            {temConteudo ? children : <p className="text-sm text-sd-muted italic">{vazio ?? 'Não informado no e-cidade.'}</p>}
        </section>
    );
}

const tel = (n: string | null) => (n ? `tel:${n.replace(/\D/g, '')}` : undefined);

function Ficha({ ficha }: { ficha: FichaAluno }) {
    const { aluno, filiacao, responsavel, matricula } = ficha;
    const nascimento = aluno.dataNascimento
        ? `${formatDatePtBr(aluno.dataNascimento)}${aluno.idade !== null ? ` (${aluno.idade} anos)` : ''}`
        : aluno.idade !== null
          ? `${aluno.idade} anos`
          : null;
    return (
        <div className="space-y-4">
            <div className="rounded-2xl bg-sd-surface p-4 shadow-sd-card sm:p-5">
                <p className="text-[19px] font-bold text-sd-text">{aluno.nome}</p>
                {aluno.nomeSocial ? <p className="text-sm text-sd-muted">Nome social: {aluno.nomeSocial}</p> : null}
                <p className="text-sm text-sd-muted">
                    Cód. {aluno.codigo} · matrícula {matricula.codigo}
                    {matricula.avaliadoPorParecer ? ' · avaliado por parecer' : ''}
                </p>
                <span className={cn('mt-2 inline-flex rounded-lg px-2.5 py-1 text-xs font-bold', matricula.ativo ? 'bg-sd-success-bg text-sd-success' : 'bg-sd-danger-bg text-sd-danger')}>
                    {matricula.situacao || (matricula.ativo ? 'Ativo' : 'Inativo')}
                    {matricula.dataMatricula ? ` · desde ${formatDatePtBr(matricula.dataMatricula)}` : ''}
                    {matricula.dataEncerramento ? ` · encerrada em ${formatDatePtBr(matricula.dataEncerramento)}` : ''}
                </span>
                {matricula.observacao ? <p className="mt-2 text-sm text-sd-muted">Observação da matrícula: {matricula.observacao}</p> : null}
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
                <Bloco titulo="Responsável" temConteudo={Boolean(responsavel.nome || responsavel.celular || responsavel.email)} vazio="Sem responsável cadastrado no e-cidade.">
                    <Linha rotulo="Nome" valor={responsavel.nome} />
                    <Linha rotulo="Celular" valor={responsavel.celular} link={tel(responsavel.celular)} />
                    <Linha rotulo="E-mail" valor={responsavel.email} link={responsavel.email ? `mailto:${responsavel.email}` : undefined} />
                </Bloco>
                <Bloco titulo="Filiação" temConteudo={Boolean(filiacao.mae || filiacao.pai)}>
                    <Linha rotulo="Mãe" valor={filiacao.mae} />
                    <Linha rotulo="Pai" valor={filiacao.pai} />
                </Bloco>
                <Bloco titulo="Aluno" temConteudo={Boolean(nascimento || aluno.sexo || aluno.telefone || aluno.celular || aluno.email)}>
                    <Linha rotulo="Nascimento" valor={nascimento} />
                    <Linha rotulo="Sexo" valor={aluno.sexo ? (SEXO[aluno.sexo.toUpperCase()] ?? aluno.sexo) : null} />
                    <Linha rotulo="Telefone" valor={aluno.telefone} link={tel(aluno.telefone)} />
                    <Linha rotulo="Celular" valor={aluno.celular} link={tel(aluno.celular)} />
                    <Linha rotulo="E-mail" valor={aluno.email} link={aluno.email ? `mailto:${aluno.email}` : undefined} />
                </Bloco>
                <Bloco titulo="Necessidades especiais" temConteudo={ficha.necessidadesEspeciais.length > 0} vazio="Nenhuma registrada.">
                    <ul className="list-disc space-y-1 pl-5 text-[15px]">
                        {ficha.necessidadesEspeciais.map((n) => (
                            <li key={n.codigo}>{n.descricao ?? `Código ${n.codigo}`}</li>
                        ))}
                    </ul>
                </Bloco>
                <Bloco titulo="Atendimento educacional especializado" temConteudo={ficha.atendimentoEspecializado.length > 0} vazio="Nenhum laudo ou atendimento registrado.">
                    {ficha.atendimentoEspecializado.map((a) => (
                        <div key={a.codigo} className="mb-2">
                            <p className="text-[15px]">
                                {a.dataEmissao ? `${formatDatePtBr(a.dataEmissao)} · ` : ''}
                                {a.atendimentos ?? 'Atendimento sem descrição'}
                            </p>
                            {a.parecer ? <p className="mt-1 text-sm text-sd-muted">{a.parecer}</p> : null}
                        </div>
                    ))}
                </Bloco>
                <Bloco titulo="Notificações de falta ao responsável" temConteudo={ficha.notificacoesFalta.length > 0} vazio="A escola ainda não registrou notificação de falta.">
                    <ul className="list-disc space-y-1 pl-5 text-[15px]">
                        {ficha.notificacoesFalta.map((n) => (
                            <li key={n.data}>
                                {formatDatePtBr(n.data)} — {n.faltas} falta{n.faltas === 1 ? '' : 's'} notificada{n.faltas === 1 ? '' : 's'}
                            </li>
                        ))}
                    </ul>
                </Bloco>
            </div>
            <p className="text-xs text-sd-muted">
                Dados do cadastro do aluno no e-cidade. Para corrigir telefone, responsável ou situação da matrícula, procure a secretaria da escola.
            </p>
        </div>
    );
}

/** Ficha cadastral do aluno (responsável, matrícula, AEE) — só leitura. */
export default function FichaAlunoPage() {
    const { params, query } = useTurmaParams();
    const codigoAluno = numero(query.get('aluno'));
    const { dados, loading, error, recarregar } = useCarregar(
        params && codigoAluno !== null ? `${params.escola.codigo}|${params.turma.codigo}|${params.etapa.codigo}|${codigoAluno}` : null,
        () => gestaoSalaService.getFichaAluno(params!.escola.codigo, params!.turma.codigo, params!.etapa.codigo, codigoAluno!),
        'Não foi possível carregar a ficha do aluno.',
    );

    return (
        <Screen title="Ficha do aluno" subtitle={subtituloTurma(params, dados)} onBack={() => voltar('/inicio')}>
            {loading ? (
                <Carregando message="Carregando ficha..." />
            ) : (
                <>
                    {error ? (
                        <>
                            <ErrorBanner message={error} />
                            <AppButton label="Tentar novamente" variant="outline" onClick={recarregar} />
                        </>
                    ) : null}
                    {dados ? <Ficha ficha={dados} /> : null}
                </>
            )}
        </Screen>
    );
}
