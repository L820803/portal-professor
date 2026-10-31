import { CalendarDays, ChevronDown, ChevronUp, Minus, Plus } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { AppAlert } from '@/portal/components/AppAlert';
import Calendario from '@/portal/components/Calendario';
import HabilidadesSection from '@/portal/components/HabilidadesSection';
import { RegistroAulaAjudaModal } from '@/portal/components/registroAula';
import Screen from '@/portal/components/Screen';
import { AppButton, Carregando, ChipMultiSelect, ChipSelect, ErrorBanner, SectionHeader } from '@/portal/components/ui';
import { formatDatePtBr, toApiDate, todayApiDateString, weekdayLabelPtBr } from '@/portal/lib/dateUtils';
import { ir, numero, useQuery, voltar } from '@/portal/lib/nav';
import * as authService from '@/portal/services/authService';
import { extractErrorMessage } from '@/portal/services/client';
import * as registroAulaService from '@/portal/services/registroAulaService';
import type {
    DadosRegente,
    EtapaRegente,
    Escola,
    RegenciaRegente,
    TipoInstrumentoAvaliativo,
    TurmaRegente,
    TurnoReferenciaOption,
} from '@/portal/types';

function Bloco({ children }: { children: ReactNode }) {
    return <section className="rounded-2xl bg-sd-surface p-4 shadow-sd-card sm:p-5">{children}</section>;
}

/**
 * Formulário de conteúdo desenvolvido (RegistroAulaFormScreen do mobile).
 * Conteúdo e habilidades são salvos juntos num único "Salvar"; se já existe
 * conteúdo para a mesma regência+data+turno, o formulário abre com ele e
 * salvar atualiza em vez de duplicar.
 */
