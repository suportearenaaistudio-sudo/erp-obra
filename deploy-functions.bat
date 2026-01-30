@echo off
REM =============================================
REM Script de Deploy - Sistema Multi-Tenant
REM =============================================

echo.
echo ========================================
echo   DEPLOY SISTEMA MULTI-TENANT
echo ========================================
echo.

REM Verificar se está no diretório correto
if not exist "supabase\functions" (
    echo [ERRO] Execute este script na raiz do projeto!
    pause
    exit /b 1
)

echo [1/3] Verificando Supabase CLI...
where supabase >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERRO] Supabase CLI nao encontrado!
    echo.
    echo Instale com: npm install -g supabase
    pause
    exit /b 1
)
echo [OK] Supabase CLI encontrado

echo.
echo [2/3] Fazendo deploy das Edge Functions...
echo.

echo Deploying tenant-users...
call supabase functions deploy tenant-users
if %ERRORLEVEL% NEQ 0 (
    echo [ERRO] Falha ao deployar tenant-users
    pause
    exit /b 1
)

echo Deploying tenant-roles...
call supabase functions deploy tenant-roles
if %ERRORLEVEL% NEQ 0 (
    echo [ERRO] Falha ao deployar tenant-roles
    pause
    exit /b 1
)

echo Deploying me...
call supabase functions deploy me
if %ERRORLEVEL% NEQ 0 (
    echo [ERRO] Falha ao deployar me
    pause
    exit /b 1
)

echo Deploying saas-subscriptions...
call supabase functions deploy saas-subscriptions
if %ERRORLEVEL% NEQ 0 (
    echo [ERRO] Falha ao deployar saas-subscriptions
    pause
    exit /b 1
)

echo Deploying saas-feature-overrides...
call supabase functions deploy saas-feature-overrides
if %ERRORLEVEL% NEQ 0 (
    echo [ERRO] Falha ao deployar saas-feature-overrides
    pause
    exit /b 1
)

echo Deploying saas-impersonate...
call supabase functions deploy saas-impersonate
if %ERRORLEVEL% NEQ 0 (
    echo [ERRO] Falha ao deployar saas-impersonate
    pause
    exit /b 1
)

echo.
echo [3/3] Deploy concluido!
echo.
echo ========================================
echo   TODAS AS FUNCTIONS DEPLOYADAS!
echo ========================================
echo.
echo Proximos passos:
echo 1. Execute a migration 012_tenant_context_functions.sql no Supabase Dashboard
echo 2. Teste as functions com o guia GUIA_ATIVACAO_MULTITENANT.md
echo.

pause
