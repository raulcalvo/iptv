'use strict';
const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const M3U8FileParser = require('m3u8-file-parser');

const Downloader = require("./downloader.js");
var downloader = new Downloader();

//const fs = require("fs");

function queryAncestor(node, elementType, maxDepth){
    if (maxDepth == 0)
        return null;
    var valid = node.outerHTML.startsWith("<"+elementType);
    return valid ? node : queryAncestor(node.parentNode, elementType, maxDepth - 1);
}

function getAcestreamLinkInAttributes(node){
    var aceUriRegex = /acestream:\/\/[0-9a-z]{40}/;
    
    for(let attrib of node.attributes){
        var m = attrib.value.match(aceUriRegex);
        if (m){
            return m[0].substring(12);
        }
    }
    if (node.innerHTML && node.innerHTML.indexOf("<") == -1){
        var aceRegex = /[0-9a-z]{40}/;
        var m = node.innerHTML.match(aceRegex);
        if (m){
                return m[0];
        }
    }

    return "";
}

function isChannelName(input){
    var seeds = [
        "movistar",
        "liga",
        "m. ",
        "m.l.",
        "dazn",
        "eurosport",
        "espn",
        "sport",
        "sports",
        "football",
        "futbol",
        "premier",
        "soccer",
        "pimple",
        "f1",
        "fox",
        "bemad",
        "ufc",
        "nfl",
        "nba",
        "formula",
        "vamos",
        "smartbank",
        "barça",
        "deporte",
        "# ",
        "gol",
        "goal",
        "campeones",
        "champion",
        "cuatro",
        "t5",
        "telecinco",
        "setanta",
        "la 1",
        "rtve",
        "sexta",
        "antena",
        "live",
        "national",
        "canal",
        "league",
        "gp",
        "moto",
        "car",
        "basket",
        "tenis",
        "arena",
        "ace 1",
        "ace 2",
        "ligue"
    ];
    
    
    var aceRegex = /[0-9a-z]{40}/
    for(var index = 0 ; index < seeds.length; ++index){
        if ( (input.toUpperCase().indexOf(seeds[index].toUpperCase()) != -1) && !aceRegex.test(input))
            return true;
    };
    return false;
}

function getAcestreamLinkName(preOrderArray, nodeIndex, positionChannelName){
    // obtain name
    try{
        return preOrderArray[nodeIndex].querySelector("img").alt;
    } catch (e){
        // Cannot find channel name in alt of image
    }

    var inc = positionChannelName == "after" ? 1 : -1;
    var index = Math.max(Math.min(nodeIndex + inc,preOrderArray.length-1),0);
    var maxDist = 10;

    var channelName = preOrderArray[nodeIndex].innerHTML.replace(/<\/?[^>]+(>|$)/g, "").replace(/&[a-z]*;/gi, '').replace(/[0-9a-z]{40}/, '');

    if (isChannelName(channelName) )
            return channelName;
    
    while (Math.abs(inc)<maxDist){
        if (preOrderArray[index].innerHTML){
            channelName = preOrderArray[index].innerHTML.replace(/<\/?[^>]+(>|$)/g, "").replace(/&[a-z]*;/gi, '').replace(/[0-9a-z]{40}/, '');
            if ( (!preOrderArray[index].firstElementChild) && 
                (isChannelName(channelName)) )
                return channelName;
        }
        if (positionChannelName == "after"){
            if (inc < 0)
                --inc;
        } else if (positionChannelName == "before") {
            if (inc > 0)
                ++inc;
        }
        inc = -inc;
        // check bounds
        index = Math.max(Math.min(nodeIndex + inc,preOrderArray.length-1),0);
    }
    return "";
}

function getAcestreamLinkLogo(node, preOrder, nodeIndex){
    try{
        return preOrderArray[nodeIndex].querySelector("img").src;
    } catch (e){
        // Cannot find channel logo
    }
    return "";
}

function parseHtml(buffer, source){
    source.positionChannelName = "before";
    var output = new Array();
    var aceRegex = /[0-9a-z]{40}/
    try {
        const dom = new JSDOM(buffer);
        var nodes = dom.window.document.body.getElementsByTagName("*");

        if (dom.window.document.body.innerHTML.indexOf("#EXTM3U") == 0){
            return parseM3u8(dom.window.document.body.innerHTML);
        }

        for(let nodeIndex = 0; nodeIndex < nodes.length; ++nodeIndex){
            if (nodes[nodeIndex].innerHTML.indexOf("#EXTM3U") == 0){
                return parseM3u8(nodes[nodeIndex].innerHTML);
            }
        }

        
        for(let nodeIndex = 0; nodeIndex < nodes.length; ++nodeIndex){
            var acestreamLink = getAcestreamLinkInAttributes(nodes[nodeIndex]);
            if (acestreamLink != ""){
                var channelName = getAcestreamLinkName(nodes, nodeIndex, source.positionChannelName);
                if (channelName.length != ""){
                    output.push({
                        "name": channelName,
                        "url": "acestream://" + acestreamLink,
                        "logo": getAcestreamLinkLogo(nodes, nodeIndex)
                    });
                }
            }        
        }      
    } catch (error) {
        console.error('ERROR:');
        console.error(error);
    }
    return output;
}

function parseM3u8(buffer){
    const reader = new M3U8FileParser();
    reader.read(buffer);
    var output = new Array();
    var result = reader.getResult();
    var aceRegex = /[0-9a-z]{40}/;
    result.segments.forEach(function(segment) {
        var m = segment.url.match(aceRegex);
        if (m){
            output.push({
                "name": segment.inf.title,
                "url": "acestream://" + m[0],
                "logo": segment.inf.tvgLogo
            });
        }
    });
    return output;
}


module.exports = function parse(source) {
    return downloader.download(source.url).then( buffer => {
        if (buffer.indexOf("#EXTM3U")==0)
            return parseM3u8(buffer);
        else
            return parseHtml(buffer, source);
    }).catch( error => {
        return error;
    });
}