export default function RegistroAulaFormulario() {
    const query = useQuery();
    const escolaCodigo = query.get('escola') ?? '';
    const codigoParaEditar = numero(query.get('codigo'));

    const [escola, setEscola] = useState<Escola | null>(null);
    const [dados, setDados] = useState<DadosRegente | null>(null);
    const [loadingDados, setLoadingDados] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [turma, setTurma] = useState<TurmaRegente | null>(null);
    const [etapa, setEtapa] = useState<EtapaRegente | null>(null);
    const [regencia, setRegencia] = useState<RegenciaRegente | null>(null);
    const [turnoReferente, setTurnoReferente] = useState<TurnoReferenciaOption | null>(null);
    const [turmasAdicionais, setTurmasAdicionais] = useState<TurmaRegente[]>([]);
    const [tiposInstrumento, setTiposInstrumento] = useState<TipoInstrumentoAvaliativo[]>([]);
    const [tipoInstrumento, setTipoInstrumento] = useState<TipoInstrumentoAvaliativo | null>(null);
    const [data, setData] = useState<string | null>(() => (codigoParaEditar ? null : todayApiDateString()));
    const [calendarioAberto, setCalendarioAberto] = useState(false);
    const [aulasDadas, setAulasDadas] = useState(1);
    const [conteudoTexto, setConteudoTexto] = useState('');
    const [codigoExistente, setCodigoExistente] = useState<number | null>(null);
    const [verificandoExistente, setVerificandoExistente] = useState(false);
    const [saving, setSaving] = useState(false);
    const [ajudaAberta, setAjudaAberta] = useState(false);
    const [habilidades, setHabilidades] = useState<Map<number, string[]>>(new Map());
    const [habilidadesCarregadas, setHabilidadesCarregadas] = useState(false);
    const [errorHabilidades, setErrorHabilidades] = useState<string | null>(null);
    const topoRef = useRef<HTMLDivElement>(null);
    const codigoExistenteRef = useRef<number | null>(null);

    useEffect(() => {
        codigoExistenteRef.current = codigoExistente;
    }, [codigoExistente]);

    // Dados do regente (turmas/etapas/regências) e, na edição, o conteúdo existente.
    useEffect(() => {
        let ativo = true;
        setLoadingDados(true);
        (async () => {
            try {
                const [escolas, dadosRegente] = await Promise.all([authService.escolas(), registroAulaService.getDadosRegente(escolaCodigo)]);
                if (!ativo) return;
                setEscola(escolas.find((e) => e.codigo === escolaCodigo) ?? null);
                setDados(dadosRegente);
                if (codigoParaEditar) {
                    const conteudo = await registroAulaService.getConteudo(escolaCodigo, codigoParaEditar);
                    if (!ativo) return;
                    if (!conteudo) {
                        setError('Não foi possível abrir este conteúdo para edição.');
                        return;
                    }
                    const turmaAlvo = dadosRegente.turmas.find((t) => t.codigo === conteudo.turma.codigo) ?? null;
                    setTurma(turmaAlvo);
                    setEtapa(dadosRegente.etapas.find((e) => e.codigo === conteudo.etapa.codigo && e.turmaCodigo === turmaAlvo?.codigo) ?? null);
                    setRegencia(dadosRegente.regencias.find((r) => r.codigo === conteudo.regencia) ?? null);
                    setTurnoReferente(conteudo.turnoReferente ?? turmaAlvo?.turnoReferente[0] ?? null);
                    setData(conteudo.data);
                    setAulasDadas(conteudo.aulasDadas);
                    setConteudoTexto(conteudo.conteudo);
                    setCodigoExistente(conteudo.codigo);
                    setTipoInstrumento(conteudo.tipoInstrumento ?? null);
                } else if (dadosRegente.turmas.length === 1) {
                    selecionarTurma(dadosRegente, dadosRegente.turmas[0].codigo);
                }
            } catch (err) {
                if (ativo) setError(extractErrorMessage(err, 'Não foi possível carregar as turmas.'));
            } finally {
                if (ativo) setLoadingDados(false);
            }
        })();
        return () => {
            ativo = false;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [escolaCodigo, codigoParaEditar]);

    const etapaOptions = useMemo(() => (dados && turma ? dados.etapas.filter((e) => e.turmaCodigo === turma.codigo) : []), [dados, turma]);
    const regenciaOptions = useMemo(
        () => (dados && turma && etapa ? dados.regencias.filter((r) => r.etapaCodigo === etapa.codigo && r.turmaCodigo === turma.codigo) : []),
        [dados, turma, etapa],
    );
    const turmasComMesmaEtapa = useMemo(() => {
        if (!dados || !turma || !etapa) return [];
        return dados.turmas.filter((t) => t.codigo !== turma.codigo && dados.etapas.some((e) => e.turmaCodigo === t.codigo && e.codigo === etapa.codigo));
    }, [dados, turma, etapa]);

    useEffect(() => {
        setTurmasAdicionais((prev) => prev.filter((t) => turmasComMesmaEtapa.some((o) => o.codigo === t.codigo)));
    }, [turmasComMesmaEtapa]);

    // Tipos de instrumento avaliativo dependem do ensino da etapa.
    useEffect(() => {
        if (!etapa?.ensinoCodigo) {
            setTiposInstrumento([]);
            return;
        }
        let ativo = true;
        registroAulaService
            .getTiposInstrumentosAvaliativos(escolaCodigo, etapa.ensinoCodigo)
            .then((lista) => {
                if (ativo) setTiposInstrumento(lista);
            })
            .catch(() => undefined);
        return () => {
            ativo = false;
        };
    }, [escolaCodigo, etapa?.ensinoCodigo]);

    // Já existe conteúdo para a regência+data+turno? Preenche para editar em vez de duplicar.
    useEffect(() => {
        if (!regencia || !data || !turnoReferente) return;
        let ativo = true;
        setVerificandoExistente(true);
        registroAulaService
            .buscarConteudoPorRegenciaData(escolaCodigo, { regencia: regencia.codigo, data, turno: turma?.turno?.codigo, turnoReferente: turnoReferente.value })
            .then((existente) => {
                if (!ativo) return;
                if (existente) {
                    setCodigoExistente(existente.codigo);
                    setConteudoTexto(existente.conteudo);
                    setAulasDadas(existente.aulasDadas);
                    setTipoInstrumento(existente.tipoInstrumento ?? null);
                } else {
                    // Só limpa o texto se ele veio de um lançamento existente — o que foi digitado fica.
                    if (codigoExistenteRef.current !== null) setConteudoTexto('');
                    setCodigoExistente(null);
                    setAulasDadas(1);
                    setTipoInstrumento(null);
                }
            })
            .catch(() => undefined)
            .finally(() => {
                if (ativo) setVerificandoExistente(false);
            });
        return () => {
            ativo = false;
        };
    }, [escolaCodigo, regencia, data, turnoReferente, turma]);

    // Habilidades já salvas do conteúdo existente.
    const disciplinas = regencia?.disciplinasBncc ?? [];
    useEffect(() => {
        if (!regencia) {
            setHabilidades(new Map());
            return;
        }
        if (!codigoExistente) {
            setHabilidades(new Map(regencia.disciplinasBncc.map((d) => [d.codigo, []])));
            return;
        }
        let ativo = true;
        Promise.all(
            regencia.disciplinasBncc.map(async (d) => [d.codigo, await registroAulaService.getHabilidadesDesenvolvidas(escolaCodigo, codigoExistente, d.codigo)] as const),
        )
            .then((pares) => {
                if (ativo) setHabilidades(new Map(pares));
            })
            .catch(() => undefined);
        return () => {
            ativo = false;
        };
    }, [escolaCodigo, regencia, codigoExistente]);

    const totalHabilidades = Array.from(habilidades.values()).reduce((t, l) => t + l.length, 0);

    function selecionarTurma(fonte: DadosRegente, codigo: number | null, opts?: { manterData?: boolean }) {
        const alvo = fonte.turmas.find((t) => t.codigo === codigo) ?? null;
        setTurma(alvo);
        setTurnoReferente(alvo && alvo.turnoReferente.length === 1 ? alvo.turnoReferente[0] : null);
        setTurmasAdicionais([]);
        setTipoInstrumento(null);
        setCalendarioAberto(false);
        if (!opts?.manterData) setData(todayApiDateString());
        setAulasDadas(1);
        setConteudoTexto('');
        setCodigoExistente(null);
        const etapasDaTurma = alvo ? fonte.etapas.filter((e) => e.turmaCodigo === alvo.codigo) : [];
        if (alvo && etapasDaTurma.length === 1) {
            const unica = etapasDaTurma[0];
            setEtapa(unica);
            const regencias = fonte.regencias.filter((r) => r.etapaCodigo === unica.codigo && r.turmaCodigo === alvo.codigo);
            setRegencia(regencias.length === 1 ? regencias[0] : null);
        } else {
            setEtapa(null);
            setRegencia(null);
        }
    }

    function handleSelectEtapa(codigo: number | null) {
        const alvo = etapaOptions.find((e) => e.codigo === codigo) ?? null;
        setEtapa(alvo);
        setTurmasAdicionais([]);
        setData(todayApiDateString());
        setCalendarioAberto(false);
        setConteudoTexto('');
        setCodigoExistente(null);
        const regencias = alvo && dados ? dados.regencias.filter((r) => r.etapaCodigo === alvo.codigo && r.turmaCodigo === turma?.codigo) : [];
        setRegencia(regencias.length === 1 ? regencias[0] : null);
    }

    // Regência e turno vêm depois do conteúdo: trocar um deles só limpa o texto se ele veio de um lançamento existente.
    function handleSelectRegencia(codigo: number | null) {
        setRegencia(regenciaOptions.find((r) => r.codigo === codigo) ?? null);
        if (codigoExistente !== null) setConteudoTexto('');
        setCodigoExistente(null);
    }

    function handleSelectTurnoReferente(value: number | null) {
        setTurnoReferente(turma?.turnoReferente.find((t) => t.value === value) ?? null);
        if (codigoExistente !== null) setConteudoTexto('');
        setCodigoExistente(null);
    }

    function iniciarNovoRegistro() {
        setError(null);
        setErrorHabilidades(null);
        if (dados) selecionarTurma(dados, dados.turmas.length === 1 ? dados.turmas[0].codigo : null, { manterData: true });
        topoRef.current?.scrollIntoView({ behavior: 'smooth' });
        if (codigoParaEditar) ir('/registro-aula/formulario', { escola: escolaCodigo }, { replace: true });
    }

    /** Turma adicional da mesma etapa: acha regência/turno equivalentes (pelo nome da disciplina). */
    async function salvarParaTurmaAdicional(destino: TurmaRegente, usuario: number): Promise<{ semEquivalente: string[] }> {
        if (!dados || !etapa || !regencia || !turnoReferente || !data) throw new Error('Dados insuficientes.');
        const etapaDestino = dados.etapas.find((e) => e.turmaCodigo === destino.codigo && e.codigo === etapa.codigo);
        const regenciaDestino = dados.regencias.find(
            (r) => r.turmaCodigo === destino.codigo && r.etapaCodigo === etapa.codigo && r.disciplina === regencia.disciplina,
        );
        const turnoDestino = destino.turnoReferente.find((t) => t.value === turnoReferente.value) ?? destino.turnoReferente[0];
        if (!etapaDestino || !regenciaDestino || !turnoDestino) throw new Error(`Não foi possível encontrar a mesma regência/turno em ${destino.nome}.`);
        const existente = await registroAulaService.buscarConteudoPorRegenciaData(escolaCodigo, {
            regencia: regenciaDestino.codigo,
            data,
            turnoReferente: turnoDestino.value,
        });
        const salvo = await registroAulaService.salvarConteudo(escolaCodigo, {
            codigo: existente?.codigo,
            usuario,
            turma: destino.codigo,
            etapa: etapaDestino.codigo,
            regencia: regenciaDestino.codigo,
            conteudo: conteudoTexto.trim(),
            data,
            turnoReferente: turnoDestino.value,
            tipoInstrumento: etapaDestino.ensinoCodigo === etapa.ensinoCodigo ? (tipoInstrumento?.codigo ?? null) : null,
            aulasDadas: destino.medidaFrequencia === 'D' ? 1 : aulasDadas,
        });
        const semEquivalente: string[] = [];
        await Promise.all(
            disciplinas.map((campo) => {
                const campoDestino =
                    regenciaDestino.disciplinasBncc.find((d) => d.codigo === campo.codigo) ?? regenciaDestino.disciplinasBncc.find((d) => d.nome === campo.nome);
                if (!campoDestino) {
                    semEquivalente.push(campo.nome);
                    return Promise.resolve();
                }
                return registroAulaService.salvarHabilidadesDesenvolvidas(escolaCodigo, {
                    disciplina: campoDestino.codigo,
                    habilidades: habilidades.get(campo.codigo) ?? [],
                    conteudoDesenvolvido: salvo.codigo,
                });
            }),
        );
        return { semEquivalente };
    }

    async function handleSalvar() {
        if (!dados || !turma || !etapa || !regencia || !turnoReferente || !data) return;
        setSaving(true);
        setError(null);
        setErrorHabilidades(null);

        let codigoSalvo: number;
        try {
            const resultado = await registroAulaService.salvarConteudo(escolaCodigo, {
                codigo: codigoExistente ?? undefined,
                usuario: dados.usuario,
                turma: turma.codigo,
                etapa: etapa.codigo,
                regencia: regencia.codigo,
                conteudo: conteudoTexto.trim(),
                data,
                turnoReferente: turnoReferente.value,
                tipoInstrumento: tipoInstrumento?.codigo ?? null,
                aulasDadas: turma.medidaFrequencia === 'D' ? 1 : aulasDadas,
            });
            codigoSalvo = resultado.codigo;
            setCodigoExistente(resultado.codigo);
        } catch (err) {
            setError(extractErrorMessage(err, 'Não foi possível salvar o conteúdo de aula.'));
            setSaving(false);
            return;
        }

        if (disciplinas.length > 0) {
            try {
                await Promise.all(
                    disciplinas.map((campo) =>
                        registroAulaService.salvarHabilidadesDesenvolvidas(escolaCodigo, {
                            disciplina: campo.codigo,
                            habilidades: habilidades.get(campo.codigo) ?? [],
                            conteudoDesenvolvido: codigoSalvo,
                        }),
                    ),
                );
            } catch (err) {
                setErrorHabilidades(
                    extractErrorMessage(err, 'O conteúdo foi salvo, mas não foi possível salvar as habilidades. Clique em "Salvar" para tentar novamente.'),
                );
                setSaving(false);
                return;
            }
        }

        const comFalha: string[] = [];
        const comRessalva: string[] = [];
        if (turmasAdicionais.length > 0) {
            const resultados = await Promise.allSettled(turmasAdicionais.map((t) => salvarParaTurmaAdicional(t, dados.usuario)));
            resultados.forEach((r, i) => {
                if (r.status === 'rejected') comFalha.push(turmasAdicionais[i].nome);
                else if (r.value.semEquivalente.length > 0) comRessalva.push(turmasAdicionais[i].nome);
            });
        }
        setSaving(false);

        if (comFalha.length > 0 || comRessalva.length > 0) {
            const partes: string[] = [];
            if (comFalha.length > 0) partes.push(`Não foi possível lançar para: ${comFalha.join(', ')}.`);
            if (comRessalva.length > 0) partes.push(`Sem disciplina BNCC equivalente (habilidades não copiadas) em: ${comRessalva.join(', ')}.`);
            AppAlert.warning('Salvo com ressalvas', `Conteúdo salvo para ${turma.nome}. ${partes.join(' ')}`);
            return;
        }

        const base = disciplinas.length > 0 ? 'Conteúdo e habilidades salvos com sucesso' : 'Conteúdo salvo com sucesso';
        const mensagem =
            turmasAdicionais.length > 0
                ? `${base} para ${turma.nome} e mais ${turmasAdicionais.length} turma${turmasAdicionais.length === 1 ? '' : 's'}.`
                : `${base}.`;
        AppAlert.show({
            type: 'success',
            title: 'Cadastro concluído!',
            message: `${mensagem} A data selecionada será mantida caso você crie um novo cadastro. O que você quer fazer agora?`,
            buttons: [
                { text: 'Voltar à lista', style: 'cancel', onPress: () => ir('/registro-aula', { escola: escolaCodigo }) },
                { text: 'Criar novo cadastro', onPress: iniciarNovoRegistro },
            ],
        });
    }

    const podeSalvar =
        !!turma &&
        !!etapa &&
        !!regencia &&
        !!turnoReferente &&
        !!data &&
        conteudoTexto.trim().length > 0 &&
        (disciplinas.length === 0 || (habilidadesCarregadas && totalHabilidades > 0)) &&
        !saving;

    const faltando = [
        !turma && 'turma',
        turma && !etapa && 'etapa',
        etapa && !data && 'data',
        turma && !turnoReferente && 'turno de referência',
        etapa && data && conteudoTexto.trim().length === 0 && 'conteúdo desenvolvido',
        etapa && !regencia && 'regência',
        regencia && disciplinas.length > 0 && totalHabilidades === 0 && 'ao menos uma habilidade BNCC',
    ].filter(Boolean) as string[];

    const aulasDadasDisabled = turma?.medidaFrequencia === 'D';
    const mostraTurnoReferente = !!turma && turma.turnoReferente.length > 1;
    const mostraTurma = (dados?.turmas.length ?? 0) !== 1;
    const mostraEtapa = etapaOptions.length !== 1;

    let passo = 0;
    const proximoPasso = () => ++passo;

    const voltarParaLista = () => voltar(`/registro-aula?escola=${escolaCodigo}`);

    if (loadingDados) {
        return (
            <Screen title="Registro de aula" subtitle={escola?.nome} onBack={voltarParaLista}>
                <Carregando message="Carregando turmas..." />
            </Screen>
        );
    }

    return (
        <Screen
            title={codigoExistente ? 'Editar conteúdo' : 'Novo conteúdo'}
            subtitle={escola?.nome}
            onBack={voltarParaLista}
            semRodape
            bottomBar={
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm text-sd-muted">
                        {faltando.length > 0 ? (
                            <>
                                Falta preencher: <span className="font-semibold text-sd-text">{faltando.join(', ')}</span>
                            </>
                        ) : (
                            <span className="font-semibold text-sd-success">Tudo pronto para salvar.</span>
                        )}
                    </p>
                    <AppButton label="Salvar" onClick={handleSalvar} loading={saving} disabled={!podeSalvar} className="sm:min-w-48" />
                </div>
            }
        >
            <div ref={topoRef} className="mx-auto grid max-w-6xl gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
                <div className="space-y-4">
                    <ErrorBanner message={error} />
                    <div className="rounded-2xl border border-sd-primary-light/30 bg-sd-primary-soft p-4">
                        <p className="text-sm font-bold text-sd-primary">Como preencher</p>
                        <p className="mt-1 text-sm text-sd-primary-light">
                            Siga os campos na ordem em que aparecem, incluindo as habilidades da BNCC trabalhadas nessa aula. Ao terminar, clique em
                            "Salvar" — conteúdo e habilidades são salvos juntos.
                        </p>
                        <button type="button" onClick={() => setAjudaAberta(true)} className="mt-2 text-sm font-semibold text-sd-primary underline">
                            Ver guia completo (editar, excluir...)
                        </button>
                    </div>

                    {codigoExistente ? (
                        <ErrorBanner
                            variant="warning"
                            message='Você já tem um conteúdo salvo para essa turma e data — os campos foram preenchidos com ele. Revise e clique em "Salvar" para atualizar.'
                        />
                    ) : null}

                    {mostraTurma ? (
                        <Bloco>
                            <SectionHeader step={proximoPasso()} title="TURMA" hint="Em qual turma essa aula aconteceu?" />
                            <ChipSelect
                                options={dados?.turmas.map((t) => ({ codigo: t.codigo, label: t.nome })) ?? []}
                                selected={turma?.codigo ?? null}
                                onSelect={(c) => dados && selecionarTurma(dados, c)}
                                emptyLabel="Nenhuma turma disponível."
                            />
                        </Bloco>
                    ) : null}

                    {turma && mostraEtapa ? (
                        <Bloco>
                            <SectionHeader step={proximoPasso()} title="ETAPA" hint="Qual a etapa (série/ano) dessa turma?" />
                            <ChipSelect options={etapaOptions.map((e) => ({ codigo: e.codigo, label: e.nome }))} selected={etapa?.codigo ?? null} onSelect={handleSelectEtapa} />
                        </Bloco>
                    ) : null}

                    {etapa && turmasComMesmaEtapa.length > 0 ? (
                        <Bloco>
                            <SectionHeader
                                title="TAMBÉM LANÇAR PARA"
                                hint="Essas turmas têm a mesma etapa — marque para lançar o mesmo conteúdo e habilidades para elas também."
                            />
                            <ChipMultiSelect
                                options={turmasComMesmaEtapa.map((t) => ({ codigo: t.codigo, label: t.nome }))}
                                selected={turmasAdicionais.map((t) => t.codigo)}
                                onToggle={(codigo) =>
                                    setTurmasAdicionais((prev) =>
                                        prev.some((t) => t.codigo === codigo)
                                            ? prev.filter((t) => t.codigo !== codigo)
                                            : [...prev, ...turmasComMesmaEtapa.filter((t) => t.codigo === codigo)],
                                    )
                                }
                            />
                        </Bloco>
                    ) : null}

                    {etapa ? (
                        <Bloco>
                            <SectionHeader step={proximoPasso()} title="DATA DA AULA" hint="Em que dia a aula foi dada?" />
                            <button
                                type="button"
                                onClick={() => setCalendarioAberto((v) => !v)}
                                className="flex w-full items-center gap-3 rounded-xl border border-sd-border bg-sd-bg px-4 py-3 text-left hover:border-sd-primary-light"
                            >
                                <CalendarDays className="size-5 text-sd-primary" />
                                <span className={`flex-1 ${data ? 'font-semibold text-sd-text' : 'text-sd-muted'}`}>
                                    {data ? `${formatDatePtBr(data)} · ${weekdayLabelPtBr(data)}` : 'Selecione a data da aula'}
                                </span>
                                {calendarioAberto ? <ChevronUp className="size-4 text-sd-muted" /> : <ChevronDown className="size-4 text-sd-muted" />}
                            </button>
                            {calendarioAberto ? (
                                <div className="mt-2">
                                    <Calendario
                                        selecionado={data}
                                        onSelect={(d) => {
                                            setData(d);
                                            setCalendarioAberto(false);
                                        }}
                                        min={toApiDate(turma?.calendario?.inicio)}
                                        max={toApiDate(turma?.calendario?.fim)}
                                    />
                                </div>
                            ) : null}
                            {verificandoExistente ? <p className="mt-2 text-xs text-sd-muted">Verificando lançamento existente...</p> : null}
                        </Bloco>
                    ) : null}

                    {mostraTurnoReferente ? (
                        <Bloco>
                            <SectionHeader step={proximoPasso()} title="REFERÊNCIA DE TURNO" hint="Selecione o turno de referência para esse lançamento." />
                            <ChipSelect
                                options={(turma?.turnoReferente ?? []).map((t) => ({ codigo: t.value, label: t.name }))}
                                selected={turnoReferente?.value ?? null}
                                onSelect={handleSelectTurnoReferente}
                            />
                        </Bloco>
                    ) : null}

                    {etapa && data && !aulasDadasDisabled ? (
                        <Bloco>
                            <SectionHeader step={proximoPasso()} title="AULAS DADAS" hint="Quantos tempos de aula foram dados nesse dia?" />
                            <div className="flex items-center gap-4">
                                <button
                                    type="button"
                                    onClick={() => setAulasDadas((v) => Math.max(1, v - 1))}
                                    className="flex size-11 items-center justify-center rounded-xl border-[1.5px] border-sd-primary text-sd-primary hover:bg-sd-primary-soft"
                                    aria-label="Diminuir aulas dadas"
                                >
                                    <Minus className="size-5" />
                                </button>
                                <span className="min-w-8 text-center text-2xl font-bold text-sd-text">{aulasDadas}</span>
                                <button
                                    type="button"
                                    onClick={() => setAulasDadas((v) => v + 1)}
                                    className="flex size-11 items-center justify-center rounded-xl border-[1.5px] border-sd-primary text-sd-primary hover:bg-sd-primary-soft"
                                    aria-label="Aumentar aulas dadas"
                                >
                                    <Plus className="size-5" />
                                </button>
                            </div>
                        </Bloco>
                    ) : null}

                    {etapa && tiposInstrumento.length > 0 ? (
                        <Bloco>
                            <SectionHeader step={proximoPasso()} title="INSTRUMENTO AVALIATIVO" hint="Se essa aula teve avaliação, selecione o tipo (opcional)." />
                            <ChipSelect
                                options={tiposInstrumento.map((t) => ({ codigo: t.codigo, label: t.nome }))}
                                selected={tipoInstrumento?.codigo ?? null}
                                onSelect={(c) => setTipoInstrumento(tiposInstrumento.find((t) => t.codigo === c) ?? null)}
                            />
                        </Bloco>
                    ) : null}

                    {etapa && data ? (
                        <Bloco>
                            <SectionHeader step={proximoPasso()} title="CONTEÚDO DESENVOLVIDO" hint="Descreva, em poucas palavras, o que foi ensinado nessa aula." />
                            <textarea
                                value={conteudoTexto}
                                onChange={(e) => setConteudoTexto(e.target.value)}
                                rows={6}
                                placeholder="Ex.: Revisão de frações e resolução de exercícios do livro didático."
                                className="w-full resize-y rounded-xl border border-sd-border bg-sd-bg px-4 py-3 text-[15px] text-sd-text outline-none placeholder:text-sd-muted focus:border-sd-primary-light focus:ring-2 focus:ring-sd-primary-soft"
                            />
                        </Bloco>
                    ) : null}
                </div>

                <div className="space-y-4">
                    {etapa ? (
                        <Bloco>
                            <SectionHeader step={proximoPasso()} title="REGÊNCIA" hint="Qual regência você está lançando?" />
                            <ChipSelect
                                options={regenciaOptions.map((r) => ({ codigo: r.codigo, label: r.disciplina || `Regência ${r.codigo}`, cor: r.cor, indicador: r.polivalente }))}
                                selected={regencia?.codigo ?? null}
                                onSelect={handleSelectRegencia}
                                emptyLabel="Nenhuma regência disponível."
                            />
                            {regenciaOptions.some((r) => r.polivalente) ? (
                                <p className="mt-3 flex gap-2 text-xs text-sd-muted">
                                    <span className="mt-1 size-2 shrink-0 rounded-full bg-sd-accent" />
                                    São regências em que, além da disciplina escolhida, é possível selecionar também habilidades da BNCC de outras disciplinas. Isso permite
                                    registrar uma aula que envolva conteúdos e habilidades de mais de uma disciplina.
                                </p>
                            ) : null}
                        </Bloco>
                    ) : null}

                    {regencia ? (
                        <Bloco>
                            <SectionHeader step={proximoPasso()} title="HABILIDADES BNCC" hint="Marque ao menos uma habilidade trabalhada nessa aula." />
                            <ErrorBanner message={errorHabilidades} />
                            {regencia.polivalente ? (
                                <ErrorBanner
                                    variant="warning"
                                    message="Esta regência é polivalente/global: ela reúne mais de uma disciplina da BNCC, então as habilidades de todas aparecem juntas abaixo."
                                />
                            ) : null}
                            {disciplinas.length === 0 ? (
                                <div className="rounded-xl bg-sd-bg p-4 text-center">
                                    <p className="font-semibold">Sem disciplina BNCC</p>
                                    <p className="mt-1 text-sm text-sd-muted">Esta regência não tem uma disciplina BNCC vinculada.</p>
                                </div>
                            ) : (
                                <HabilidadesSection
                                    escola={escolaCodigo}
                                    regencia={regencia.codigo}
                                    disciplinas={disciplinas}
                                    selecao={habilidades}
                                    onChange={setHabilidades}
                                    onCarregado={setHabilidadesCarregadas}
                                />
                            )}
                        </Bloco>
                    ) : etapa ? (
                        <div className="rounded-2xl border-2 border-dashed border-sd-border p-6 text-center text-sm text-sd-muted">
                            Escolha a regência para ver as habilidades BNCC.
                        </div>
                    ) : null}
                </div>
            </div>

            <RegistroAulaAjudaModal open={ajudaAberta} onClose={() => setAjudaAberta(false)} />
        </Screen>
    );
}
