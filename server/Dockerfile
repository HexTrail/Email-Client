FROM node:20-alpine

WORKDIR /app

# Install deps first (better layer caching)
COPY package*.json ./
RUN npm ci --omit=dev

# Copy source
COPY . .

# If TypeScript backend, build it (skip if plain JS)
# RUN npm run build

# Express API port
EXPOSE 5000

CMD ["node", "src/index.js"]