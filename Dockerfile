# syntax=docker/dockerfile:1.7
FROM node:22-alpine AS build

WORKDIR /app
COPY package*.json ./
RUN --mount=type=secret,id=npm_token,required=false sh -c 'TOKEN="$(cat /run/secrets/npm_token 2>/dev/null || true)"; if [ -n "$TOKEN" ]; then printf "@hoelk-f:registry=https://npm.pkg.github.com/\n//npm.pkg.github.com/:_authToken=%s\n" "$TOKEN" > /tmp/npmrc; NPM_CONFIG_USERCONFIG=/tmp/npmrc npm ci; rm -f /tmp/npmrc; else npm ci; fi'
COPY . .
RUN npm run build:app

FROM nginx:1.30.7-alpine3.24@sha256:bef154735288bc38d99fac41ae63730684bcc661503673a04a0f9bc526ba8598
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/build /usr/share/nginx/html/solid-health-questionnaire
EXPOSE 3007
CMD ["nginx", "-g", "daemon off;"]
