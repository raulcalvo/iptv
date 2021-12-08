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

function parse3Column(node){
    // obtain name
    var name = "";
    try{
        var n = queryAncestor(node,"tr", 5);
        while (n){
            if (n.childElementCount==1){
                var imgs = n.querySelectorAll("img");
                if (imgs.length == 1){
                    name = imgs[0].alt;
                    break;
                }
            }
            n = n.previousElementSibling;
        }
    } catch (e){
        console.log("Cannot find channel name");
    }

    var qual = "";
    try{
        var alt = queryAncestor(node, "td", 5).previousElementSibling.querySelector("img").alt;
        if (alt != "todo"){
            qual = "["+ queryAncestor(node, "td", 5).previousElementSibling.querySelector("img").alt +"]";
        }
    } catch (e){
        console.log("Cannot find channel name");
    }

    var lang = "";
    try{
        if (queryAncestor(node, "td", 5).nextElementSibling.querySelector("img").alt.startsWith("Bandera") )
            lang = "[" + getFlagLang(queryAncestor(node, "td", 5).nextElementSibling.querySelector("img").src)+ "]";
    } catch (e){
        console.log("Cannot find channel name");
    }

    var logo = "";
    try{
        logo = queryAncestor(node, "td", 5).nextElementSibling.querySelector("img").src;
    } catch (e){
        console.log("Cannot find channel name");
    }

    return {
        "name": qual + lang + " " + name,
        "url": node.href,
        "logo" : logo 
    }
    
}


function parse4Column(aNode){
    // obtain name
    var name = "";
    try{
        // name = textNodesUnder(queryAncestor(aNode,"td",5).previousElementSibling).split("&nbsp;").join("");
        name = textNodesUnder(queryAncestor(aNode,"td",5)).split("&nbsp;").join("");;
    } catch (e){
        console.log("Cannot find channel name");
    }

    var qual = "";
    try{
        qual = "["+ getQualityFromImage(queryAncestor(aNode,"td",5).previousElementSibling.querySelector("img").src)+"]";
    } catch (e){
        console.log("Cannot find channel name");
    }

    var lang = "";
    try{
        lang = "[" + getFlagLang(queryAncestor(aNode,"td",5).nextElementSibling.querySelector("img").src)+ "]";
    } catch (e){
        console.log("Cannot find channel name");
    }

    var logo = "";
    try{
        logo = queryAncestor(aNode,"td",5).nextElementSibling.querySelector("img").src;
    } catch (e){
        console.log("Cannot find channel name");
    }

    return {
        "name": qual + lang + " " + name,
        "url": aNode.href,
        "logo" : logo 
    }
    
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

function is3Column(aNode){
    try{
        if (!greenElement(aNode.firstElementChild))
            return false;
        if (queryAncestor(aNode,"tr",5).childElementCount != 3)
            return false;
        return true;
    } catch (e){
        return false;
    }
}

function is4Column(aNode){
    try{
        if ( queryAncestor(aNode,"tr",5).childElementCount != 4 )
            return false;
        if ( queryAncestor(aNode,"td",5).nextElementSibling.nextElementSibling != null )
            return false;
        if ( queryAncestor(aNode,"td",5).previousElementSibling.previousElementSibling.previousElementSibling != null )
            return false;
        if (!greenElement(queryAncestor(aNode,"td",5).previousElementSibling.querySelector("img")))
            return false;
        return true;
    } catch (e){
        return false;
    }
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


function parsePage(url) {
    var output = new Array();
    try {
        var result = { "buffer": "" };
        var res = request('GET', url);
        const dom = new JSDOM(res.getBody("UTF8"));
        dom.window.document.querySelectorAll('a[href^="acestream://" i]').forEach(aceNode => {
            try{
                if (aceNode.href.toUpperCase == "ACESTREAM://")
                    return;

                if ( is3Column(aceNode)){
                    output.push(parse3Column(aceNode));
                }
                else if (is4Column(aceNode)){
                    output.push(parse4Column(aceNode));
                }

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


module.exports = function parse(url) {
    var output = new Array();
    try {
        var result = { "buffer": "" };
        var res = request('GET', url);
        const dom = new JSDOM(res.getBody("UTF8"));
        dom.window.document.querySelectorAll('a[href^="https://" i]').forEach(aceNode => {
            try{
                var match = aceNode.href.match()
                if (!aceNode.href.startsWith(url))
                    return;
                var suffix = aceNode.href.substring(url.length);
                if (suffix.match(/^[a-z0-9]+$/i) != null)
                    output = output.concat(parsePage(aceNode.href));
            } catch (e){
                return;
            }
        });
    } catch (error) {
        console.error('ERROR:');
        console.error(error);
    }
    return output;
}
