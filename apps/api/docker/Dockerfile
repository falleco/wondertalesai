FROM node:20 AS builder
WORKDIR /app
COPY ./package.json ./
COPY ./yarn.lock ./
RUN yarn install
COPY . .
RUN yarn build


# Second Stage : Setup command to run your app using lightweight node image
FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app ./
EXPOSE 4001
CMD [ "yarn", "run", "start:prod" ]
