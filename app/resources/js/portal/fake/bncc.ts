import type { UnidadeTematicaBncc } from '../types';

/**
 * Árvore BNCC fake (unidade temática → objeto de conhecimento → habilidade)
 * por disciplina BNCC — substitui `get-habilidades-bncc`. Textos resumidos
 * a partir da BNCC, só para demonstração.
 */
const h = (codigo: string, nome: string) => ({ codigo, nome });

export const HABILIDADES_BNCC: Record<number, UnidadeTematicaBncc[]> = {
    10: [
        {
            nome: 'Leitura',
            objetosConhecimento: [
                {
                    nome: 'Reconstrução do contexto de produção, circulação e recepção de textos',
                    habilidades: [
                        h('EF69LP01', 'Diferenciar liberdade de expressão de discursos de ódio, posicionando-se contrariamente a esse tipo de discurso.'),
                        h('EF67LP01', 'Analisar a estrutura e o funcionamento dos hiperlinks em textos noticiosos publicados na Web.'),
                    ],
                },
                {
                    nome: 'Estratégia de leitura: apreender os sentidos globais do texto',
                    habilidades: [
                        h('EF67LP04', 'Distinguir, em segmentos descontínuos de textos, fato da opinião enunciada em relação a esse mesmo fato.'),
                        h('EF67LP05', 'Identificar e avaliar teses/opiniões/posicionamentos explícitos e argumentos em textos argumentativos.'),
                        h('EF06LP01', 'Reconhecer a impossibilidade de uma neutralidade absoluta no relato de fatos e identificar diferentes graus de parcialidade.'),
                    ],
                },
            ],
        },
        {
            nome: 'Produção de textos',
            objetosConhecimento: [
                {
                    nome: 'Planejamento de textos',
                    habilidades: [
                        h('EF67LP09', 'Planejar notícia impressa e para circulação em outras mídias, tendo em vista as condições de produção.'),
                        h('EF67LP10', 'Produzir notícia impressa tendo em vista características do gênero e os efeitos de sentido pretendidos.'),
                    ],
                },
                {
                    nome: 'Textualização, revisão e edição',
                    habilidades: [
                        h('EF67LP11', 'Planejar resenhas, vlogs, vídeos e podcasts variados, e textos e vídeos de apresentação e apreciação.'),
                        h('EF69LP08', 'Revisar/editar o texto produzido, tendo em vista sua adequação ao contexto de produção.'),
                    ],
                },
            ],
        },
        {
            nome: 'Análise linguística/semiótica',
            objetosConhecimento: [
                {
                    nome: 'Morfossintaxe',
                    habilidades: [
                        h('EF06LP04', 'Analisar a função e as flexões de substantivos e adjetivos e de verbos nos modos Indicativo, Subjuntivo e Imperativo.'),
                        h('EF06LP05', 'Identificar os efeitos de sentido dos modos verbais, considerando o gênero textual e a intenção comunicativa.'),
                        h('EF06LP06', 'Empregar, adequadamente, as regras de concordância nominal e verbal.'),
                    ],
                },
                {
                    nome: 'Fono-ortografia',
                    habilidades: [
                        h('EF67LP32', 'Escrever palavras com correção ortográfica, obedecendo as convenções da língua escrita.'),
                        h('EF67LP33', 'Pontuar textos adequadamente.'),
                    ],
                },
            ],
        },
        {
            nome: 'Oralidade',
            objetosConhecimento: [
                {
                    nome: 'Discussão oral',
                    habilidades: [
                        h('EF69LP15', 'Apresentar argumentos e contra-argumentos coerentes, respeitando os turnos de fala, em discussões sobre temas controversos.'),
                    ],
                },
            ],
        },
    ],
    20: [
        {
            nome: 'Leitura/escuta (compartilhada e autônoma)',
            objetosConhecimento: [
                {
                    nome: 'Decodificação/Fluência de leitura',
                    habilidades: [
                        h('EF12LP01', 'Ler palavras novas com precisão na decodificação; no caso de palavras de uso frequente, ler globalmente, por memorização.'),
                    ],
                },
                {
                    nome: 'Compreensão em leitura',
                    habilidades: [
                        h('EF12LP02', 'Buscar, selecionar e ler, com a mediação do professor, textos que circulam em meios impressos ou digitais.'),
                        h('EF02LP26', 'Ler e compreender, com certa autonomia, textos literários de gêneros variados.'),
                    ],
                },
            ],
        },
        {
            nome: 'Análise linguística/semiótica (Alfabetização)',
            objetosConhecimento: [
                {
                    nome: 'Construção do sistema alfabético e da ortografia',
                    habilidades: [
                        h('EF02LP01', 'Utilizar, ao produzir o texto, grafia correta de palavras conhecidas ou com estruturas silábicas já dominadas.'),
                        h('EF02LP02', 'Segmentar palavras em sílabas e remover e substituir sílabas iniciais, mediais ou finais para criar novas palavras.'),
                        h('EF02LP03', 'Ler e escrever palavras com correspondências regulares diretas entre letras e fonemas (f, v, t, d, p, b).'),
                    ],
                },
            ],
        },
    ],
    21: [
        {
            nome: 'Números',
            objetosConhecimento: [
                {
                    nome: 'Leitura, escrita, comparação e ordenação de números de até três ordens',
                    habilidades: [
                        h('EF02MA01', 'Comparar e ordenar números naturais (até a ordem de centenas) pela compreensão de características do sistema de numeração decimal.'),
                        h('EF02MA02', 'Fazer estimativas por meio de estratégias diversas a respeito da quantidade de objetos de coleções.'),
                    ],
                },
                {
                    nome: 'Problemas envolvendo adição e subtração',
                    habilidades: [
                        h('EF02MA06', 'Resolver e elaborar problemas de adição e de subtração, envolvendo números de até três ordens.'),
                    ],
                },
            ],
        },
        {
            nome: 'Grandezas e medidas',
            objetosConhecimento: [
                {
                    nome: 'Medida de comprimento: unidades não padronizadas e padronizadas',
                    habilidades: [
                        h('EF02MA16', 'Estimar, medir e comparar comprimentos de lados de salas, objetos e outros, utilizando unidades de medida padronizadas.'),
                    ],
                },
                {
                    nome: 'Sistema monetário brasileiro',
                    habilidades: [
                        h('EF02MA20', 'Estabelecer a equivalência de valores entre moedas e cédulas do sistema monetário brasileiro.'),
                    ],
                },
            ],
        },
    ],
    22: [
        {
            nome: 'Vida e evolução',
            objetosConhecimento: [
                {
                    nome: 'Seres vivos no ambiente',
                    habilidades: [
                        h('EF02CI04', 'Descrever características de plantas e animais que fazem parte do cotidiano e relacioná-las ao ambiente em que vivem.'),
                        h('EF02CI05', 'Investigar a importância da água e da luz para a manutenção da vida de plantas em geral.'),
                    ],
                },
            ],
        },
        {
            nome: 'Terra e Universo',
            objetosConhecimento: [
                {
                    nome: 'Movimento aparente do Sol no céu',
                    habilidades: [
                        h('EF02CI07', 'Descrever as posições do Sol em diversos horários do dia e associá-las ao tamanho da sombra projetada.'),
                    ],
                },
            ],
        },
    ],
    23: [
        {
            nome: 'Artes visuais',
            objetosConhecimento: [
                {
                    nome: 'Elementos da linguagem',
                    habilidades: [
                        h('EF15AR02', 'Explorar e reconhecer elementos constitutivos das artes visuais (ponto, linha, forma, cor, espaço, movimento etc.).'),
                    ],
                },
                {
                    nome: 'Materialidades',
                    habilidades: [
                        h('EF15AR04', 'Experimentar diferentes formas de expressão artística (desenho, pintura, colagem, quadrinhos, dobradura, escultura).'),
                    ],
                },
            ],
        },
        {
            nome: 'Música',
            objetosConhecimento: [
                {
                    nome: 'Contextos e práticas',
                    habilidades: [
                        h('EF15AR13', 'Identificar e apreciar criticamente diversas formas e gêneros de expressão musical.'),
                    ],
                },
            ],
        },
    ],
    30: [
        {
            nome: 'Crianças pequenas (4 anos a 5 anos e 11 meses)',
            objetosConhecimento: [
                {
                    nome: 'Convivência e cuidado com o outro',
                    habilidades: [
                        h('EI03EO01', 'Demonstrar empatia pelos outros, percebendo que as pessoas têm diferentes sentimentos, necessidades e maneiras de pensar e agir.'),
                        h('EI03EO03', 'Ampliar as relações interpessoais, desenvolvendo atitudes de participação e cooperação.'),
                        h('EI03EO04', 'Comunicar suas ideias e sentimentos a pessoas e grupos diversos.'),
                    ],
                },
            ],
        },
    ],
    31: [
        {
            nome: 'Crianças pequenas (4 anos a 5 anos e 11 meses)',
            objetosConhecimento: [
                {
                    nome: 'Movimento, expressão e coordenação',
                    habilidades: [
                        h('EI03CG01', 'Criar com o corpo formas diversificadas de expressão de sentimentos, sensações e emoções.'),
                        h('EI03CG02', 'Demonstrar controle e adequação do uso de seu corpo em brincadeiras e jogos, escuta e reconto de histórias.'),
                        h('EI03CG05', 'Coordenar suas habilidades manuais no atendimento adequado a seus interesses e necessidades.'),
                    ],
                },
            ],
        },
    ],
    32: [
        {
            nome: 'Crianças pequenas (4 anos a 5 anos e 11 meses)',
            objetosConhecimento: [
                {
                    nome: 'Oralidade e escrita',
                    habilidades: [
                        h('EI03EF01', 'Expressar ideias, desejos e sentimentos sobre suas vivências, por meio da linguagem oral e escrita.'),
                        h('EI03EF03', 'Escolher e folhear livros, procurando orientar-se por temas e ilustrações e tentando identificar palavras conhecidas.'),
                        h('EI03EF09', 'Levantar hipóteses em relação à linguagem escrita, realizando registros de palavras e textos por meio de escrita espontânea.'),
                    ],
                },
            ],
        },
    ],
};

export function codigosHabilidades(disciplinaBncc: number): string[] {
    return (HABILIDADES_BNCC[disciplinaBncc] ?? []).flatMap((u) =>
        u.objetosConhecimento.flatMap((o) => o.habilidades.map((x) => x.codigo)),
    );
}
