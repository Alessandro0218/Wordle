# ---------- Stage 1: Build Angular app ----------
FROM node:22-alpine AS builder

ARG HOST
ARG PORT
ARG WS_HOST
ARG WS_PORT

WORKDIR /app

COPY package*.json ./

RUN npm ci --silent

COPY . .

RUN npm run build -- --configuration production --output-path=dist

FROM nginx:1.29-alpine

RUN rm -rf /usr/share/nginx/html/*

COPY nginx.conf /etc/nginx/conf.d/default.conf

COPY --from=builder /app/dist/browser /usr/share/nginx/html/

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
