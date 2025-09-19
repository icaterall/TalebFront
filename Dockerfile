# Stage 1: build
FROM node:20-alpine AS build
WORKDIR /app
RUN apk add --no-cache make gcc g++ python3 py3-pip
COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps
COPY . .
RUN npm run build -- --configuration=production

# Stage 2: nginx
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
# If outputMode=server (SSR enabled):
COPY --from=build /app/dist/anataleb-frontend/browser/ /usr/share/nginx/html/
# If outputMode=browser, use:
# COPY --from=build /app/dist/anataleb-frontend/ /usr/share/nginx/html/
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
