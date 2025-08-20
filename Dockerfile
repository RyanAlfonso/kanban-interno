FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED 1
ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1
ENV MONGODB_URL mongodb://10.100.11.194:27017/kanban_interno
ENV NEXTAUTH_SECRET 5WDQNscPHAHwuF/BqX/bkJAkH2tMbJK1HF9GUe8UprI=
ENV PORT 3000
ENV NEXTAUTH_URL https://servicos.dnit.gov.br/sgplan/prd/kanban-interno/api/auth
ENV NEXT_PUBLIC_BASE_PATH /sgplan/prd/kanban-interno

RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
#COPY --from=builder /app/.env ./.env

USER nextjs

EXPOSE 3000

# ENV PORT 80

# FROM nginx:latest

# COPY --from=builder /build/build /usr/share/nginx/html
# COPY nginx.conf /etc/nginx/conf.d/default.conf

CMD ["npm", "run", "start"]
