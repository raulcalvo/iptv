'use strict';
const { chromium } = require('playwright');

module.exports = class Downloader {
    download(url){
        return chromium.launch({ headless: true}).then( browser => {
            return browser.newContext().then( context => {
                return context.newPage().then( page => {
                    return page.goto(url, { waitUntil: 'networkidle'}).then( () => {
                        return page.content().then( content => {
                            browser.close();
                            return content;
                        }).catch(error => {
                            return error;
                        });
                    }).catch(error => {
                        return error;
                    });;
                }).catch(error => {
                    return error;
                });
            }).catch(error => {
                return error;
            });;
        }).catch(error => {
            return error;
        });
    };

    validStreamUrl(url){
        return chromium.launch({ headless: true}).then( browser => {
            return browser.newContext().then( context => {
                return context.newPage().then( page => {
                    return page.goto(url, { waitUntil: 'networkidle', timeout: 1000 }).then( () => {
                        browser.close();
                        return false;
                    }).catch(error => {
                        browser.close();
                        return true;
                    });;
                }).catch(error => {
                    browser.close();
                    return false;
                });
            }).catch(error => {
                browser.close();
                return false;
            });
        }).catch(error => {
            return false;
        });
    };
};