# Usa a versão leve do Node.js
FROM node:20-alpine AS base

# Fase 1: Instalação de dependências
FROM base AS deps
# Adiciona bibliotecas necessárias para alguns pacotes nativos
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json* ./
# O npm ci é mais rigoroso e rápido que o npm install
RUN npm ci

# Fase 2: Construção da aplicação
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Cria a build de produção (gera a pasta .next/standalone)
RUN npm run build

# Fase 3: Imagem final de Produção
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
# Desativa a telemetria do Next.js
ENV NEXT_TELEMETRY_DISABLED 1

# Cria um utilizador não root para maior segurança
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copia a pasta pública
COPY --from=builder /app/public ./public

# Copia os ficheiros gerados pelo output: 'standalone' do next.config.mjs
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3001
ENV PORT 3001
# O Next.js no modo standalone precisa que o hostname seja definido 
# para escutar em todas as interfaces de rede no Docker
ENV HOSTNAME "0.0.0.0"

# Executa o servidor de produção
CMD ["node", "server.js"]