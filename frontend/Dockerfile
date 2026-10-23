FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

# The Mini App has no external IdP: Telegram `initData` is the only entry
# point. Keycloak variables were removed on purpose so they cannot creep back
# into the bundle.
ARG VITE_API_URL=/api/v1
ARG VITE_USE_MOCK=0

ENV VITE_API_URL=$VITE_API_URL
ENV VITE_USE_MOCK=$VITE_USE_MOCK

COPY . .
RUN npm run build

FROM nginx:1.25-alpine AS runner
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
