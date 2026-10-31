import type {
    ConteudoRegistroAula,
    ConteudoRegistroAulaDetalhe,
    DadosRegente,
    PaginatedResult,
    RegistroAulaFiltros,
    SalvarConteudoPayload,
    SalvarHabilidadesPayload,
    TipoInstrumentoAvaliativo,
    UnidadeTematicaBncc,
} from '../types';
import {
    ANO_LETIVO,
    PROFESSOR_FAKE,
    TIPOS_INSTRUMENTO,
    regenciaPorCodigo,
    turmasDaEscola,
} from '../fake/catalogo';
import { HABILIDADES_BNCC } from '../fake/bncc';
import { getDb, salvar } from '../fake/db';
import type { ConteudoFake } from '../fake/db';
import { atraso } from '../fake/random';
import { ApiBusinessError } from './client';

// Fake do grupo `/registro-aula/*` da API mobile.

export async function getDadosRegente(escola: string): Promise<DadosRegente> {
    await atraso();
    const turmas = turmasDaEscola(escola);
    return {
        usuario: PROFESSOR_FAKE.usuario,
        turmas: turmas.map((t) => ({
            codigo: t.codigo,
            nome: t.nome,
            turno: t.turno,
            turnoReferente: t.turnoReferente,
            medidaFrequencia: t.medidaFrequencia,
            calendario: { inicio: ANO_LETIVO.inicio, fim: ANO_LETIVO.fim },
        })),
        etapas: turmas.map((t) => ({
            codigo: t.etapa.codigo,
            nome: t.etapa.nome,
            turmaCodigo: t.codigo,
            ensinoCodigo: t.etapa.ensinoCodigo,
        })),
        regencias: turmas.flatMap((t) =>
            t.regencias.map((r) => ({
                codigo: r.codigo,
                disciplina: r.disciplina,
                disciplinaCodigo: r.disciplinaCodigo,
                turmaCodigo: t.codigo,
                etapaCodigo: t.etapa.codigo,
                disciplinasBncc: r.disciplinasBncc,
                cor: r.cor,
                polivalente: r.polivalente,
            })),
        ),
    };
}

export async function getTiposInstrumentosAvaliativos(
    _escola: string,
    ensino: number,
): Promise<TipoInstrumentoAvaliativo[]> {
    await atraso(150);
    return TIPOS_INSTRUMENTO[ensino] ?? [];
}

function paraItemLista(c: ConteudoFake): ConteudoRegistroAula {
    return {
        codigo: c.codigo,
        data: c.data,
        conteudo: c.conteudo,
        aulasDadas: c.aulasDadas,
        disciplina: c.disciplina,
        turma: c.turma,
        etapa: c.etapa,
        regencia: c.regencia,
        turno: c.turno?.nome,
        tipoInstrumento: c.tipoInstrumento?.nome ?? null,
    };
}

function paraDetalhe(c: ConteudoFake): ConteudoRegistroAulaDetalhe {
    const { escola: _escola, ...detalhe } = c;
    return detalhe;
}

export async function getConteudosRegenteEscola(
    escola: string,
    page: number,
    itemsPerPage: number,
    filtros: RegistroAulaFiltros = {},
): Promise<PaginatedResult<ConteudoRegistroAula>> {
    await atraso(350);
    const filtrados = getDb().conteudos.filter(
        (c) =>
            c.escola === escola &&
            (filtros.turma === undefined || c.turma.codigo === filtros.turma) &&
            (filtros.etapa === undefined || c.etapa.codigo === filtros.etapa) &&
            (filtros.regencia === undefined || c.regencia === filtros.regencia) &&
            (filtros.data === undefined || c.data === filtros.data),
    );
    const inicio = (page - 1) * itemsPerPage;
    return {
        items: filtrados.slice(inicio, inicio + itemsPerPage).map(paraItemLista),
        total: filtrados.length,
        page,
        perPage: itemsPerPage,
    };
}

