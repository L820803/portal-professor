<?php

use Illuminate\Support\Facades\Route;

// Portal do Professor ("Giz"): versão web do app mobile-teacher.
// Por enquanto as telas usam dados fake no navegador (resources/js/portal/fake),
// então as rotas só entregam a página Inertia; os parâmetros vão na query string.
Route::redirect('/', '/inicio')->name('home');

Route::inertia('entrar', 'portal/entrar')->name('portal.entrar');
Route::inertia('inicio', 'portal/inicio')->name('portal.inicio');
Route::inertia('mensagens', 'portal/mensagens')->name('portal.mensagens');

Route::prefix('frequencia')->name('portal.frequencia.')->group(function () {
    Route::inertia('/', 'portal/frequencia/escolas')->name('escolas');
    Route::inertia('turmas', 'portal/frequencia/turmas')->name('turmas');
    Route::inertia('lancamento', 'portal/frequencia/lancamento')->name('lancamento');
});

Route::prefix('registro-aula')->name('portal.registro-aula.')->group(function () {
    Route::inertia('/', 'portal/registro-aula/lista')->name('lista');
    Route::inertia('formulario', 'portal/registro-aula/formulario')->name('formulario');
});

Route::prefix('desempenho')->name('portal.desempenho.')->group(function () {
    Route::inertia('turmas', 'portal/desempenho/selecionar')->name('selecionar');
    Route::inertia('evolucao', 'portal/desempenho/evolucao')->name('evolucao');
    Route::inertia('relatorio', 'portal/desempenho/relatorio')->name('relatorio');
    Route::inertia('risco', 'portal/desempenho/risco')->name('risco');
    Route::inertia('faltas', 'portal/desempenho/frequencia-diaria')->name('frequencia-diaria');
    Route::inertia('aluno', 'portal/desempenho/aluno')->name('aluno');
    Route::inertia('ficha', 'portal/desempenho/ficha')->name('ficha');
});

Route::middleware(['auth', 'verified'])->group(function () {
    Route::inertia('dashboard', 'dashboard')->name('dashboard');
});

require __DIR__.'/settings.php';
