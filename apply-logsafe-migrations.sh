#!/bin/bash

# Script para aplicar migrations do LogSafe via Supabase CLI
# Uso: ./apply-logsafe-migrations.sh

echo "🔒 Aplicando LogSafe Migrations..."

# Foundation
echo "📋 Aplicando logsafe_foundation.sql..."
npx supabase db execute --file supabase/migrations/20260130_logsafe_foundation.sql

if [ $? -eq 0 ]; then
  echo "✅ Foundation aplicada com sucesso!"
  
  # Seeds
  echo "📋 Aplicando logsafe_seeds.sql..."
  npx supabase db execute --file supabase/migrations/20260130_logsafe_seeds.sql
  
  if [ $? -eq 0 ]; then
    echo "✅ Seeds aplicadas com sucesso!"
    echo "🎉 LogSafe migrations aplicadas!"
  else
    echo "❌ Erro ao aplicar seeds"
    exit 1
  fi
else
  echo "❌ Erro ao aplicar foundation"
  exit 1
fi
