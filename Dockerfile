FROM node:10-alpine
RUN mkdir -p /home/node/app/node_modules && chown -R node:node /home/node/app && mkdir /home/node/app/data
WORKDIR /home/node/app
USER node
COPY --chown=node:node ./src/* ./
RUN npm install
EXPOSE 8080
CMD [ "node", "index.js" ]
