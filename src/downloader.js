'use strict';
const fetch = require('node-fetch');

module.exports = class Downloader {
  download(url) {
    return fetch(url).then( response => {
      return response.text();
    }).catch(error => {
      return error;}
    );
  }
};