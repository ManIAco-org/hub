FROM node:22-slim

# Build tools needed to compile node-pty native bindings
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    tmux \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install deps (native compile happens here)
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

COPY server.js .

EXPOSE 3001

CMD ["node", "server.js"]
