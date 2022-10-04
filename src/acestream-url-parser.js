'use strict';
var request = require('sync-request');
const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const M3U8FileParser = require('m3u8-file-parser');

var unknownChannelNumber = 0;

function getQualityFromImage(imageURL){
    if (imageURL.indexOf("1080") != -1){
        return "1080";
    }
    if (imageURL.indexOf("720") != -1){
        return "720";
    }
    if (imageURL.indexOf("480") != -1){
        return "480";
    }
    return "";

}

function queryAncestor(node, elementType, maxDepth){
    if (maxDepth == 0)
        return null;
    var valid = node.outerHTML.startsWith("<"+elementType);
    return valid ? node : queryAncestor(node.parentNode, elementType, maxDepth - 1);
}

function uniqArray(a) {
    var seen = {};
    var out = [];
    var len = a.length;
    var j = 0;
    for(var i = 0; i < len; i++) {
         var item = a[i].url;
         if(seen[item] !== 1) {
               seen[item] = 1;
               out[j++] = a[i];
         }
    }
    return out;
}

function parseAcestreamLink(aceNode){
    // obtain name
    var name = "";
    try{
        name = aceNode.querySelector("img").alt;
    } catch (e){
        console.log("Cannot find channel name");
    }

    var qual = "";
    var logo = "";
    try{
        logo = aceNode.querySelector("img").src;
    } catch (e){
        console.log("Cannot find channel logo");
    }

    return {
        "name": name != "" ? qual + " " + name : "",
        "url": aceNode.href,
        "logo" : logo 
    }
}

function parseM3u8(buffer){
    const reader = new M3U8FileParser();
    reader.read(buffer);
    var output = new Array();
    var result = reader.getResult();
    result.segments.forEach(function(segment) {
        if (segment.url.indexOf("acestream") == 0){
            output.push({
                "name": segment.inf.title,
                "url": segment.url,
                "logo": segment.inf.tvgLogo
            });
        }
    });
  return output;
}

function parseHtml(inputBuffer){
    var unknownChannelNumber = 0;
    var output = new Array();
    try {
        const dom = new JSDOM(inputBuffer);
        dom.window.document.querySelectorAll('a[href^="acestream://" i]').forEach(aceNode => {
            try{
                if (aceNode.href.toUpperCase() == "ACESTREAM://")
                    return;

                var obj = parseAcestreamLink(aceNode);

                if (obj.name == "")
                    obj.name = "CHANNEL " + unknownChannelNumber++;

                if (obj.logo == "" || !obj.logo.startsWith("http")){
                    obj.logo = url.substring(0, url.lastIndexOf("/") + 1) + obj.logo;
                }
                output.push(obj);

            } catch (e){
                return;
            }
        });
    } catch (error) {
        console.error('ERROR:');
        console.error(error);
    }
    return uniqArray(output);
}


module.exports = function parse(url, isM3u8) {
    var unknownChannelNumber = 0;
    var output = new Array();
    try {
        var buffer = request('GET', url).getBody("UTF8");

        if (buffer.indexOf("#EXTM3U")==0)
            return parseM3u8(buffer);
        else
            return parseHtml(buffer);
    } catch (error) {
        console.error('ERROR:');
        console.error(error);
    }
    return output;
}
