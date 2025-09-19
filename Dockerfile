# -------- Stage 1: Build (Angular 20) --------
FROM node:20-alpine AS build
WORKDIR /app

# Faster, reproducible installs
COPY package*.json ./
RUN npm ci --legacy-peer-deps

# Build
COPY . .
ARG BUILD_CONFIGURATION=production
RUN npm run build -- --configuration=$BUILD_CONFIGURATION

# -------- Stage 2: Runtime (Nginx) --------
FROM nginx:1.27-alpine

# Minimal SPA config (no external file needed)
RUN rm -rf /etc/nginx/conf.d/* && \
    printf 'server {\n\
      listen 80;\n\
      server_name _;\n\
      root /usr/share/nginx/html;\n\
      index index.html;\n\
      gzip on;\n\
      gzip_types text/plain application/javascript text/css application/json image/svg+xml;\n\
      location / {\n\
        try_files $uri $uri/ /index.html;\n\
      }\n\
      location ~* \\.(?:png|jpe?g|gif|svg|ico|webp|css|js|woff2?)$ {\n\
        expires 30d;\n\
        add_header Cache-Control \"public, immutable\";\n\
      }\n\
    }\n' > /etc/nginx/conf.d/default.conf

# Copy ONLY the browser output from Angular 17/18/19/20 builds
# This matches dist/<project-name>/browser
COPY --from=build /app/dist/*/browser /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
