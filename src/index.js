

'use strict';
global.__basedir = __dirname;

process.env.UV_THREADPOOL_SIZE = 100;

const logger = require("logger-to-memory");
const api = require("express-simple-api");
const fs = require('fs');

var acestreamHost = typeof process.env.ACESTREAMHOST === "undefined" ? "127.0.0.1" : process.env.ACESTREAMHOST;
var acestreamPort = typeof process.env.ACESTREAMPORT === "undefined" ? "6878" : process.env.ACESTREAMPORT;

var Domain = require("./domain.js");
var Synchronizer = require("./synchronizer.js");

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

sync.launchSync();


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
        maxLength: 300,
        placeholder: "url to parse"
    }, {
        name: "interval",
        type: "string",
        maxLength: 3,
        placeholder: "Automatic update time in seconds (-1 no automatic update)"
    },{
        name: "includeM3u8",
        type: "string",
        maxLength: 3,
        placeholder: "If true, parser will include .m3u8 links"
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
    if (!domain.addSourceUrl(listName, req.query.url, req.query.interval, req.query.includeM3u8 == "true" ? true : false)){
        domain.removeSource(listName, req.query.url);
        domain.addSourceUrl(listName, req.query.url, req.query.interval, req.query.includeM3u8 == "true" ? true : false);
    }
    sync.updateChannels(listName, req.query.url, sync);
    sync.launchSourceSync(listName, req.query.url);
    res.setHeader('Content-type', "application/json");
    res.send(JSON.stringify(domain.getChannels(listName)));

});

jsonPath = {
    "path": "/api/addSource",
    "description": "Parse webside and replace acestream links in order to be able to open them with local acestream",
    "method": "GET",
    "params": [{
        name: "url",
        type: "string",
        maxLength: 300,
        placeholder: "url to parse"
    }, {
        name: "interval",
        type: "string",
        maxLength: 3,
        placeholder: "Automatic update time in seconds (-1 no automatic update)"
    },{
        name: "includeM3u8",
        type: "string",
        maxLength: 3,
        placeholder: "If true, parser will include .m3u8 links"
    }],
    "result": {
        "type": "json"
    }
};

e.addPath(jsonPath, (req, res) => {
    domain.addSourceToAllLists(req.query.url, req.query.interval, req.query.includeM3u8 == "true" ? true : false);
    domain.getListNamesOnArray().forEach( listName => {
        sync.updateChannels(listName, req.query.url, sync);
        sync.launchSourceSync(listName, req.query.url);
    });
    res.setHeader('Content-type', "application/json");
    res.send(JSON.stringify(domain._d));
});




jsonPath = {
    "path": "/api/addChanelSourceToList",
    "description": "Set channel",
    "method": "GET",
    "params": [{
        name: "list",
        type: "string",
        maxLength: 30,
        placeholder: "List name (empty is default list)"
    }, {
        name: "name",
        type: "string",
        maxLength: 100,
        placeholder: "Channel name"
    }, {
        name: "url",
        type: "string",
        maxLength: 300,
        placeholder: "Channel url: http / https / acestream"
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
    domain.addSourceChannel( listName, req.query.name, req.query.url)
    sync.updateChannels(listName, req.query.url, sync);
    res.setHeader('Content-type', "application/json");
    res.send(JSON.stringify(domain.getChannels(listName)));
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
    "path": "/api/setupList",
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
    if (!domain.setupList(listName, setup)){
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
    "path": "/api/removeSourceFromAllList",
    "description": "Remove list",
    "method": "GET",
    "params": [{
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
    if (domain.removeSource(req.query.url)){
        sync.clearIntervalForSource(req.query.url);
        res.send("Removed");
    } else
        res.send("Problem removing source");
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
    sync.launchSync();
    res.send("Backup restored");
});



e.startListening();