export async function buscarConteudoPorRegenciaData(
    escola: string,
    filtro: { regencia: number; data: string; turno?: number; turnoReferente?: number },
): Promise<ConteudoRegistroAulaDetalhe | null> {
    await atraso(200);
    const encontrado = getDb().conteudos.find(
        (c) =>
            c.escola === escola &&
            c.regencia === filtro.regencia &&
            c.data === filtro.data &&
            (filtro.turnoReferente === undefined ||
                c.turnoReferente?.value === filtro.turnoReferente),
    );
    return encontrado ? paraDetalhe(encontrado) : null;
}

export async function getConteudo(
    escola: string,
    codigo: number,
): Promise<ConteudoRegistroAulaDetalhe | null> {
    await atraso(150);
    const c = getDb().conteudos.find((x) => x.escola === escola && x.codigo === codigo);
    return c ? paraDetalhe(c) : null;
}

export async function salvarConteudo(
    escola: string,
    payload: SalvarConteudoPayload,
): Promise<ConteudoRegistroAulaDetalhe> {
    await atraso(500);
    const ref = regenciaPorCodigo(payload.regencia);
    if (!ref || ref.turma.escola !== escola) {
        throw new ApiBusinessError('Regência não encontrada nesta escola.');
    }
    if (payload.data < ANO_LETIVO.inicio || payload.data > ANO_LETIVO.fim) {
        throw new ApiBusinessError('A data informada está fora do calendário letivo da turma.');
    }
    const { turma, regencia } = ref;
    const db = getDb();
    const existente = payload.codigo
        ? db.conteudos.find((c) => c.codigo === payload.codigo)
        : undefined;
    const tipo = (TIPOS_INSTRUMENTO[turma.etapa.ensinoCodigo] ?? []).find(
        (t) => t.codigo === payload.tipoInstrumento,
    );
    const registro: ConteudoFake = {
        codigo: existente?.codigo ?? db.proximoCodigo++,
        escola,
        data: payload.data,
        conteudo: payload.conteudo,
        aulasDadas: payload.aulasDadas,
        disciplina: regencia.disciplina,
        turma: { codigo: turma.codigo, nome: turma.nome },
        etapa: { codigo: turma.etapa.codigo, nome: turma.etapa.nome },
        regencia: regencia.codigo,
        turno: turma.turno,
        turnoReferente: turma.turnoReferente.find((t) => t.value === payload.turnoReferente),
        tipoInstrumento: tipo ?? null,
        usuario: payload.usuario,
    };
    db.conteudos = [registro, ...db.conteudos.filter((c) => c.codigo !== registro.codigo)].sort(
        (a, b) => (a.data < b.data ? 1 : a.data > b.data ? -1 : b.codigo - a.codigo),
    );
    salvar();
    return paraDetalhe(registro);
}

export async function excluirConteudo(escola: string, codigo: number): Promise<void> {
    await atraso(400);
    const db = getDb();
    db.conteudos = db.conteudos.filter((c) => !(c.escola === escola && c.codigo === codigo));
    Object.keys(db.habilidades)
        .filter((k) => k.startsWith(`${codigo}|`))
        .forEach((k) => delete db.habilidades[k]);
    salvar();
}

export async function getHabilidadesBncc(
    _escola: string,
    _regencia: number,
    disciplinaBncc: number,
): Promise<UnidadeTematicaBncc[]> {
    await atraso(300);
    return HABILIDADES_BNCC[disciplinaBncc] ?? [];
}

export async function getHabilidadesDesenvolvidas(
    _escola: string,
    conteudo: number,
    disciplinaBncc: number,
): Promise<string[]> {
    await atraso(150);
    return getDb().habilidades[`${conteudo}|${disciplinaBncc}`] ?? [];
}

/** Substitui por completo as habilidades salvas do par disciplina+conteúdo. */
export async function salvarHabilidadesDesenvolvidas(
    _escola: string,
    payload: SalvarHabilidadesPayload,
): Promise<void> {
    await atraso(250);
    const db = getDb();
    const chave = `${payload.conteudoDesenvolvido}|${payload.disciplina}`;
    if (payload.habilidades.length === 0) delete db.habilidades[chave];
    else db.habilidades[chave] = payload.habilidades;
    salvar();
}
