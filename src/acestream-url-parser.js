'use strict';
var request = require('sync-request');
const jsdom = require("jsdom");
const { JSDOM } = jsdom;

function getChannelName(aNode) {
    var name = "NO-NAME";
    if (aNode.childNodes.length == 1) {
        name = aNode.childNodes[0].alt;
    }
    return name;
}

module.exports = function parse(url, includeM3u8) {
    var output = new Array();
    try {
        var result = { "buffer": "" };
        var res = request('GET', url);
        const dom = new JSDOM(res.getBody("UTF8"));
        dom.window.document.querySelectorAll("a[href^=acestream]").forEach(aNode => {
            if (aNode.href != "acestream://") {
                output.push({
                    "name": getChannelName(aNode),
                    "url": aNode.href
                });
            }
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
