FROM node:24-slim

# Node.js 24 LTS with npm included

WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY src ./src

EXPOSE 3000
CMD ["node", "src/index.js"]
