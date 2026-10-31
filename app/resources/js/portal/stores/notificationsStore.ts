import { createStore } from '../lib/store';
import { getDb, salvar } from '../fake/db';
import type { Mensagem } from '../types';

// Mensagens simuladas (também no mobile ainda não há endpoint de mensagens).
const MENSAGENS: Omit<Mensagem, 'lida'>[] = [
    {
        id: 'm1',
        titulo: 'Prazo de lançamento de notas do 4º bimestre',
        corpo: 'O prazo para lançamento das notas do 4º bimestre encerra em 18/12. Não deixe para a última hora: notas e frequência precisam estar completas para o fechamento do ano letivo.',
        data: '2026-10-29T09:30:00',
    },
    {
        id: 'm2',
        titulo: 'Reunião pedagógica',
        corpo: 'Reunião pedagógica marcada para sexta-feira, 06/11, às 14h no auditório da escola. Pauta: conselho de classe e planejamento do recesso.',
        data: '2026-10-27T16:00:00',
    },
    {
        id: 'm3',
        titulo: 'Portal do Professor na web',
        corpo: 'Agora você pode lançar frequência, registrar aulas e acompanhar o desempenho das turmas também pelo computador, com o mesmo acesso do aplicativo.',
        data: '2026-10-20T08:00:00',
    },
    {
        id: 'm4',
        titulo: 'Busca ativa de alunos faltosos',
        corpo: 'Professores: consultem o card "Quem está faltando" e informem à coordenação os alunos com 3 ou mais dias seguidos sem comparecer.',
        data: '2026-10-15T11:20:00',
    },
    {
        id: 'm5',
        titulo: 'Formação continuada — BNCC',
        corpo: 'Inscrições abertas para a formação sobre habilidades da BNCC no registro de aula. Vagas limitadas, inscreva-se na secretaria.',
        data: '2026-10-02T10:00:00',
    },
];

interface NotificationsState {
    mensagens: Mensagem[];
    unreadCount: number;
}

function montar(): NotificationsState {
    const lidas = new Set(getDb().mensagensLidas);
    const mensagens = MENSAGENS.map((m) => ({ ...m, lida: lidas.has(m.id) }));
    return { mensagens, unreadCount: mensagens.filter((m) => !m.lida).length };
}

export const notificationsStore = createStore<NotificationsState>({
    mensagens: [],
    unreadCount: 0,
});

let carregado = false;

export function carregarMensagens(): void {
    if (carregado) return;
    carregado = true;
    notificationsStore.setState(montar());
}

function gravarLidas(ids: string[]): void {
    const db = getDb();
    db.mensagensLidas = Array.from(new Set([...db.mensagensLidas, ...ids]));
    salvar();
    notificationsStore.setState(montar());
}

export function marcarComoLida(id: string): void {
    gravarLidas([id]);
}

export function marcarTodasComoLidas(): void {
    gravarLidas(MENSAGENS.map((m) => m.id));
}
