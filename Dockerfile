FROM node:24-bookworm-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci && npx playwright install --with-deps chromium
COPY . .
RUN npm run build
ENV NODE_ENV=production HOST=0.0.0.0 PORT=4173 DSH_HOME=/data/harness
VOLUME ["/data/harness"]
EXPOSE 4173
CMD ["npm", "start"]
