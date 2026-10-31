import { ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Modal } from './ui';

export interface AjudaSecao {
    grupo: string;
    titulo: string;
    texto: string;
    itens?: string[];
}

/** Passo a passo do Registro de aula — também usado pelo guia da própria tela. */
export const SECOES_REGISTRO_AULA: AjudaSecao[] = [
    {
        grupo: 'Registro de aula',
        titulo: 'Para que serve',
        texto: 'Registrar o conteúdo ministrado em cada aula e as habilidades da BNCC trabalhadas.',
    },
    {
        grupo: 'Registro de aula',
        titulo: 'Novo registro',
        texto: 'Clique em "+ Novo registro" e preencha os campos na ordem em que aparecem:',
        itens: [
            'Turma e etapa (se você tiver uma só, já vêm escolhidas).',
            '"Também lançar para": marque outras turmas da mesma etapa para lançar o mesmo conteúdo de uma vez.',
            'Data da aula, aulas dadas e, se houve avaliação, o instrumento avaliativo.',
            'Conteúdo desenvolvido: descreva em poucas palavras o que foi ensinado.',
            'Regência e habilidades BNCC: marque ao menos uma habilidade. Use a busca por código (ex.: EF06LP04), ano (ex.: 06) ou palavra-chave.',
            'Clique em "Salvar" — conteúdo e habilidades são salvos juntos.',
        ],
    },
    {
        grupo: 'Registro de aula',
        titulo: 'Editar, excluir e filtrar',
        texto: 'Clique em um registro da lista para abrir e editar. O ícone de lixeira exclui o registro (pede confirmação). Use "Filtros" para ver só uma turma, etapa, regência ou data.',
        itens: [
            'Se já existe um conteúdo para a mesma regência e data, o formulário abre preenchido com ele — salvar atualiza o registro em vez de duplicar.',
        ],
    },
];

const SECOES: AjudaSecao[] = [
    {
        grupo: 'Acesso',
        titulo: 'Entrar e sair',
        texto: 'Informe seu CPF e sua senha do e-cidade e clique em "Entrar". Para sair, use o ícone de porta no canto superior direito e confirme.',
        itens: ['Ambiente de demonstração: qualquer CPF e senha (3 ou mais caracteres) entram, e todos os dados são fictícios.'],
    },
    {
        grupo: 'Cabeçalho e navegação',
        titulo: 'O que há no topo de todas as telas',
        texto: 'A faixa superior é a mesma em todo o portal:',
        itens: [
            'Bolinha verde = com internet; vermelha = sem internet.',
            'Interrogação = este manual.',
            'Sino = mensagens. O número vermelho mostra quantas ainda não foram lidas.',
            'Porta = sair.',
            'Nas telas internas, a seta volta uma tela e a casinha leva direto à tela inicial.',
        ],
    },
    {
        grupo: 'Frequência',
        titulo: 'Lançar a chamada',
        texto: 'No card "Frequência", escolha a escola e a turma (se houver uma só, o portal pula a escolha). A lista abre na data de hoje.',
        itens: [
            'Clique na data para abrir o calendário e trocar o dia — só dias letivos até hoje ficam liberados.',
            'Todos começam presentes. Clique no aluno para marcar falta; com mais de uma aula no dia, marque a falta por aula.',
            '"Marcar todos" deixa todos presentes; "Desmarcar" marca falta para todos. Alunos com cadeado (ex.: transferidos) não podem ser alterados.',
            '"Sincronizar" lê os registros da catraca da escola.',
            'Clique em "Salvar frequência", confira o resumo e confirme.',
        ],
    },
    ...SECOES_REGISTRO_AULA,
    {
        grupo: 'Desempenho da turma',
        titulo: 'Evolução, relatório e alunos em risco',
        texto: 'Os cards de desempenho só leem as notas e faltas já lançadas — nada é gravado a partir deles. Escolha a escola e a turma; com mais de uma disciplina sua na turma, escolha a disciplina no topo.',
        itens: [
            'Evolução das notas: barras por período (verde atingiu o mínimo, vermelha não) e a tendência entre os dois últimos períodos.',
            'Relatório da turma: totais do período (acima/abaixo do mínimo, sem lançamento, média, frequência) e a lista de alunos.',
            'Alunos em risco: frequência baixa, nota abaixo do mínimo ou em queda, do mais grave para o menos grave.',
            'Clique em um aluno para abrir o boletim; no boletim há a projeção de nota e as observações por período.',
        ],
    },
    {
        grupo: 'Desempenho da turma',
        titulo: 'Quem está faltando',
        texto: 'Mapa aluno × dia das faltas do bimestre atual: verde presente, vermelho faltou o dia, âmbar faltou parte das aulas. Ordene por dias seguidos, faltas nos últimos 7 dias ou menor frequência e clique no aluno para ver os detalhes.',
    },
    {
        grupo: 'Desempenho da turma',
        titulo: 'Ficha do aluno',
        texto: 'Responsável, telefone, filiação, situação da matrícula, necessidades especiais, atendimento especializado e notificações de falta já enviadas. Aberta pelo boletim, pela lista de risco e pelo mapa de faltas.',
    },
    {
        grupo: 'Mensagens',
        titulo: 'Ler avisos e comunicados',
        texto: 'Pelo sino, veja as mensagens novas e as já lidas. Clique em uma mensagem para marcá-la como lida.',
    },
];

export default function ManualAppModal({ open, onClose, secoes = SECOES, titulo = 'Manual do portal' }: {
    open: boolean;
    onClose: () => void;
    secoes?: AjudaSecao[];
    titulo?: string;
}) {
    const [aberta, setAberta] = useState<number | null>(0);
    const grupos = Array.from(new Set(secoes.map((s) => s.grupo)));

    return (
        <Modal open={open} onClose={onClose} title={titulo} description="Tudo o que o portal faz hoje, em poucas palavras." className="max-w-2xl">
            <div className="space-y-5">
                {grupos.map((grupo) => (
                    <section key={grupo}>
                        <h3 className="mb-2 text-xs font-bold tracking-[0.5px] text-sd-primary-light uppercase">{grupo}</h3>
                        <div className="divide-y divide-sd-border rounded-xl border border-sd-border">
                            {secoes.map((secao, i) =>
                                secao.grupo !== grupo ? null : (
                                    <div key={secao.titulo}>
                                        <button
                                            type="button"
                                            onClick={() => setAberta(aberta === i ? null : i)}
                                            className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-sd-bg"
                                            aria-expanded={aberta === i}
                                        >
                                            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-sd-primary text-xs font-bold text-white">{i + 1}</span>
                                            <span className="flex-1 text-[15px] font-semibold text-sd-text">{secao.titulo}</span>
                                            <ChevronDown className={cn('size-4 text-sd-muted transition', aberta === i && 'rotate-180')} />
                                        </button>
                                        {aberta === i ? (
                                            <div className="px-4 pb-4 pl-13 text-sm leading-relaxed text-sd-muted">
                                                <p>{secao.texto}</p>
                                                {secao.itens ? (
                                                    <ul className="mt-2 list-disc space-y-1 pl-5">
                                                        {secao.itens.map((item) => (
                                                            <li key={item}>{item}</li>
                                                        ))}
                                                    </ul>
                                                ) : null}
                                            </div>
                                        ) : null}
                                    </div>
                                ),
                            )}
                        </div>
                    </section>
                ))}
            </div>
        </Modal>
    );
}
