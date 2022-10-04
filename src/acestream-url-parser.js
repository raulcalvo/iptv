'use strict';
var request = require('sync-request');
const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const M3U8FileParser = require('m3u8-file-parser');
const { webkit } = require('playwright');


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

function getAcestreamLinkInAttributes(node){
    var aceRegex = /[0-9a-z]{40}/;
    for(let attrib of node.attributes){
        var m = attrib.value.match(aceRegex);
        if (m){
            return m[0];
        }
    }
    if (node.innerHTML && node.innerHTML.indexOf("<") == -1){
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
        console.log("Cannot find channel name in alt of image");
    }

    var inc = positionChannelName == "after" ? 1 : -1;
    var index = nodeIndex + inc;
    var maxDist = 10;
    while (Math.abs(inc)<maxDist){
        if ( (!preOrderArray[index].firstElementChild) && (isChannelName(preOrderArray[index].innerHTML)) )
            return preOrderArray[index].innerHTML;
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
        console.log("Cannot find channel logo");
    }
    return "";
}

async function parseHtml(buffer, source){
    source.positionChannelName = "before";
    var output = new Array();
    var aceRegex = /[0-9a-z]{40}/
    try {
        const dom = new JSDOM(buffer);
        var nodes = dom.window.document.getElementsByTagName("*");
        for(let nodeIndex = 0; nodeIndex < nodes.length; ++nodeIndex){
            var eleme =nodes[nodeIndex]; 
            if (nodes[nodeIndex].firstElementChild)
                continue;
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
    return uniqArray(output);
}

async function asyncDownload(url){
    var result = "";
    const browser = await webkit.launch();
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(url, { waitUntil: 'networkidle' });
    var content = await page.content();
    var pre = await page.innerHTML("pre");
    if (pre.indexOf("#EXTM3U")==0)
        result = pre;
    else 
        result = content;
    await browser.close();

    return result;
}

module.exports = async function parse(source) {
    var output = new Array();
    try {
        var buffer = await asyncDownload(source.url);

        if (buffer.indexOf("#EXTM3U")==0)
            return parseM3u8(buffer);
        else
            return parseHtml(buffer, source);
    } catch (error) {
        console.error('ERROR:');
        console.error(error);
    }
    return output;
}