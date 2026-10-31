import type { Escola, LoginResponse, Professor } from '../types';
import { ESCOLAS, PROFESSOR_FAKE } from '../fake/catalogo';
import { atraso } from '../fake/random';
import { ApiBusinessError } from './client';

// Fake de `POST /auth/login`, `GET /auth/me`, `GET /auth/escolas` e
// `POST /auth/logout`: qualquer CPF com senha de 3+ caracteres entra.

export async function login(
    loginValue: string,
    password: string,
): Promise<LoginResponse> {
    await atraso(500);
    if (!loginValue.trim() || password.length < 3) {
        throw new ApiBusinessError('Usuário ou senha inválidos.');
    }
    return {
        access_token: `fake-${Date.now()}`,
        token_type: 'bearer',
        expires_in: 60 * 60 * 8,
        professor: { ...PROFESSOR_FAKE, login: loginValue.trim() },
    };
}

export async function me(): Promise<Professor> {
    await atraso();
    return PROFESSOR_FAKE;
}

export async function escolas(): Promise<Escola[]> {
    await atraso();
    return ESCOLAS;
}

export async function logout(): Promise<void> {
    await atraso(100);
}
