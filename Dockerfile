FROM mcr.microsoft.com/playwright:v1.24.0-focal
RUN mkdir -p /home/node/app/node_modules
WORKDIR /home/node/app
COPY ./src/ ./ 
RUN ls
RUN npm install
RUN cp -R /ms-playwright/chromium-1015 /ms-playwright/chromium-1024
EXPOSE 8080
CMD [ "node", "index.js" ]