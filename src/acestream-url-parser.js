'use strict';
var request = require('sync-request');
const jsdom = require("jsdom");
const { JSDOM } = jsdom;

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

function getElementGreenComponent(node){
    try {
        return node.style.color.match(/^rgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/i)[2];
    } catch (e){
        return 0;
    }
}

function greenElement(node){
    return getElementGreenComponent(node) == 255;
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


module.exports = function parse(url) {
    var unknownChannelNumber = 0;
    var output = new Array();
    try {
        var result = { "buffer": "" };
        var res = request('GET', url);
        const dom = new JSDOM(res.getBody("UTF8"));
        dom.window.document.querySelectorAll('a[href^="acestream://" i]').forEach(aceNode => {
            try{
                if (aceNode.href.toUpperCase() == "ACESTREAM://")
                    return;
                
                if (!greenElement(aceNode.firstElementChild))
                    return;

                var obj = parseAcestreamLink(aceNode);

                if (obj.name == "")
                    obj.name = "CHANNEL " + unknownChannelNumber++;

                output.push(obj);

            } catch (e){
                return;
            }
        });
    } catch (error) {
        console.error('ERROR:');
        console.error(error);
    }
    var tmp = uniqArray(output)
    return tmp;
}
