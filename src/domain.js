'use strict';
var request = require('sync-request');
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
        this.dataFolder = './data';
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
        if (!this.listExists(name)){
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
        if (this.listExists(list) && !this.sourceExists(list, url)){
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

    addSourceToAllLists(url, updateTime){
        Object.keys(this._d.lists).forEach( listName => {
            this.addSourceUrl( listName, url, updateTime);
        });
    }

    getListNamesOnArray(){
        return Object.keys(this._d.lists);
    }

    getListInfo(listName){
        var result = {
            "name" : listName,
            "channelsCount" : this._d.lists[listName].channels.length,
            "sources" : new Array(),
            "channels" : this._d.lists[listName].channels
        };
        Object.keys(this._d.lists[listName].sources).forEach( url => {
            result.sources.push(this._d.lists[listName].sources[url]);
        });
        return result;
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

    removeSourceFromList(list,url){
        if (this.getSource(list,url).hasOwnProperty("url")){
            delete this._d.lists[list].sources[url];
            this._d.lists[list].channels = this._d.lists[list].channels.filter(item => item.source != url);
            return true;
        }
        return false;
    }

    removeSource(url){
        var removed = false;
        Object.keys(this._d.lists).forEach( listName => {
            this.removeSourceFromList( listName, url);
            removed = true;
        });
        return removed;
    }

    readListFromDisk(list){
        const filename = this.dataFolder + "/" + list + ".list.json";
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
            if (!fs.existsSync(this.dataFolder)){
                fs.mkdirSync(this.dataFolder);
            }            
            var files = fs.readdirSync(this.dataFolder).filter(fn => fn.endsWith(this.listSufix));
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
                if (this.listExists(listName)){
                    fs.writeFileSync(this.dataFolder + "/" + listName + this.listSufix, JSON.stringify(this._d.lists[listName]));
                }
            })
        } else {
            if (this.listExists(list)){
                fs.writeFileSync(this.dataFolder + "/" + list + this.listSufix, JSON.stringify(this._d.lists[list]));
            }
        }
    }

    getBackup(){
        var result = {};
        Object.keys(this._d.lists).forEach( (listName) => {
            if (this.listExists(listName)){
                var list = {};
                Object.assign(list, this._d.lists[listName]);
                delete list.channels;
                result[listName] = list;
            }
        })
        return result;
    }

    setBackup(backup){
        this._d.lists = {};
        Object.assign(this._d.lists, backup);
    }

    clearChannels(list, url){
        if (!this._d.lists[list].hasOwnProperty("channels"))
            return;
        if (this.listExists(list)){
            this._d.lists[list].channels = this._d.lists[list].channels.filter(item => item.source != url);
        }
    }

    addChannel(list,name,url, source, logo){
        if (this.listExists(list)){
            if (!this._d.lists[list].hasOwnProperty("channels"))
                this._d.lists[list].channels = new Array();
            this._d.lists[list].channels.push({
                "name" : name,
                "url" : url,
                "source" : source,
                "logo" : logo
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

    getChannelLinkPrefix(listName) {
        if (url.startsWith("acestream://") && (url.length == 52) && this.isHex(url.substr(12)))
            link = "http://" + this.getList(listName).setup.acestreamHost + ":" + this.getList(listName).setup.acestreamPort + "/ace/getstream?id=";
        if (url.startsWith("http://") || url.startsWith("https://"))
            link = url;
        return link;
    }
    
    
    getM3U8List(listName) {
        var output = "";
        this.getChannels(listName).forEach( channel =>{
            output += "#EXTM3U\n";
            output += '#EXTINF:-1 tvg-id="" tvg-name="' + channel.name + '" tvg-logo="' + channel.logo + '" tvg-url="",' + channel.name + '\n';
            output += this.getChannelLink(listName, channel.url) + "\n";
        });
        return output;
    } 
    
    changeTimeZone(date, timeZone) {
        var d = new Date(date);
        var offset = d.getTimezoneOffset() * 60000;
        return new Date(d - offset).toLocaleString("es-ES");
      }

    getHTMLList(listName) {
        var url = Object.keys(this.getList(listName).sources)[0];
        var lastUpdateTime = this.getList(listName).sources[url].lastUpdateEpoch;
        var updateMinutes = this.getList(listName).sources[url].updateTime;
        var output = "";
        output += "<!DOCTYPE html>";
        output += "<html>";
        output += "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0\">";
        output += "<title>" + listName.toUpperCase() + "</title>";
        output += "<meta name=-viewport\" content=\"width=device-width, initial-scale=1\">";
        output += "<link rel=\"stylesheet\" href=\"https://www.w3schools.com/w3css/4/w3.css\">";
        output += "<head>";
        output += "    <style>";
        output += "        .label {";
        output += "            color: white;";
        output += "            padding: 8px;";
        output += "            font-family: Arial;";
        output += "            border-radius: 5px;";
        output += "        }";
        output += "        /* Green */";
        output += "        .ok {";
        output += "            background-color: #04AA6D;";
        output += "        }";
        output += "        /* Red */";
        output += "        .ko {";
        output += "            background-color: #f44336;";
        output += "        }";
        output += "    </style>";
        output += "<link rel=\"apple-touch-icon\" sizes=\"180x180\" href=\"/apple-touch-icon.png\">";
        output += "<link rel=\"icon\" type=\"image/png\" sizes=\"32x32\" href=\"/favicon-32x32.png\">";
        output += "<link rel=\"icon\" type=\"image/png\" sizes=\"16x16\" href=\"/favicon-16x16.png\">";
        output += "<link rel=\"manifest\" href=\"/site.webmanifest\">";
        output += "<link rel=\"mask-icon\" href=\"/safari-pinned-tab.svg\" color=\"#5bbad5\">";
        output += "<meta name=\"msapplication-TileColor\" content=\"#da532c\">";
        output += "<meta name=\"theme-color\" content=\"#ffffff\">";        
        output += "</head>";
        output += "<body>";
        output += "    <div class=\"w3-container\">";
        output += "        <h2>" + listName.toUpperCase() + " LIST</h2>";
        output += "        <p>" + this.getChannels(listName).length + " channels</p>";
        output += "        <p id=\"updateMinutes\" hidden>" + updateMinutes + "</p>";
        output += "        <p id=\"timestamp\" hidden>" + lastUpdateTime + "</p>";
        output += "        <span id=\"updateLabel\" class=\"label\"></span>";
        output += "        <p></p>";
        output += "        <ul class=\"w3-ul w3-card-4 w3-hoverable\">";
        
        this.getChannels(listName).forEach( channel =>{
            if (!channel.name.startsWith("Update:")){
                var url = "vlc://" + this.getChannelLink(listName, channel.url);
                output += "<li class=\"w3-bar\" onclick=\"location.href='"+ url +"';\">";
                output += "    <img src=\"" + channel.logo + "\" class=\"w3-bar-item\" style=\"width:85px\">";
                output += "    <div class=\"w3-bar-item\">";
                output += "    <span class=\"w3-large\">"+ channel.name + "</span><br>";
                output += "    </div>";
                output += "</li>";
            }
        });        
        
        output += "</ul>";
        output += "    </div>";
        output += "    <script>";
        output += "        var now = new Date();";
        output += "        var updateDate = new Date(0); updateDate.setUTCSeconds(document.getElementById(\"timestamp\").innerHTML);";
        output += "        var minutesAgo = Math.floor(new Date(now - updateDate).getTime() / 60000);";
        output += "        var updateMinutes = document.getElementById(\"updateMinutes\").innerHTML;";
        output += "        if (minutesAgo > updateMinutes) {";
        output += "            document.getElementById(\"updateLabel\").innerHTML = \"Outdated (\" + minutesAgo + \" minutes ago)\";";
        output += "            document.getElementById(\"updateLabel\").classList = \"label ko\";";
        output += "        }";
        output += "        else {";
        output += "            document.getElementById(\"updateLabel\").innerHTML = \"Updated (\" + minutesAgo + \" minutes ago)\";";
        output += "            document.getElementById(\"updateLabel\").classList = \"label ok\";";
        output += "        }";
        output += "    </script>";
        output += "</body>";
        output += "</html>";

        return output;
    }

    getOriginal(listName) {
        var url = Object.keys(this.getList(listName).sources)[0];
        var baseUrl = url.substring(0, url.lastIndexOf("/"));
        var output = new Array();
        var result = { "buffer": "" };
        var res = request('GET', url);
        var baseUrl = url.substring(0, url.lastIndexOf("/"));
        res = res.getBody("UTF8").replace(/acestream:\/\//g, "vlc://http://" + this.getList(listName).setup.acestreamHost + ":" + this.getList(listName).setup.acestreamPort + "/ace/getstream?id=");
        return res.replace(/src=\"\/srv\/imgs/g, "src=\"" + baseUrl + "/srv/imgs");//"src=\"" + url);
    }
}
