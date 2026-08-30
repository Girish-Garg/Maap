# Production image for Maap. Used by both docker-compose.yml (local, full-Docker
# workflow) and docker-compose.prod.yml (VPS).
#
# The Prisma client is generated during the build, and `prisma migrate deploy`
# runs from the entrypoint at container start - see docker-entrypoint.sh.

FROM node:22-alpine AS deps
WORKDIR /app
# The schema and Prisma config are copied before the install because
# package.json's postinstall hook runs `prisma generate`, which reads them.
COPY package.json package-lock.json prisma7.config.ts ./
COPY prisma ./prisma
RUN npm ci

FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# No build args: every secret this app reads is server-side, so nothing needs
# to be baked into the client bundle. They are all supplied at run time.
ENV NEXT_TELEMETRY_DISABLED=1

RUN npx prisma generate && npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000

# node_modules comes from the builder rather than a second install: it already
# holds the generated Prisma client and the Prisma CLI the entrypoint needs to
# run migrations, so the image can never drift from what was built and tested.
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json /app/next.config.mjs ./
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma7.config.ts ./
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh && chown -R node:node /app

USER node
EXPOSE 3000
ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["npm", "run", "start"]
