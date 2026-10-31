// Interfaces copiadas do app mobile (mobile-teacher/src/models/types.ts) — mesmos
// contratos da API mobile do e-cidade, para que os services fake de
// `portal/services` possam ser trocados pelos reais sem mexer nas telas.

export interface Professor {
  usuario: number;
  nome?: string;
  login?: string;
  cgm?: number;
  email?: string;
  [key: string]: unknown;
}

export interface LoginResponse {
  access_token: string;
  token_type?: string;
  expires_in?: number;
  professor?: Professor;
}

export interface Escola {
  codigo: string;
  nome: string;
}

export interface Disciplina {
  codigo: string;
  nome: string;
}

export interface Turma {
  codigo: string;
  nome: string;
}

export interface DiaLetivo {
  data: string; // "YYYY-MM-DD"
  habilitado: boolean;
  /** Turmas com aula prevista nesse dia (a API já retorna isso junto de dias-letivos). */
  turmas: Turma[];
}

export interface Aluno {
  codigo: number;
  nome: string;
  foto?: string;
  /** Situação da matrícula do aluno na turma (ex.: "MATRICULADO", "TRANSFERIDO FORA"). */
  situacao?: string;
  /** Quando true, a API bloqueia o lançamento de falta para este aluno (ex.: transferido/saída). */
  bloqueioFalta?: boolean;
  /** Códigos de regência em que o aluno já possui falta lançada (se a API suportar edição). */
  faltasLancadas?: number[];
}

/** Uma regência representa uma aula/horário específico dentro do dia letivo. */
export interface Regencia {
  codigo: number;
  descricao?: string;
}

/**
 * Formato normalizado da resposta de `alunos-turma`. A API pode retornar um
 * array simples de alunos ou um objeto com `alunos` + `regencias` — ver
 * document.md seção 7 (itens em aberto sobre múltiplas regências). O service
 * normaliza ambos os formatos para este shape.
 */
export interface AlunosTurmaResponse {
  alunos: Aluno[];
  regencias: Regencia[];
}

export interface SalvarDiarioAluno {
  codigo: number;
  faltas: number[]; // códigos de regência em que o aluno faltou
}

export interface SalvarDiarioPayload {
  data: string;
  regencias: number[];
  alunos: SalvarDiarioAluno[];
}

export interface SalvarDiarioResponse {
  sucesso?: boolean;
  mensagem?: string;
  [key: string]: unknown;
}

export interface SincronizarAcessoResponse {
  sincronizados?: number;
  mensagem?: string;
  [key: string]: unknown;
}

/** Estado de navegação/seleção acumulado ao longo do fluxo do diário de classe. */
export interface DiarioSelection {
  escola: Escola | null;
  disciplina: Disciplina | null;
  data: string | null;
  turma: Turma | null;
  regencias: Regencia[];
}

/** Mensagem/aviso recebido pelo professor, exibido no sino de notificações da Home. */
export interface Mensagem {
  id: string;
  titulo: string;
  corpo: string;
  data: string; // ISO 8601
  lida: boolean;
}

// ---------------------------------------------------------------------------
// Registro de Aula (conteúdo desenvolvido) — ver document.md seção 11.
// Contratos inferidos a partir das respostas reais de
// `/registro-aula/get-dados-regente` e `/registro-aula/get-conteudos-regente-escola`
// (ambiente de homologação).
// ---------------------------------------------------------------------------

/** Uma opção de turno/referência de turno (ex.: "TARDE") — usada em `turnoReferente`. */
export interface TurnoReferenciaOption {
  value: number;
  name: string;
}

/** Turma em que o professor é regente, conforme `get-dados-regente`. */
export interface TurmaRegente {
  codigo: number;
  nome: string;
  turno?: { codigo: number; nome: string };
  /** Opções de turno-referência da turma; quase sempre um único item (auto-selecionado). */
  turnoReferente: TurnoReferenciaOption[];
  /** 'D' (dias letivos) trava o campo "aulas dadas" em 1 — é calculado automaticamente por dia. */
  medidaFrequencia?: string;
  /** Período letivo do calendário da turma — usado para limitar o seletor de data. */
  calendario?: { inicio?: string; fim?: string };
}

