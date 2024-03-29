'use strict';
global.__basedir = __dirname;

process.env.UV_THREADPOOL_SIZE = 100;
// process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const path = require('path');
const express = require("express");
const logger = require("logger-to-memory");
const api = require("express-simple-api");
const fs = require('fs');
const parser = require("./acestream-url-parser.js");

var acestreamHost = typeof process.env.ACESTREAMHOST === "undefined" ? "127.0.0.1" : process.env.ACESTREAMHOST;
var acestreamPort = typeof process.env.ACESTREAMPORT === "undefined" ? "6878" : process.env.ACESTREAMPORT;

var Domain = require("./domain.js");
var Synchronizer = require("./synchronizer.js");

const Downloader = require("./downloader.js");
var downloader = new Downloader();

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


var domain = new Domain({
    "acestreamHost": acestreamHost,
    "acestreamPort": acestreamPort
});

domain.readFromDisk();

var sync = new Synchronizer(domain);

sync.updateAndLaunchSync();


function getListNameFromParam(listName) {
    return typeof listName === "undefined" || listName == "" ? "default" : listName;
}


function getList(listName) {
    var list = "";
    _d[listName].c.forEach(channel => {
        list += "#EXTM3U\n";
        list += '#EXTINF:-1 tvg-logo="' + channel.pictureUrl + ' tvg-name="' + channel.title + '",' + channel.title + '\n';
        list += getChannelLink(listName, channel.originalLink) + "\n";
    });
    return list;
}

var e = new api(config);
e.setLogger(log);

var jsonPath = {
    "path": "/",
    "description": "Main endpoint",
    "method": "GET",
    "params": [],
    "result": {
        "type": "json"
    }
};
e.addPath(jsonPath, (req, res) => {
    res.send("<html><body><div align='center'>IPTV (c)<br><a href='www.raulcalvo.com'>raulcalvo</a><br>;-)</div>");
});



jsonPath = {
    "path": "/api/addSourceToList",
    "description": "Parse webside and replace acestream links in order to be able to open them with local acestream",
    "method": "GET",
    "params": [{
        name: "list",
        type: "string",
        maxLength: 30,
        placeholder: "List name (empty is default list)"
    }, {
        name: "url",
        type: "string",
        maxLength: 2048,
        placeholder: "url to parse or json with url and position_channel_name attributes"
    }, {
        name: "interval",
        type: "string",
        maxLength: 3,
        placeholder: "Automatic update time in minutes (-1 no automatic update)"
    }, {
        name: "positionChannelName",
        type: "string",
        maxLength: 10,
        placeholder: "how to begin searching for channel title when parsing (after|before)"
    }, {
        name: "eoi_url",
        type: "string",
        maxLength: 10,
        placeholder: "Url to site with information about events"
    }],
    "result": {
        "type": "json"
    }
};

function isJsonString(str) {
    try {
        JSON.parse(str);
    } catch (e) {
        return false;
    }
    return true;
}

function addSourceToList(json){
    const listName = getListNameFromParam(json.list);
    if (!domain.listExists(listName)){
        return "List " + listName + " doesn't exist.";
    }

    domain.removeSourceFromList(listName, json.url);
    domain.addSourceUrl(listName, json.url, json.interval, json.positionChannelName, json.eoi_url);

    var source = domain.getSource(listName, json.url);
    return sync.updateChannels(source, sync).then( synchronized => {
        sync.launchSourceSync(source);
        return domain.getChannels(listName);
    }).catch(error => {
        return error;
    });
}

e.addPath(jsonPath, (req, res) => {
    addSourceToList(req.query).then( channels => {
        res.setHeader('Content-type', "application/json");
        res.send(JSON.stringify(channels));
    }).catch(error =>{
        res.send("ERROR: " + error);
    });
});


jsonPath = {
    "path": "/tv.m3u8",
    "description": "Returns the m3u8 list",
    "method": "GET",
    "params": [{
        name: "list",
        type: "string",
        maxLength: 30,
        placeholder: "List name (empty is default list)"
    }],
    "result": {
        "type": "json"
    }
};
e.addPath(jsonPath, (req, res) => {
    res.setHeader('Content-type', "application/x-mpegURL");
    res.send(domain.getM3U8List(getListNameFromParam(req.query.list)));
});

