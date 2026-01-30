# =============================================
# Script de Instalação - Supabase CLI
# =============================================
# Execute este script no PowerShell como Administrador
# =============================================

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  INSTALANDO SUPABASE CLI" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Passo 1: Permitir execução de scripts
Write-Host "[1/4] Configurando ExecutionPolicy..." -ForegroundColor Yellow
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser -Force
Write-Host "[OK] ExecutionPolicy configurado" -ForegroundColor Green

# Passo 2: Verificar se Scoop já está instalado
Write-Host ""
Write-Host "[2/4] Verificando Scoop..." -ForegroundColor Yellow
$scoopInstalled = Get-Command scoop -ErrorAction SilentlyContinue

if ($scoopInstalled) {
    Write-Host "[OK] Scoop já está instalado" -ForegroundColor Green
} else {
    Write-Host "[INFO] Scoop não encontrado. Instalando..." -ForegroundColor Yellow
    
    # Baixar instalador
    Invoke-RestMethod -Uri https://get.scoop.sh -OutFile 'install-scoop.ps1'
    
    # Instalar Scoop
    .\install-scoop.ps1 -RunAsAdmin
    
    # Remover instalador
    Remove-Item 'install-scoop.ps1'
    
    Write-Host "[OK] Scoop instalado com sucesso" -ForegroundColor Green
}

# Passo 3: Adicionar repositório do Supabase
Write-Host ""
Write-Host "[3/4] Adicionando repositório do Supabase..." -ForegroundColor Yellow
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git 2>$null
Write-Host "[OK] Repositório adicionado" -ForegroundColor Green

# Passo 4: Instalar Supabase CLI
Write-Host ""
Write-Host "[4/4] Instalando Supabase CLI..." -ForegroundColor Yellow
scoop install supabase
Write-Host "[OK] Supabase CLI instalado" -ForegroundColor Green

# Verificar instalação
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  VERIFICANDO INSTALAÇÃO" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$version = supabase --version 2>$null
if ($version) {
    Write-Host "[OK] Supabase CLI instalado com sucesso!" -ForegroundColor Green
    Write-Host "Versão: $version" -ForegroundColor Green
} else {
    Write-Host "[ERRO] Falha na instalação" -ForegroundColor Red
    Write-Host "Tente fechar e abrir o PowerShell novamente" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  PRÓXIMOS PASSOS" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Feche este PowerShell" -ForegroundColor Yellow
Write-Host "2. Abra um novo PowerShell (não precisa ser Admin)" -ForegroundColor Yellow
Write-Host "3. Execute: supabase login" -ForegroundColor Yellow
Write-Host ""

Read-Host "Pressione ENTER para sair"