/** Etapa/série de ensino de uma turma regente (ex.: "2º ANO"). */
export interface EtapaRegente {
  codigo: number;
  nome: string;
  turmaCodigo: number;
  /** Código do ensino (usado para buscar `tipos-instrumentos-avaliativos/{ensino}`). */
  ensinoCodigo?: number;
}

/** Regência (par turma+disciplina) em que o professor pode lançar conteúdo. */
export interface RegenciaRegente {
  codigo: number;
  disciplina: string;
  /** Código da disciplina da escola (`Disciplina`/`caddisciplina`) vinculada a esta regência. */
  disciplinaCodigo?: number;
  turmaCodigo: number;
  etapaCodigo: number;
  /**
   * Disciplinas BNCC equivalentes à disciplina desta regência, já embutidas por `get-dados-regente`
   * (ver `RegenciaResource::toResponse` no backend). Quando há só uma, a seleção do formulário é
   * automática e a etapa "DISCIPLINA"/"CAMPOS DE EXPERIÊNCIA" fica oculta — a regência já implica a
   * disciplina; quando há mais de uma (regência única/polivalente dos Anos Iniciais/Educação
   * Infantil, onde um professor leciona várias disciplinas sob uma só regência), o professor escolhe.
   */
  disciplinasBncc: DisciplinaBncc[];
  /** Cor cadastrada para a disciplina da escola vinculada a esta regência (`DisciplinaResource.cor`
   *  no backend) — mesma cor devolvida em cada item de `disciplinasBncc`, usada para dar
   *  identidade visual consistente à regência (chip de seleção, card de habilidades etc.). */
  cor?: string;
  /**
   * Regência que equivale a mais de uma disciplina BNCC (um só professor/regência cobrindo
   * várias disciplinas — regência única dos Anos Iniciais, ou os vários campos de experiência
   * da Educação Infantil, ex.: "Língua Portuguesa" e "Corpo, gestos e movimentos") — mesmo
   * critério que decide, no formulário, se as habilidades aparecem unificadas
   * (`HabilidadesUnificadasSection`) em vez de por uma só disciplina. Usado para avisar o
   * professor de que, ao lançar habilidades nesta regência, as de todas as disciplinas
   * equivalentes aparecem juntas.
   */
  polivalente?: boolean;
}

/** Opções de filtro/formulário (turmas/etapas/regências) derivadas de `get-dados-regente`. */
export interface DadosRegente {
  /** Código do usuário (professor) logado — exigido pelo payload de `salvar-conteudo`. */
  usuario: number;
  turmas: TurmaRegente[];
  etapas: EtapaRegente[];
  regencias: RegenciaRegente[];
}

/** Tipo de instrumento avaliativo (ex.: prova, trabalho) — opcional em `salvar-conteudo`. */
export interface TipoInstrumentoAvaliativo {
  codigo: number;
  nome: string;
}

/** Payload de `POST /registro-aula/salvar-conteudo` (criação ou edição, via `codigo`). */
export interface SalvarConteudoPayload {
  codigo?: number;
  usuario: number;
  turma: number;
  etapa: number;
  regencia: number;
  conteudo: string;
  data: string; // "YYYY-MM-DD"
  turnoReferente: number;
  tipoInstrumento?: number | null;
  aulasDadas: number;
}

/**
 * Conteúdo devolvido por `salvar-conteudo` e por `get-conteudos-regente-escola`
 * quando usado para localizar um registro existente (regência+data) — inclui os
 * códigos (turno, turnoReferente, tipoInstrumento) necessários para reabrir o
 * formulário em modo de edição, ao contrário de `ConteudoRegistroAula` (lista),
 * que só guarda os nomes para exibição no card.
 */
export interface ConteudoRegistroAulaDetalhe {
  codigo: number;
  data: string;
  conteudo: string;
  aulasDadas: number;
  disciplina: string;
  turma: { codigo: number; nome: string };
  etapa: { codigo: number; nome: string };
  regencia: number;
  turno?: { codigo: number; nome: string };
  turnoReferente?: TurnoReferenciaOption;
  tipoInstrumento?: { codigo: number; nome: string } | null;
  usuario?: number;
}

