'use strict';
global.__basedir = __dirname;

const requirer = require("extended-requirer");
const r = new requirer(__dirname, { "currentConfig": "PRO" });

const logger = r.require("logger-to-memory");

const api = r.require("express-simple-api");

const { exec } = require('child_process');
var mime = require('mime');
const path = require('path');

const fs = require('fs');

var loggerConfig = {
    "logger-to-memory": {
        "logsEnabled": true,
        "maxLogLines": 20,
        "logToConsole": true,
        "lineSeparator": "<br>"
    }
};
var log = new logger(loggerConfig);

var config = {
    "express-simple-api": {
        "apiHeader": "raulcalvo/express-simple-api description:",
        "host": '0.0.0.0',
        "port": typeof process.env.PORT === "undefined" ? 9999 : process.env.PORT
    }
};

var acestreamHost = typeof process.env.ACESTREAMHOST === "undefined" ? "192.168.1.22" : process.env.ACESTREAMHOST;
var acestreamPort = typeof process.env.ACESTREAMPORT === "undefined" ? "6878" : process.env.ACESTREAMPORT;


// Domain data

var channels = new Array();


function isHex(str) {
    var re = /[0-9A-Fa-f]{6}/g;
    if (re.test(str))
      return true;
    return false;
  }

function setChannel(number, title, pictureUrl, url){
    var link = "";
    if (isHex(url) && (url.length == 40))
        url = "acestream://" + url;
    if (url.startsWith("acestream://") && (url.length == 52) && isHex(url.substr(12))  )
        // link = "http://" + acestreamHost + ":" + acestreamPort + "/ace/manifest.m3u8?id=" + url.substr(12);
        link = "http://" + acestreamHost + ":" + acestreamPort + "/ace/getstream?id=" + url.substr(12);
    if (url.startsWith("http://") || url.startsWith("https://"))
        link = url;
    if (link == "")
        return;
    var channel = {
        "title" : title,
        "originalLink" : url,
        "link" : link,
        "pictureUrl" : pictureUrl
    };
    channels[number] = channel;
}


function findNextTagValue(param, tag){
    param.currentPos = param.buffer.indexOf(tag, ++param.currentPos);
    if (param.currentPos == -1)
        return false;
    param.currentPos = param.buffer.indexOf('"', ++param.currentPos);
    if (param.currentPos == -1)
        return false;
    var beginPos = param.currentPos + 1;
    param.currentPos = param.buffer.indexOf('"', ++param.currentPos);
    if (param.currentPos == -1)
        return false;
    param.tagValue = param.buffer.substr(beginPos, param.currentPos - beginPos);
    return true;
}


function intervalFunction(){
    if (lastInitialChannel == -1)
        return;

    console.log("Going to update...");
    fillChannelsWithUrl(lastSyncUrl, lastInitialChannel, lastUpdateInterval);
}

function getList(){
    var list = "";
    // "title" : title,
    // "originalLink" : url,
    // "link" : link,
    // "pictureUrl" : pictureUrl
    channels.forEach(channel => {
        list += "#EXTM3U\n";
        list += '#EXTINF:-1 tvg-logo="' + channel.pictureUrl + ' tvg-name="' + channel.title + '",'+ channel.title + '\n';
        list += channel.link + "\n";
    });
    return list;
}

var lastSyncUrl = "";
var lastInitialChannel = -1;
var lastUpdateInterval = -1;
var updateInterval = setInterval(intervalFunction, 5 * 60 * 1000);

function getBody(encoding) {
    if (this.statusCode >= 300) {
      var err = new Error(
        'Server responded with status code ' +
          this.statusCode +
          ':\n' +
          this.body.toString(encoding)
      );
      err.statusCode = this.statusCode;
      err.headers = this.headers;
      err.body = this.body;
      throw err;
    }
    return encoding ? this.body.toString(encoding) : this.body;
  }

function fillChannelsWithUrl(url, initialChannel, interval){
    try {
        var request = require('then-request');
        var result = { "buffer": "" };

        request('GET', url).done(function (res) {
            result.buffer = res.getBody("UTF8");
            var channelNumber = initialChannel;
            while (findNextTagValue(result,'href="acestream://')){
                const url = result.tagValue;
                if (url=="acestream://")
                    continue;
                var title = findNextTagValue(result,'alt="') ? result.tagValue : "Channel " + channelNumber;
                if (title == "")
                    title = "Channel " + channelNumber;
                const pictureUrl = findNextTagValue(result,'src="') ? result.tagValue : "";
    
                setChannel(channelNumber, title, pictureUrl, url);
                ++channelNumber;
            }
            const channelsUpdated = channelNumber - initialChannel;
            if (channelsUpdated > 0){
                lastSyncUrl = url;
                lastInitialChannel = initialChannel;
                lastUpdateInterval = interval;
                clearInterval(updateInterval);
                if (interval != -1)
                    updateInterval = setInterval(intervalFunction, lastUpdateInterval * 60 * 1000);
            }
            });
        return 0;
    } catch (error) {
        console.error('ERROR:');
        console.error(error);
        return 0;
    }
}

var e = new api(config);
e.setLogger(log);

var jsonPath = {
    "path": "/fillChannelsWithUrl",
    "description": "Parse webside and replace acestream links in order to be able to open them with local acestream",
    "method": "GET",
    "params": [{
        name: "url",
        type: "string",
        maxLength: 300,
        placeholder: "url to parse"
    },{
        name: "initialChannel",
        type: "string",
        maxLength: 3,
        placeholder: "Channel where to insert parsed channels"
    },{
        name: "interval",
        type: "string",
        maxLength: 3,
        placeholder: "Automatic update time in seconds (-1 no automatic update)"
    }],
    "result": {
        "type": "json"
    }
};

e.addPath(jsonPath, (req, res) => {
    const channelsUpdated = fillChannelsWithUrl(req.query.url, req.query.initialChannel, req.query.interval);
    res.send("Added " + channelsUpdated + " channels.");
    // res.setHeader('Content-type', "application/json");
    // res.send(JSON.stringify(channels));
});


jsonPath = {
    "path": "/",
    "description": "Main endpoint",
    "method": "GET",
    "params": [],
    "result": {
        "type": "json"
    }
};
e.addPath(jsonPath, (req, res) => {
    res.send("<html><body><div align='center'>Something is coming...<br>;-)</div>");
});

jsonPath = {
    "path": "/tv.m3u8",
    "description": "Returns the m3u8 list",
    "method": "GET",
    "params": [],
    "result": {
        "type": "json"
    }
};
e.addPath(jsonPath, (req, res) => {
    res.setHeader('Content-type', "application/x-mpegURL");
    res.send(getList());
});

jsonPath = {
    "path": "/setChannel",
    "description": "Set channel",
    "method": "GET",
    "params": [{
        name: "number",
        type: "string",
        maxLength: 2,
        placeholder: "Channel number"
    },{
        name: "title",
        type: "string",
        maxLength: 100,
        placeholder: "Channel name"
    },{
        name: "url",
        type: "string",
        maxLength: 300,
        placeholder: "Channel url: http / https / acestream"
    },{
        name: "pictureUrl",
        type: "string",
        maxLength: 300,
        placeholder: "Channel picture URL"
    }],
    "result": {
        "type": "json"
    }
};

e.addPath(jsonPath, (req, res) => {
    setChannel(req.query.number, req.query.title, req.query.pictureUrl, req.query.url);
    res.setHeader('Content-type', "application/json");
    res.send(JSON.stringify(channels));
});

e.startListening();
