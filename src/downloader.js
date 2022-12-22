'use strict';
module.exports = class Downloader {
  download(url, proxy = "") {
    return new Promise((resolve, reject) => {

      var request = require('request');

      var options = proxy != "" ? {
        url: url,
        proxy: proxy
      } : {
        url: url
      };

      request(options, function (error, response, body) {
        if (error) {
          reject(error);
        } else {
          resolve(response.body);
        }
      });
    });
  }
};