// ---------------------------------------------------------------------------
// Habilidades BNCC vinculadas ao conteúdo desenvolvido — ver document.md
// seção 12. Contratos inferidos de `get-disciplinas-bncc`, `get-habilidades-bncc`
// e `get-habilidades-desenvolvidas` (ambiente de homologação).
// ---------------------------------------------------------------------------

/** Disciplina BNCC (pode ser diferente da disciplina escolar da regência). */
export interface DisciplinaBncc {
  codigo: number;
  nome: string;
  sigla?: string;
  areaConhecimento?: string;
  ensino?: string;
  /** Cor da disciplina da escola vinculada à regência (`DisciplinaResource.cor` no backend) —
   *  mesma para todas as disciplinas BNCC equivalentes de uma mesma regência (ver `RegenciaRegente.cor`). */
  cor?: string;
}

/**
 * Referencial curricular estadual de uma habilidade BNCC. Quando presente,
 * é o referencial (não a habilidade BNCC em si) que deve ser selecionado e
 * enviado a `salvar-habilidade-desenvolvida` — replica a flag `temReferencial`
 * de `LancamentoHabilidadesBNCC.vue`.
 */
export interface HabilidadeBnccReferencial {
  codigo: string;
  nome: string;
}

export interface HabilidadeBncc {
  codigo: string;
  nome: string;
  referencial?: HabilidadeBnccReferencial[];
}

export interface ObjetoConhecimentoBncc {
  nome: string;
  habilidades: HabilidadeBncc[];
}

export interface UnidadeTematicaBncc {
  nome: string;
  objetosConhecimento: ObjetoConhecimentoBncc[];
}

/** Payload de `POST /registro-aula/salvar-habilidade-desenvolvida` — substitui
 *  por completo as habilidades já salvas para o par disciplina+conteúdo. */
export interface SalvarHabilidadesPayload {
  disciplina: number;
  habilidades: string[];
  conteudoDesenvolvido: number;
}

/** Um registro de conteúdo desenvolvido em aula, já normalizado para a UI. */
export interface ConteudoRegistroAula {
  codigo: number;
  data: string; // "YYYY-MM-DD"
  conteudo: string;
  aulasDadas: number;
  disciplina: string;
  turma: { codigo: number; nome: string };
  etapa: { codigo: number; nome: string };
  regencia: number;
  turno?: string;
  tipoInstrumento?: string | null;
}

/** Filtros aceitos por `get-conteudos-regente-escola` (todos opcionais). */
export interface RegistroAulaFiltros {
  turma?: number;
  etapa?: number;
  regencia?: number;
  data?: string; // "YYYY-MM-DD"
}

/**
 * Resultado paginado genérico. A API não devolve metadados de paginação do
 * Laravel (`current_page`/`last_page`) — cada item da página traz
 * `totalRegistros` com o total filtrado, usado aqui para calcular se há mais
 * páginas a carregar.
 */
export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  perPage: number;
}

// ---------------------------------------------------------------------------
// Desempenho da turma (evolução, relatórios e alunos em risco) — ver
// document.md seção 19. Contrato PROPOSTO para o endpoint mobile
// `GET /desempenho/turma?escola=&turma=&etapa=` (ainda não existe no backend):
// espelha o que `edu4_lancamentoavaliacaonota.RPC.php` devolve em
// `getPeriodosAvaliacao` + `getAlunosAvaliacaoRegencia`, já normalizado.
// ---------------------------------------------------------------------------

/** Qual card da Home abriu o fluxo — muda a tela de destino após escolher a turma. */
export type DesempenhoModo = 'evolucao' | 'relatorio' | 'risco' | 'frequencia';

export interface DesempenhoTurmaParams {
  escola: Escola;
  turma: { codigo: number; nome: string };
  etapa: { codigo: number; nome: string };
}

/** `ed37_c_tipo` da forma de avaliação do procedimento. */
export type FormaAvaliacaoTipo = 'NOTA' | 'NIVEL' | 'PARECER';

/** Conceito da escala (forma NIVEL, tabela `conceito`). `ordem` crescente = melhor desempenho. */
export interface ConceitoAvaliacao {
  codigo: number;
  sigla: string;
  nome?: string;
  ordem: number;
}

