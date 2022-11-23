'use strict';
const request = require("https");

module.exports = class Downloader {
    download(url) {
        return new Promise((resolve, reject) => {
          const http = require('http'),
            https = require('https');
      
          let client = http;
      
          if (url.toString().indexOf("https") === 0) {
            client = https;
          }
      
          client.get(url, (resp) => {
            let chunks = [];
      
            // A chunk of data has been recieved.
            resp.on('data', (chunk) => {
              chunks.push(chunk);
            });
      
            // The whole response has been received. Print out the result.
            resp.on('end', () => {
              resolve(Buffer.concat(chunks).toString('utf-8'));
            });
      
          }).on("error", (err) => {
            reject(err);
          });
        });
      }
};