# Stage 1: Build the Angular app
FROM --platform=linux/amd64 node:20-alpine AS build

WORKDIR /app

# Install build tools
RUN apk add --no-cache make gcc g++ python3 py3-pip

# Copy package files and install dependencies
COPY package.json package-lock.json ./
RUN npm install --legacy-peer-deps

# Copy app files
COPY . .

# Build the Angular app
RUN npm run build -- --configuration=production

# Stage 2: Serve the Angular app with Nginx
FROM nginx:1.21.0-alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]