jsonPath = {
    "path": "/tv.html",
    "description": "Returns the m3u8 list",
    "method": "GET",
    "params": [{
        name: "list",
        type: "string",
        maxLength: 30,
        placeholder: "List name (empty is default list)"
    }],
    "result": {
        "type": "json"
    }
};
e.addPath(jsonPath, (req, res) => {
    res.setHeader('Content-type', "text/html");
    res.send(domain.getHTMLList(getListNameFromParam(req.query.list), req.protocol + '://' + req.get('host') + "/android-chrome-192x192.png"));
});



jsonPath = {
    "path": "/api/createList",
    "description": "Create list",
    "method": "GET",
    "params": [{
        name: "list",
        type: "string",
        maxLength: 30,
        placeholder: "List name (empty is default list)"
    }, {
        name: "acestreamHost",
        type: "string",
        maxLength: 200,
        placeholder: "Acestream host (" + acestreamHost + " by default)"
    }, {
        name: "acestreamPort",
        type: "string",
        maxLength: 5,
        placeholder: "Acestream port (" + acestreamPort + " by default)"
    }],
    "result": {
        "type": "json"
    }
};

e.addPath(jsonPath, (req, res) => {
    const listName = getListNameFromParam(req.query.list);
    const setup = {
        "acestreamHost" : req.query.acestreamHost,
        "acestreamPort" : req.query.acestreamPort
    };
    if (!domain.createList(listName,setup)){
        res.send("Cannot create list " + listName);
    } else {
        domain.writeToDisk(listName);
        res.send(JSON.stringify(domain.getList(listName)));
    }
});

jsonPath = {
    "path": "/api/modifyList",
    "description": "Setup list",
    "method": "GET",
    "params": [{
        name: "list",
        type: "string",
        maxLength: 30,
        placeholder: "List name (empty is default list)"
    }, {
        name: "acestreamHost",
        type: "string",
        maxLength: 200,
        placeholder: "Acestream host (" + acestreamHost + " by default)"
    }, {
        name: "acestreamPort",
        type: "string",
        maxLength: 5,
        placeholder: "Acestream port (" + acestreamPort + " by default)"
    }],
    "result": {
        "type": "json"
    }
};

e.addPath(jsonPath, (req, res) => {
    const listName = getListNameFromParam(req.query.list);
    if (!domain.listExists(listName)){
        res.send("Error: list " + listName + " doesn't exist.");
        return;
    }

    const setup = {
        "acestreamHost" : req.query.acestreamHost,
        "acestreamPort" : req.query.acestreamPort
    };
    if (!domain.modifyList(listName, setup)){
        res.send("Error aplying setup to list " + listName);
        return;
    }
    domain.writeToDisk(listName);
    res.send(JSON.stringify(domain.getList(listName)));
});



jsonPath = {
    "path": "/api/getList",
    "description": "Returns list info",
    "method": "GET",
    "params": [{
        name: "list",
        type: "string",
        maxLength: 30,
        placeholder: "List name (empty is default list)"
    }],
    "result": {
        "type": "json"
    }
};
e.addPath(jsonPath, (req, res) => {
    const listName = getListNameFromParam(req.query.list);
    if (!domain.listExists(listName)){
        res.send("Error: list " + listName + " doesn't exist.");
        return;
    }
    res.send(JSON.stringify(domain.getListInfo(listName)));
});


jsonPath = {
    "path": "/api/removeList",
    "description": "Remove list",
    "method": "GET",
    "params": [{
        name: "list",
        type: "string",
        maxLength: 30,
        placeholder: "List name (empty is default list)"
    }],
    "result": {
        "type": "json"
    }
};
e.addPath(jsonPath, (req, res) => {
    const listName = getListNameFromParam(req.query.list);
    if (!domain.listExists(listName)){
        res.send("Error: list " + listName + " doesn't exist.");
        return;
    }
    if (domain.removeList(listName)){
        domain.writeToDisk(listName);
        res.send("List " + listName + " removed.")
    } else {
        res.send("List " + listName + " doesn't exist.")
    }
});

