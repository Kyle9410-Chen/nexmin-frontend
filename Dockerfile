# Keep the pnpm version in step with .github/workflows/*.yml (PNPM_VERSION).
FROM node:24-alpine AS builder

WORKDIR /app

RUN npm install -g pnpm@10.15.1

# Manifests first so editing source does not reinstall. pnpm-workspace.yaml carries
# `allowBuilds: esbuild: true`; without it pnpm 10 skips esbuild's postinstall and
# the build fails.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .

# Vite's loadEnv picks up VITE_-prefixed variables straight out of the environment,
# so no .env file is needed here. Without a value the bundle still builds, but
# src/lib/request/api.ts throws the moment the browser loads it.
ARG VITE_BACKEND_BASE_URL
ENV VITE_BACKEND_BASE_URL=$VITE_BACKEND_BASE_URL

# `pnpm build` rather than a bare `vite build`, so the image build runs the same
# `tsc -b` gate CI does and cannot silently diverge from it.
RUN pnpm build

FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
