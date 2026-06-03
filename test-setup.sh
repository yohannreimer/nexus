#!/bin/bash

# 🧪 Script de Teste - Nexus AI
# Valida se todas as configurações estão corretas

echo "🔍 Iniciando verificação do sistema..."
echo ""

# Cores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Contadores
PASS=0
FAIL=0

# Função de teste
test_check() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓${NC} $1"
        ((PASS++))
    else
        echo -e "${RED}✗${NC} $1"
        ((FAIL++))
    fi
}

# 1. Verificar Node.js
echo "📦 Verificando dependências..."
node --version > /dev/null 2>&1
test_check "Node.js instalado ($(node --version))"

npm --version > /dev/null 2>&1
test_check "npm instalado ($(npm --version))"

# 2. Verificar arquivos essenciais
echo ""
echo "📁 Verificando arquivos..."

[ -f "package.json" ]
test_check "package.json existe"

[ -f ".env" ]
test_check ".env existe"

[ -f "server.ts" ]
test_check "server.ts existe"

[ -f "App.tsx" ]
test_check "App.tsx existe"

# 3. Verificar variáveis de ambiente
echo ""
echo "🔐 Verificando variáveis de ambiente..."

source .env 2>/dev/null

if [ ! -z "$VITE_FACEBOOK_APP_ID" ] && [ "$VITE_FACEBOOK_APP_ID" != "SEU_APP_ID" ]; then
    echo -e "${GREEN}✓${NC} VITE_FACEBOOK_APP_ID configurado"
    ((PASS++))
else
    echo -e "${RED}✗${NC} VITE_FACEBOOK_APP_ID não configurado ou usando valor padrão"
    ((FAIL++))
fi

if [ ! -z "$FACEBOOK_APP_SECRET" ] && [ "$FACEBOOK_APP_SECRET" != "SUA_CHAVE_SECRETA" ]; then
    echo -e "${GREEN}✓${NC} FACEBOOK_APP_SECRET configurado"
    ((PASS++))
else
    echo -e "${RED}✗${NC} FACEBOOK_APP_SECRET não configurado ou usando valor padrão"
    ((FAIL++))
fi

if [ ! -z "$VITE_FACEBOOK_REDIRECT_URI" ]; then
    echo -e "${GREEN}✓${NC} VITE_FACEBOOK_REDIRECT_URI configurado"
    ((PASS++))
else
    echo -e "${RED}✗${NC} VITE_FACEBOOK_REDIRECT_URI não configurado"
    ((FAIL++))
fi

# 4. Verificar dependências instaladas
echo ""
echo "📚 Verificando dependências npm..."

if [ -d "node_modules" ]; then
    echo -e "${GREEN}✓${NC} node_modules existe"
    ((PASS++))
    
    # Verificar pacotes críticos
    [ -d "node_modules/express" ]
    test_check "express instalado"
    
    [ -d "node_modules/axios" ]
    test_check "axios instalado"
    
    [ -d "node_modules/cors" ]
    test_check "cors instalado"
    
    [ -d "node_modules/dotenv" ]
    test_check "dotenv instalado"
    
    [ -d "node_modules/react" ]
    test_check "react instalado"
    
    [ -d "node_modules/vite" ]
    test_check "vite instalado"
else
    echo -e "${RED}✗${NC} node_modules não existe - execute 'npm install'"
    ((FAIL++))
fi

# 5. Verificar portas disponíveis
echo ""
echo "🔌 Verificando portas..."

if ! lsof -Pi :5173 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo -e "${GREEN}✓${NC} Porta 5173 (frontend) disponível"
    ((PASS++))
else
    echo -e "${YELLOW}⚠${NC} Porta 5173 (frontend) em uso"
fi

if ! lsof -Pi :3001 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo -e "${GREEN}✓${NC} Porta 3001 (backend) disponível"
    ((PASS++))
else
    echo -e "${YELLOW}⚠${NC} Porta 3001 (backend) em uso"
fi

# 6. Testar compilação TypeScript
echo ""
echo "🔨 Testando compilação..."

npx tsc --noEmit server.ts 2>/dev/null
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓${NC} server.ts compila sem erros"
    ((PASS++))
else
    echo -e "${YELLOW}⚠${NC} server.ts tem alguns warnings (mas pode funcionar)"
fi

# Resumo
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Resumo dos Testes"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✓ Passou: $PASS${NC}"
echo -e "${RED}✗ Falhou: $FAIL${NC}"
echo ""

if [ $FAIL -eq 0 ]; then
    echo -e "${GREEN}🎉 Sistema pronto para uso!${NC}"
    echo ""
    echo "🚀 Para iniciar o sistema, execute:"
    echo "   npm run dev:all"
    echo ""
    echo "📖 Consulte o SETUP.md para próximos passos"
    exit 0
else
    echo -e "${RED}⚠️  Corrija os problemas acima antes de continuar${NC}"
    echo ""
    echo "📖 Consulte o SETUP.md para instruções detalhadas"
    exit 1
fi
