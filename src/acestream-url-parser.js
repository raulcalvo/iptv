'use strict';
var request = require('sync-request');
const jsdom = require("jsdom");
const { JSDOM } = jsdom;


function textNodesUnder(node){
    var all = "";
    for (node=node.firstChild;node;node=node.nextSibling){
        if (typeof node.innerHTML === 'undefined')
            all += "";
        else if (node.innerHTML[0] != "<"){
            all += node.innerHTML;
        } 
        else {
            all += textNodesUnder(node);
        }
    }
    return all;
  }

function getFlagLang(flagURL){
    return flagURL.substring(flagURL.length - 6, flagURL.length-4).toUpperCase();
}

function getImageUrl(url, imageURL){
    if (imageURL.startsWith("http")){
        return imageURL;
    }
    var baseURL = url.substring( 0, url.lastIndexOf("/"));
    return baseURL + imageURL;
}

module.exports = function parse(url, includeM3u8) {
    var output = new Array();
    try {
        var result = { "buffer": "" };
        var res = request('GET', url);
        const dom = new JSDOM(res.getBody("UTF8"));
        dom.window.document.querySelectorAll("caption").forEach(captionNode => {
            captionNode.parentNode.querySelectorAll("tbody").forEach(tableNode => {
                tableNode.querySelectorAll("tr").forEach(trNode => {
                    var isAcestreamRow = false;
                    if (trNode.children.length == 4){
                        trNode.children[0].querySelectorAll("a[href^=https]").forEach(n => {
                            isAcestreamRow = true;
                        });
                        if (isAcestreamRow){
                            var channelLogo = "";
                            trNode.children[0].querySelectorAll("img").forEach(logoNode => {
                                channelLogo = getImageUrl(url,logoNode.src);
                            });

                            var quality = "";
                            trNode.children[1].querySelectorAll("img").forEach(qualityImageNode => {
                                quality = "[" + qualityImageNode.alt + "]";
                            });
        
                            var channelName = "";
                            var channelUrl = "";
                            trNode.children[2].querySelectorAll("a").forEach(channelNode => {
                                channelName = textNodesUnder(channelNode).split("&nbsp;").join("");
                                channelUrl = channelNode.href;
                            });
        
                            var channelLang = "";
                            trNode.children[3].querySelectorAll("img").forEach(flagNode => {
                                channelLang = "[" + getFlagLang(flagNode.src) + "]";
                            });
                            if (channelLang == ""){
                                channelLang = textNodesUnder(trNode.children[3]);
                            }
        
                            if ((channelLogo != "") && (quality != "") && (channelName != "") && (channelUrl != "")){
                                output.push({
                                    "name": quality + channelLang + " " + channelName,
                                    "url": channelUrl,
                                    "logo" : channelLogo 
                                });                            
                            }
                        }
                    }
                });
    
            });
        });
        if (includeM3u8) {
            dom.window.document.querySelectorAll('a[href*=".m3u8"]').forEach(aNode => {
                output.push({
                    "name": getChannelName(aNode),
                    "url": aNode.href
                });
            });
        }
    } catch (error) {
        console.error('ERROR:');
        console.error(error);
    }
    return output;
}
