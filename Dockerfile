FROM node:22-alpine

WORKDIR /app

COPY package.json .

COPY yarn.lock .

RUN yarn

COPY . .

EXPOSE 3001

CMD [ "yarn", "start" ]
