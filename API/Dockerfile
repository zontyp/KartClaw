FROM node:24-alpine
# 📦 Baileys pulls one dependency from git, so the tiny Alpine image needs git
# during npm install. No build system here, just enough tools to fetch packages.
RUN apk add --no-cache git
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY src ./src
COPY db ./db
ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000
CMD ["npm", "start"]
