'use strict';
const fs = require("fs");
const parser = require("./acestream-url-parser.js");


module.exports = class synchronizer {
    updateChannels(source, sync) {
        console.log("Updating channels from list " + source.list + " and source " + source.url + ")");
        if (typeof source.list === 'undefined') {
            console.log("UNDEFINED PARAM!!!");
            return false;
        }
        sync._domain.clearChannels(source.list, source.url);

        return parser(source).then( channels => {
            source["numChannels"] = channels.length;
            var date = new Date();
            source["lastUpdate"] = date.toISOString().replace(/T/, ' ').replace(/\..+/, '');
            source["lastUpdateEpoch"] = Math.floor(date.getTime() / 1000);
            channels.forEach( channel => {
                sync._domain.addChannel(source.list, channel.name, channel.url, source.url, channel.logo);
            });
            sync._domain.removeDuplicateChannels(source.list);
            sync._domain.writeToDisk(source.list);
            return true;
        }).catch(error => {
            sync._domain.writeToDisk(source.list);
            return error;
        })
    }

    launchSourceSync(source){
        if (!this._intervals.hasOwnProperty(source.list)){
            this._intervals[source.list] = {};
        }
        if (source.hasOwnProperty("updateTime")){
            this._intervals[source.list][source.url] = setInterval( this.updateChannels, source.updateTime * 60 * 1000, source, this);
        }
    }

    launchListSync(listName){
        this.clearIntervals(listName);
        Object.keys(this._domain.getSources(listName)).forEach( sourceUrl =>{
            var source = this._domain.getList(listName).sources[sourceUrl];
            this.updateChannels(source, this).then( sychronized =>{
                this.launchSourceSync(source);
            }).catch(error => {
                return "Error synchronizing channels from list" + listName + " and source " + source.url;
            });
        } );
    }    

    updateAndLaunchSync(){
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