export interface ProcedimentoDesempenho {
  forma: FormaAvaliacaoTipo;
  /** Mínimo para aprovação (`ed37_c_minimoaprov`) na forma NOTA; null nas demais. */
  minimo: number | null;
  /** Sigla do conceito mínimo (`ed37_c_minimoaprov`) na forma NIVEL; null nas demais. */
  minimoConceito: string | null;
  menorValor: number | null;
  maiorValor: number | null;
  conceitos: ConceitoAvaliacao[];
  /** Percentual mínimo de frequência do procedimento (`ed40_i_percfreq`, ex.: 75). */
  frequenciaMinima: number;
}

/** Elemento periódico do procedimento (bimestre/trimestre) com as datas do calendário da turma. */
export interface PeriodoDesempenho {
  /** `ed41_i_sequencia` — mesma chave usada em `AproveitamentoPeriodo.ordem`. */
  ordem: number;
  codigo: number;
  descricao: string;
  abreviado: string;
  inicio?: string; // "YYYY-MM-DD"
  fim?: string; // "YYYY-MM-DD"
  /** true no período em que a data de hoje cai (`periodocalendario`). */
  corrente: boolean;
  controlaFrequencia: boolean;
}

export interface RegenciaDesempenho {
  codigo: number;
  disciplina: string;
  cor?: string;
}

/** Nota por instrumento dentro do período (`avaliacaoparcial`, ed341) — evolução dentro do bimestre. */
export interface NotaParcialDesempenho {
  ordem: number;
  nota: number | null;
  conceito: string | null;
  ausencia: boolean;
}

/** Aproveitamento do aluno num período (`diarioavaliacao`, ed72). */
export interface AproveitamentoPeriodo {
  ordem: number;
  /** Forma NOTA. null = sem lançamento. */
  nota: number | null;
  /** Forma NIVEL: sigla do conceito e sua posição na escala (ver `ConceitoAvaliacao.ordem`). */
  conceito: string | null;
  conceitoOrdem: number | null;
  /** Forma PARECER (Educação Infantil): se já há parecer escrito no período. */
  temParecer: boolean;
  /** `ed72_c_aprovmin` — comparação com o mínimo já feita pelo e-cidade. null = sem lançamento. */
  minimoAtingido: boolean | null;
  /** Faltas líquidas do período (`ed72_i_numfaltas` menos as abonadas) — atualizado pela própria frequência do app (`salvarDiario`). */
  faltas: number | null;
  /** Faltas abonadas no período (já descontadas de `faltas`). */
  faltasAbonadas?: number;
  /** Aluno amparado no período (a grade web mostra "AMP"): sem nota e sem penalização. */
  amparado?: boolean;
  /** Aulas com frequência lançada no período (`diarioclasseregenciahorario` dentro das datas do período). */
  aulas: number | null;
  encerrado: boolean;
  parciais: NotaParcialDesempenho[];
}

export interface ResultadoFinalDesempenho {
  nota: number | null;
  conceito: string | null;
  minimoAtingido: boolean | null;
  /** `ed74_i_percfreq` quando já calculado pelo e-cidade. */
  percentualFrequencia: number | null;
  /** Sigla do termo do resultado (`ed74_c_resultadofinal`, ex.: APR/REP/REC) ou null. */
  situacao: string | null;
}

export interface DisciplinaAlunoDesempenho {
  regencia: number;
  periodos: AproveitamentoPeriodo[];
  resultadoFinal: ResultadoFinalDesempenho | null;
}

export interface AlunoDesempenho {
  codigo: number;
  matricula: number;
  nome: string;
  situacao?: string;
  /** MATRICULADO/REMATRICULADO — só estes entram nos totais e na lista de risco. */
  ativo: boolean;
  /** `ed60_c_parecer = 'S'`: avaliado por parecer mesmo fora da Infantil. */
  avaliadoPorParecer: boolean;
  disciplinas: DisciplinaAlunoDesempenho[];
}

export interface DesempenhoTurma {
  turma: { codigo: number; nome: string };
  etapa: { codigo: number; nome: string };
  /** `ed10_tipo`: 1 Infantil, 2 Fundamental, 3 Médio, 4 Profissional. */
  ensino: { codigo: number; tipo: number; infantil: boolean };
  procedimento: ProcedimentoDesempenho;
  periodos: PeriodoDesempenho[];
  /** Regências do professor logado nesta turma/etapa (várias na regência única dos Anos Iniciais). */
  regencias: RegenciaDesempenho[];
  alunos: AlunoDesempenho[];
}

