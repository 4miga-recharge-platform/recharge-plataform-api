FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm install --ignore-scripts

COPY . .

RUN npx prisma generate
RUN npm run build

FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm install --omit=dev --ignore-scripts

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY start.sh ./

# Copy all files from dist/src to dist to maintain module structure
RUN cp -r dist/src/* dist/ && rm -rf dist/src

EXPOSE 3333

CMD ["node", "dist/main.js"]
