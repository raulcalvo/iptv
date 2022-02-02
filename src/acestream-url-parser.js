'use strict';
var request = require('sync-request');
const jsdom = require("jsdom");
const { JSDOM } = jsdom;

var unknownChannelNumber = 0;

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
                if (n.querySelector("a") == null && imgs.length == 1){
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
        console.log("Cannot find channel quality");
    }

    var lang = "";
    try{
        if (queryAncestor(node, "td", 5).nextElementSibling.querySelector("img").alt.startsWith("Bandera") )
            lang = "[" + getFlagLang(queryAncestor(node, "td", 5).nextElementSibling.querySelector("img").src)+ "]";
    } catch (e){
        console.log("Cannot find channel language");
    }

    var logo = "";
    try{
        logo = queryAncestor(node, "td", 5).nextElementSibling.querySelector("img").src;
    } catch (e){
        console.log("Cannot find channel logo");
    }

    return {
        "name": qual + lang + " " + name,
        "url": node.href,
        "logo" : logo 
    }
    
}

function parse3Column2(node){
    // obtain name
    var name = "";
    try{
        name = queryAncestor(node,"tr", 5).firstElementChild.querySelector("img").alt;
    } catch (e){
        console.log("Cannot find channel name");
    }

    var qual = "";
    try{
        if (queryAncestor(node, "td",5).nextElementSibling != null)
            qual = "["+ queryAncestor(node, "tbody", 5).firstElementChild.nextElementSibling.children[1].querySelector("img").alt +"]";
        else
            qual = "["+ queryAncestor(node, "tbody", 5).firstElementChild.nextElementSibling.children[2].querySelector("img").alt +"]";
    } catch (e){
        console.log("Cannot find channel quality");
    }

    var lang = "";
    var logo = "";

    return {
        "name": qual + lang + " " + name,
        "url": node.href,
        "logo" : logo 
    }
    
}


function parse2Column(node){
    // obtain name
    var name = "";
    try{
        var n = queryAncestor(node,"tr", 5);
        while (n){
            if (!n.previousElementSibling){
                var imgs = n.querySelectorAll("img");
                if (n.querySelector("a") == null && imgs.length > 0){
                    name = imgs[0].alt;
                    break;
                }
            } else if (n.previousElementSibling.childElementCount != 1){
                var imgs = n.querySelectorAll("img");
                if (n.querySelector("a") == null && imgs.length > 0){
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
        var td = queryAncestor(node, "td", 5);
        var prev_td = td.previousElementSibling;
        var html = prev_td.innerHTML;
        var img = prev_td.querySelector("img");
        var alt = img.alt;
        // var alt = queryAncestor(node, "td", 5).previousElementSibling.querySelector("img").alt;
        if (alt != "todo"){
            qual = "["+ queryAncestor(node, "td", 5).previousElementSibling.querySelector("img").alt +"]";
        }
    } catch (e){
        console.log("Cannot find channel quality");
    }

    var lang = "";
    var logo = "";

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
        console.log("Cannot find channel quality");
    }

    var lang = "";
    try{
        lang = "[" + getFlagLang(queryAncestor(aNode,"td",5).nextElementSibling.querySelector("img").src)+ "]";
    } catch (e){
        console.log("Cannot find channel language");
    }

    var logo = "";
    try{
        logo = queryAncestor(aNode,"td",5).nextElementSibling.querySelector("img").src;
    } catch (e){
        console.log("Cannot find channel logo");
    }

    return {
        "name": qual + lang + " " + name,
        "url": aNode.href,
        "logo" : logo 
    }
    
}

function parse1Column(node){
    // obtain name
    var name = "";
    try{
        var n = queryAncestor(node,"tr", 5);
        while (n){
            if (n.childElementCount==1){
                var imgs = n.querySelectorAll("img");
                if (n.querySelector("a") == null && imgs.length == 1){
                    name = imgs[0].alt;
                    break;
                }
            }
            n = n.previousElementSibling;
        }
    } catch (e){
        console.log("Cannot find channel name");
    }

    return {
        "name": name,
        "url": node.href,
        "logo" : ""
    }
    
}

function parseRootChannel(node){
    // obtain name
    var name = "";
    try{
        var n = queryAncestor(node,"td", 5);
        var imgs = n.querySelectorAll("img");
        name = imgs[0].alt;
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


function is3Column2(aNode){
    try{
        if (!greenElement(aNode.firstElementChild))
            return false;
        if (queryAncestor(aNode,"tbody",5).firstElementChild.childElementCount != 2)
            return false;
        return true;
    } catch (e){
        return false;
    }
}

function is2Column(aNode){
    try{
        if (!greenElement(aNode.firstElementChild))
            return false;
        if (queryAncestor(aNode,"tr",5).childElementCount != 2)
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

function is1Column(aNode){
    try{
        if ( queryAncestor(aNode,"td",5).parentNode.childElementCount == 1 )
            return true;
        return false;
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

function mustIgnore(aceNode){
    try{
        if (aceNode.querySelector("strong").innerHTML.startsWith("GP ")){
            return true;;
        }
    } catch (e){
        return false;
    }
    return false;
}


function parsePage(url) {
    var output = new Array();
    try {
        var result = { "buffer": "" };
        var res = request('GET', url);
        const dom = new JSDOM(res.getBody("UTF8"));
        dom.window.document.querySelectorAll('a[href^="acestream://" i]').forEach(aceNode => {
            try{
                if (aceNode.href.toUpperCase() == "ACESTREAM://")
                    return;
                
                var obj = {};

                if (!greenElement(aceNode.firstElementChild))
                    return;

                if (mustIgnore(aceNode)){
                    return;
                }

                if ( is2Column(aceNode))
                    obj = parse2Column(aceNode);
                else if ( is3Column2(aceNode))
                    obj = parse3Column2(aceNode);
                else if ( is3Column(aceNode))
                    obj = parse3Column(aceNode);
                else if (is4Column(aceNode))
                    obj = parse4Column(aceNode);
                else if (is1Column(aceNode))
                    obj = parse1Column(aceNode);
                else{
                    obj = {
                        "name": "CHANNEL " + unknownChannelNumber++,
                        "url": aceNode.href,
                        "logo" : ""
                    };
                }

                if (obj.name == " " || obj.name == "")
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

function parseRootPage(url) {
    var output = new Array();
    try {
        var result = { "buffer": "" };
        var res = request('GET', url);
        const dom = new JSDOM(res.getBody("UTF8"));
        dom.window.document.querySelectorAll('a[href^="acestream://" i]').forEach(aceNode => {
            try{
                if (aceNode.href.toUpperCase == "ACESTREAM://")
                    return;
                
                var obj = parseRootChannel(aceNode);
                if (obj.name != "")
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
parseRootChannel

module.exports = function parse(url) {
    unknownChannelNumber = 0;
    var output = parseRootPage(url);
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