// ---------------------------------------------------------------------------
// Gestão da sala de aula — `GET/POST /gestao-sala/*` (document.md, seção 20).
// Contratos do backend `GestaoSalaMobileService`; todos os campos de texto
// podem chegar com `+` no lugar de espaço (o service do app corrige).
// ---------------------------------------------------------------------------

export interface TurmaEtapaRef {
  turma: { codigo: number; nome: string };
  etapa: { codigo: number; nome: string };
  regencias: RegenciaDesempenho[];
}

/** Um dia com frequência lançada: quantidade de horários (aulas) por regência. */
export interface DiaComAula {
  data: string; // "YYYY-MM-DD"
  /** 0 = domingo … 6 = sábado (`Date.getDay()`). */
  diaSemana: number;
  aulas: Record<string, number>;
}

export interface DataComFalta {
  data: string;
  faltas: number;
  aulas: number;
  /** Faltas já notificadas ao responsável pela escola (`ocorrenciafalta`). */
  notificadas: number;
}

export interface FrequenciaDiariaDisciplina {
  regencia: number;
  aulas: number;
  faltas: number;
  faltasNotificadas: number;
  percentualFrequencia: number | null;
  /** Dias inteiros de falta em sequência, contados da última aula para trás. */
  faltasConsecutivas: number;
  faltouNaUltimaAula: boolean;
  ultimaPresenca: string | null;
  ultimaFalta: string | null;
  faltasUltimos7Dias: number;
  /** Índice 0 = domingo … 6 = sábado. */
  faltasPorDiaSemana: number[];
  datasComFalta: DataComFalta[];
}

export interface AlunoFrequenciaDiaria {
  codigo: number;
  matricula: number;
  nome: string;
  situacao?: string;
  ativo: boolean;
  dataMatricula: string | null;
  disciplinas: FrequenciaDiariaDisciplina[];
}

export interface FrequenciaDiaria extends TurmaEtapaRef {
  intervalo: { inicio: string; fim: string };
  periodo: PeriodoDesempenho | null;
  frequenciaMinima: number;
  dias: DiaComAula[];
  resumo: {
    alunosAtivos: number;
    ultimaAulaLancada: string | null;
    faltaramNaUltimaAula: number;
    comFaltasConsecutivas: number;
  };
  alunos: AlunoFrequenciaDiaria[];
}

export interface PendenciaNotasPeriodo {
  ordem: number;
  descricao: string;
  abreviado: string;
  fim: string | null;
  corrente: boolean;
  /** Negativo quando o período já terminou. */
  diasParaEncerrar: number | null;
  forma: FormaAvaliacaoTipo;
  alunos: number;
  semLancamento: number;
}

export interface PendenciasRegencia {
  turma: { codigo: number; nome: string };
  etapa: { codigo: number; nome: string };
  regencia: { codigo: number; disciplina: string };
  periodo: PeriodoDesempenho;
  hoje: { temAula: boolean; frequenciaLancada: boolean; registroAulaLancado: boolean };
  frequencia: {
    aulasPrevistas: number;
    lancadas: number;
    pendentes: number;
    /** Mais recentes primeiro; no máximo 30. */
    datasPendentes: string[];
    ultimoLancamento: string | null;
  };
  registroAula: {
    pendentes: number;
    datasPendentes: string[];
    ultimoLancamento: string | null;
  };
  notas: PendenciaNotasPeriodo[];
  totalPendencias: number;
}

export interface PendenciasProfessor {
  hoje: string;
  totais: { frequencia: number; registroAula: number; notas: number; regencias: number };
  regencias: PendenciasRegencia[];
}

export type SituacaoProjecao = 'garantido' | 'atingivel' | 'inalcancavel' | 'concluido' | 'indisponivel';

export interface NotaLancadaProjecao {
  ordem: number;
  nota: number | null;
  conceito: string | null;
  amparado: boolean;
  minimoAtingido: boolean;
}

