'use strict';
const fs = require("fs");
const { title } = require("process");

function isEmptyObject(obj) {
    return !Object.keys(obj).length;
}

module.exports = class domain {
    emptyList(setup) {
        return {
            "channels": new Array(),
            "sources": {},
            "setup" : setup
        };
    }    
    constructor(setup){
        this._d = { 
            "lists" : {}
             };
        this.listSufix = '.list.json';
    }

    createList(name, setup){
        if (this.listExists(name)){
            return false;
        } else {
            this.resetList(name,setup);
            return true;
        }
    }

    setupList(name, setup){
        if (this.listExists(name)){
            return false;
        } else {
            this._d.lists[name].setup = setup;
            return true;
        }
    }

    removeList(name){
        if (this.listExists(name)){
            return false;
        } else {
            delete this._d.lists[name];
            return true;
        }

    }

    getChannels(listName){
        if (this.listExists(listName)){
            return this._d.lists[listName].channels;
        }
        return new Array();
    }

    listExists(name){
        return this._d.lists.hasOwnProperty(name);
    }

    resetList(name, setup){
        this._d.lists[name] = this.emptyList(setup);
    }

    sourceExists(list, url){
        if (!this.listExists(list)){
            return false;
        } else {
            return this._d.lists[list].hasOwnProperty(url);
        }
    }
        
    newSourceUrl(url, updateTime) {
        return {
            "url": url,
            "isSingleChannel" : false,
            "updateTime" : updateTime
        };
    }
    
    newSourceChannel(name, url) {
        return {
            "name" : name,
            "url": url,
            "isSingleChannel" : true
        };
    }

    addSourceChannel(list, name, url){
        if (this.listExists() && !this.sourceExists(list, url)){
            this._d.lists[list].sources[url] = this.newSourceChannel(name, url);
            return true;
        }
        return false;
    }

    addSourceUrl(list, url, updateTime){
        if (this.listExists(list) && !this.sourceExists(list, url)){
            this._d.lists[list].sources[url] = this.newSourceUrl(url, updateTime);
            return true;
        }
        return false;
    }

    getSources(list){
        if (this.listExists(list)){
            return this._d.lists[list].sources;
        }
        return {};
    }

    getLists(){
        return this._d.lists
    }

    getList( listName ){
        return this._d.lists[listName];
    }

    getSource(list,url){
        if (this.listExists(list) && this._d.lists[list].sources.hasOwnProperty(url)){
            return this._d.lists[list].sources[url];
        }
        return {};
    }

    removeSource(list,url){
        if (this.getSource(list,url).hasOwnProperty("url")){
            delete this._d.lists[list].sources[url];
        }
    }

    readListFromDisk(list){
        const filename = list + ".list.json";
        if (fs.existsSync(filename)) {
            const data = fs.readFileSync(filename, "utf8");
            if (data.length != 0) {
                const readed = JSON.parse(data);
                if (!isEmptyObject(readed)) {
                    return readed;
                }
            }
        }        
        return {};
    }

    insertOfUpdateList(listName, listObject){
        if (Object.keys(listObject).length === 0){ 
            if (listExists(listName)){ 
                delete this._d.lists[listName];
            }
        } else {
            this._d.lists[listName] = listObject;
        }
    }

    readFromDisk( list ) {
        if ( typeof list === "undefined"){  // read all lists
            var files = fs.readdirSync('.').filter(fn => fn.endsWith(this.listSufix));
            files.forEach(listFile => {
                const listName = listFile.slice(0,- this.listSufix.length);
                this.insertOfUpdateList(listName, this.readListFromDisk(listName));
            });
        } else {
            this.insertOfUpdateList(list, this.readListFromDisk(list));
        }
    }
    
    writeToDisk( list ) {
        if ( typeof list === "undefined"){  // read all lists
            Object.keys(this._d.lists).forEach( (listName) => {
                if (listExists(listName)){
                    fs.writeFileSync(listName + this.listSufix, JSON.stringify(this._d.lists[listName]));
                }
            })
        } else {
            if (this.listExists(list)){
                fs.writeFileSync(list + this.listSufix, JSON.stringify(this._d.lists[list]));
            }
        }
    }

    clearChannels(list, url){
        if (this.listExists(list)){
            this._d.lists[list].channels = this._d.lists[list].channels.filter(item => item.source != url);
        }
    }

    addChannel(list,name,url, source){
        if (this.listExists(list)){
            this._d.lists[list].channels.push({
                "name" : name,
                "url" : url,
                "source" : source
            });
        }
    }

    isHex(str) {
        var re = /[0-9A-Fa-f]{6}/g;
        if (re.test(str))
            return true;
        return false;
    }
    
     getChannelLink(listName, url) {
        var link = "";
        if (this.isHex(url) && (url.length == 40))
            url = "acestream://" + url;
        if (url.startsWith("acestream://") && (url.length == 52) && this.isHex(url.substr(12)))
            link = "http://" + this.getList(listName).setup.acestreamHost + ":" + this.getList(listName).setup.acestreamPort + "/ace/getstream?id=" + url.substr(12);
        if (url.startsWith("http://") || url.startsWith("https://"))
            link = url;
        return link;
    }
    
    getM3U8List(listName) {
        var output = "";
        this.getChannels(listName).forEach( channel =>{
            output += "#EXTM3U\n";
            output += '#EXTINF:-1 tvg-name="' + channel.name + '",' + channel.name + '\n';
            output += this.getChannelLink(listName, channel.url) + "\n";
        });
        return output;
    }    

}
