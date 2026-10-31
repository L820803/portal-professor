import * as authService from '../services/authService';
import { createStore } from '../lib/store';
import type { Professor } from '../types';

interface AuthState {
    token: string | null;
    professor: Professor | null;
    isAuthenticated: boolean;
}

/**
 * Sessão do professor. No mobile o token vai para o SecureStore; no portal,
 * enquanto a API é fake, fica no localStorage do navegador.
 */
export const authStore = createStore<AuthState>(
    { token: null, professor: null, isAuthenticated: false },
    'portal-professor:auth',
);

export async function login(loginValue: string, password: string): Promise<void> {
    const response = await authService.login(loginValue, password);
    let professor: Professor | null = response.professor ?? null;
    if (!professor) {
        try {
            professor = await authService.me();
        } catch {
            // dados do professor são só informativos; o login já é válido.
        }
    }
    authStore.setState({ token: response.access_token, professor, isAuthenticated: true });
}

export async function logout(): Promise<void> {
    try {
        await authService.logout();
    } finally {
        authStore.setState({ token: null, professor: null, isAuthenticated: false });
    }
}
