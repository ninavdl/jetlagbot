FROM node:21-alpine as builder

WORKDIR /usr/src/app

COPY package.json package-lock.json ./

RUN npm install --develop

COPY src ./src
COPY tsconfig.json ./

RUN ls; cat tsconfig.json
RUN npm run build

FROM node:21-alpine

ENV NODE_ENV production

WORKDIR /usr/src/app

COPY package.json package-lock.json ./

RUN npm install 

COPY --from=builder /usr/src/app/out ./out
COPY static ./static

EXPOSE 8080
USER node
CMD ["node", "out/index.js"]

