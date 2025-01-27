FROM node:20 as base
WORKDIR /app
COPY . .
RUN npm ci
CMD ["npm", "run", "build"]