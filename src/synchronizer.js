'use strict';
const fs = require("fs");
const parser = require("./acestream-url-parser.js");


module.exports = class synchronizer {
    updateChannels(listName, url, sync) {
        console.log("Updating channels from list " + listName + " and source " + url + ")");
        if (typeof listName === 'undefined') {
            console.log("UNDEFINED PARAM!!!");
            return Reject(false);
        }
        sync._domain.clearChannels(listName, url);
        var source = sync._domain.getSource(listName,url);

        if (!source.hasOwnProperty("isSingleChannel"))
            return Reject(false);

        return parser(source).then( channels => {
            source["numChannels"] = channels.length;
            var date = new Date();
            source["lastUpdate"] = date.toISOString().replace(/T/, ' ').replace(/\..+/, '');
            source["lastUpdateEpoch"] = Math.floor(date.getTime() / 1000);
            channels.forEach( channel => {
                sync._domain.addChannel(listName, channel.name, channel.url, source.url, channel.logo);
            });
            sync._domain.removeDuplicateChannels(listName);
            sync._domain.writeToDisk(listName);
            return true;
        }).catch(error => {
            sync._domain.writeToDisk(listName);
            return error;
        })
    }

    launchSourceSync(list, url){
        if (!this._intervals.hasOwnProperty(list)){
            this._intervals[list] = {};
        }
        var source = this._domain.getSource(list, url);
        if (source.hasOwnProperty("updateTime")){
            this._intervals[list][url] = setInterval( this.updateChannels, this._domain.getSource(list, url).updateTime * 60 * 1000, list, url, this);
        }
    }

    launchListSync(listName){
        this.clearIntervals(listName);
        Object.keys(this._domain.getSources(listName)).forEach( url =>{
            this.updateChannels(listName, url, this).then( sychronized =>{
                this.launchSourceSync(listName, url);
            }).catch(error => {
                return "Error synchronizing channels from list" + listName + " and source " + url;
            });
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
