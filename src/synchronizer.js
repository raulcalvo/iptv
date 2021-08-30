'use strict';
const fs = require("fs");
const parser = require("./acestream-url-parser.js");

module.exports = class synchronizer {
    updateChannels(listName, url, sync) {
        console.log("Updating channels from list " + listName + " and source " + url + ")");
        if (typeof listName === 'undefined') {
            console.log("UNDEFINED PARAM!!!");
            return;
        }
        
        sync._domain.clearChannels(listName, url);
        var source = sync._domain.getSource(listName,url);
        if (!source.hasOwnProperty("isSingleChannel"))
            return;
        if (source.isSingleChannel){
            sync._domain.addChannel(listName, source.name, source.url );
        } else {
            var channels = parser(source.url, source.includeM3u8);
            if (channels.length > 0){
                channels.forEach( channel => {
                    sync._domain.addChannel(listName, channel.name, channel.url, source.url, channel.logo);
                });
                source["numChannels"] = channels.length;
                source["lastUpdate"] = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '');
            }
        }
        sync._domain.writeToDisk(listName);
    }

    launchSourceSync(list, url){
        if (!this._intervals.hasOwnProperty(list)){
            this._intervals[list] = {};
        }
        var source = this._domain.getSource(list, url);
        if (source.hasOwnProperty("updateTime")){
            this._intervals[list][url] = setInterval( this.updateChannels, this._domain.getSource(list, url).updateTime * 60 * 1000, list, url, this);
            this.updateChannels(list, url, this);
        }
    }

    launchListSync(listName){
        this.clearIntervals(listName);
        Object.keys(this._domain.getSources(listName)).forEach( url =>{
            this.launchSourceSync(listName, url);
        } );
    }    

    launchSync(){
        this.clearIntervals();
        Object.keys(this._domain.getLists()).forEach( list => {
            this.launchListSync(list);
        });
    }

    clearIntervalsFromList(list){
        if (this._intervals.hasOwnProperty(list)){
            Object.keys(this._intervals[list]).forEach( url => {
                clearInterval(this._intervals[list][url]);
            });
        }
    }

    clearIntervalForSource(url){
        Object.keys(this._intervals).forEach( listName => {
            clearInterval(this._intervals[listName][url]);
            this._domain.writeToDisk(listName);
        });
    }

    clearIntervalForListAndSource(listName, url){
        clearInterval(this._intervals[listName][url]);
        this._domain.writeToDisk(listName);
    }


    clearIntervals(){
        Object.keys(this._intervals).forEach( listName => {
            this.clearIntervalsFromList(listName);
        });
    }

    constructor(domain){
        this._domain = domain;
        this._intervals = {};
    }
}
