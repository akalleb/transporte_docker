FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.output ./.output
COPY package*.json ./
RUN npm install --omit=dev
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
