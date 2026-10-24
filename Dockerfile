FROM oven/bun:1.4.4

WORKDIR /var/www/jordane.day

COPY package.json bun.lockb ./
RUN bun install
COPY . .

ENV NODE_ENV=production
CMD ["bun", "run", "init.ts"]