export interface ProjecaoDisciplina {
  regencia: number;
  lancadas: NotaLancadaProjecao[];
  /** Ordem do próximo período sem lançamento; null quando todos foram lançados. */
  proximoPeriodo: number | null;
  periodosRestantes: number;
  /** Resultado parcial com as notas já lançadas, pela forma de obtenção do e-cidade. */
  resultadoParcial: number | null;
  /** Nota que o aluno precisa tirar em cada período restante para atingir o mínimo. */
  notaNecessaria: number | null;
  situacao: SituacaoProjecao;
  emRecuperacao: boolean;
}

export interface AlunoProjecao {
  codigo: number;
  matricula: number;
  nome: string;
  situacao?: string;
  ativo: boolean;
  avaliadoPorParecer: boolean;
  disciplinas: ProjecaoDisciplina[];
}

export interface ProjecaoNotas extends TurmaEtapaRef {
  procedimento: {
    forma: FormaAvaliacaoTipo;
    minimo: number | null;
    menorValor: number | null;
    maiorValor: number | null;
    /** `ed43_c_obtencao` do resultado final (SO, ME, MP…). */
    obtencao: string | null;
    obtencaoDescricao: string | null;
    calculavel: boolean;
    motivo: string | null;
  };
  periodos: PeriodoDesempenho[];
  alunos: AlunoProjecao[];
}

export interface ObservacaoAluno {
  regencia: number;
  /** null = observação do resultado final. */
  ordem: number | null;
  periodo: string;
  texto: string;
}

export interface AlunoObservacoes {
  codigo: number;
  matricula: number;
  nome: string;
  situacao?: string;
  ativo: boolean;
  observacoes: ObservacaoAluno[];
}

export interface ObservacoesTurma extends TurmaEtapaRef {
  periodos: PeriodoDesempenho[];
  totalObservacoes: number;
  alunos: AlunoObservacoes[];
}

export interface SalvarObservacaoPayload {
  matricula: number;
  regencia: number;
  ordem: number;
  /** Vazio remove a observação do período. */
  observacao: string;
}

export interface FichaAluno extends TurmaEtapaRef {
  aluno: {
    codigo: number;
    nome: string;
    nomeSocial: string | null;
    dataNascimento: string | null;
    idade: number | null;
    sexo: string | null;
    telefone: string | null;
    celular: string | null;
    email: string | null;
  };
  filiacao: { mae: string | null; pai: string | null };
  responsavel: {
    nome: string | null;
    celular: string | null;
    email: string | null;
    cadastroCidadao: { nome: string | null; telefone: string | null } | null;
  };
  matricula: {
    codigo: number;
    situacao: string;
    ativo: boolean;
    dataMatricula: string | null;
    dataEncerramento: string | null;
    avaliadoPorParecer: boolean;
    observacao: string | null;
  };
  necessidadesEspeciais: { codigo: number; descricao: string | null }[];
  atendimentoEspecializado: {
    codigo: number;
    atendimentos: string | null;
    dataEmissao: string | null;
    parecer: string | null;
  }[];
  /** Notificações de falta já emitidas pela escola (data e quantidade de faltas notificadas). */
  notificacoesFalta: { data: string; faltas: number }[];
}

export interface ResumoRegencia {
  turma: { codigo: number; nome: string };
  etapa: { codigo: number; nome: string };
  ensino: { codigo: number; tipo: number; infantil: boolean };
  regencia: { codigo: number; disciplina: string };
  procedimento: { forma: FormaAvaliacaoTipo; frequenciaMinima: number };
  periodoReferencia: PeriodoDesempenho;
  alunos: number;
  /** null na forma PARECER. */
  acimaMinimo: number | null;
  abaixoMinimo: number | null;
  comLancamento: number;
  semLancamento: number;
  media: number | null;
  frequencia: {
    aulas: number;
    faltas: number;
    percentualMedio: number | null;
    alunosAbaixoMinimo: number;
  };
  cobertura: { ordem: number; abreviado: string; alunos: number; lancados: number }[];
  ultimaFrequencia: string | null;
  ultimoRegistroAula: string | null;
}

export interface MinhasTurmas {
  hoje: string;
  regencias: ResumoRegencia[];
}