jsonPath = {
    "path": "/api/removeSourceFromList",
    "description": "Remove list",
    "method": "GET",
    "params": [{
        name: "list",
        type: "string",
        maxLength: 30,
        placeholder: "List name (empty is default list)"
    },{
        name: "url",
        type: "string",
        maxLength: 512,
        placeholder: "Url (source) to remove"
    }],
    "result": {
        "type": "json"
    }
};
e.addPath(jsonPath, (req, res) => {
    const listName = getListNameFromParam(req.query.list);
    if (!domain.listExists(listName)){
        res.send("Error: list " + listName + " doesn't exist.");
        return;
    }
    if (domain.removeSourceFromList(listName, req.query.url)){
        sync.clearIntervalForListAndSource(listName, req.query.url)
        domain.writeToDisk(listName);
        res.send("Source removed from list " + listName);
    } else {
        res.send("Can't remove source.");
    }
});

jsonPath = {
    "path": "/api/getData",
    "description": "Obtain all running data",
    "method": "GET",
    "params": [],
    "result": {
        "type": "json"
    }
};
e.addPath(jsonPath, (req, res) => {
    res.setHeader('Content-type', "application/json");
    res.send(JSON.stringify(domain._d));
});


jsonPath = {
    "path": "/api/getBackup",
    "description": "Obtain data backup",
    "method": "GET",
    "params": [],
    "result": {
        "type": "json"
    }
};
e.addPath(jsonPath, (req, res) => {
    res.setHeader('Content-type', "application/json");
    res.send(JSON.stringify(domain.getBackup()));
});


jsonPath = {
    "path": "/api/restoreBackup",
    "description": "Restore saved backup",
    "method": "GET",
    "params": [{
        name: "backupData",
        type: "string",
        maxLength: 8000,
        placeholder: "Json saved with getBackup method"
    }],
    "result": {
        "type": "json"
    }
};

e.addPath(jsonPath, (req, res) => {
    var backup = JSON.parse(req.query.backupData);
    if (Object.keys(backup).length == 0){
        res.send("Error, not valid backup.");
    }

    sync.clearIntervals();
    domain.setBackup(backup);
    sync.updateAndLaunchSync();
    res.send("Backup restored");
});

jsonPath = {
    "path": "/api/testParseJsonSource",
    "description": "Parse webside and output channels",
    "method": "GET",
    "params": [{
        name: "json",
        type: "string",
        maxLength: 4096,
        placeholder: "json source"
    }],
    "result": {
        "type": "json"
    }
};

e.addPath(jsonPath, async (req, res) => {
    try{
        var json = JSON.parse(req.query.json);
        var source = domain.newSourceUrl("fakeListName", json.url, 30, json.position_channel_name, json.eoi_url);
        parser(source).then( channels => {
            res.setHeader('Content-type', "application/json");
            res.send(JSON.stringify(channels));
        }).catch( error => {
            res.send("ERROR: " - error)
        });
    } catch (error){
        res.send("ERROR: " + error);
    }
});

jsonPath = {
    "path": "/api/scrap",
    "description": "Scrap url and download the html file",
    "method": "GET",
    "params": [{
        name: "url",
        type: "string",
        maxLength: 4096,
        placeholder: "url"
    }],
    "result": {
        "type": "json"
    }
};

e.addPath(jsonPath, async (req, res) => {
    downloader.download(req.query.url).then( buffer => {
        res.send(buffer);
    }).catch( error => {
        res.send("ERROR: " - error);
    });
});


jsonPath = {
    "path": "/set",
    "description": "Set single channel",
    "method": "GET",
    "params": [{
        name: "name",
        type: "string",
        maxLength: 32,
        placeholder: "Channel name"
    },
    {
        name: "channel",
        type: "string",
        maxLength: 1024,
        placeholder: "Channel id"
    }],
    "result": {
        "type": "json"
    }
};

e.addPath(jsonPath, async (req, res) => {
    domain.setSingleChannel(req.query.name, req.query.channel);
    res.send("DONE");
});

jsonPath = {
    "path": "/get",
    "description": "Get single channel",
    "method": "GET",
    "params": [{
        name: "name",
        type: "string",
        maxLength: 32,
        placeholder: "Channel name"
    }],
    "result": {
        "type": "json"
    }
};

e.addPath(jsonPath, async (req, res) => {
    res.send(domain.getSingleChannel(req.query.name));
});


e._express.use(express.static(path.join(__dirname, 'favicon')));

e.startListening();

