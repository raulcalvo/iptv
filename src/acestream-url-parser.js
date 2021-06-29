'use strict';
var request = require('sync-request');

function findNextTagValue(param, tag) {
    param.currentPos = param.buffer.indexOf(tag, ++param.currentPos);
    if (param.currentPos == -1)
        return false;
    param.currentPos = param.buffer.indexOf('"', ++param.currentPos);
    if (param.currentPos == -1)
        return false;
    var beginPos = param.currentPos + 1;
    param.currentPos = param.buffer.indexOf('"', ++param.currentPos);
    if (param.currentPos == -1)
        return false;
    param.tagValue = param.buffer.substr(beginPos, param.currentPos - beginPos);
    return true;
}

function isM3u8(href){
    return href.indexOf("http") == 0 && href.indexOf(".m3u8") != -1;
}

function isAcestream(href){
    return href.indexOf("acestream://") == 0 && href != "acestream://";
}


module.exports = function parse(url, includeM3u8) {
    var output = new Array();
    try {
        var result = { "buffer": "" };
        var res = request('GET', url);
        result.buffer = res.getBody("UTF8");
        while (findNextTagValue(result, 'href="')) {
            const url = result.tagValue;
            var ok = false;
            if (isAcestream(url))
                ok = true;
            else if (isM3u8(url) && includeM3u8)
                ok = true;

            if (!ok)
                continue

            var name = findNextTagValue(result, 'alt="') ? result.tagValue : "NO-NAME";
            if (name == "")
            name ="NO-NAME";
            // const pictureUrl = findNextTagValue(result,'src="') ? result.tagValue : "";
            output.push({ 
                "name" : name,
                "url" : url
            });
        }
    } catch (error) {
        console.error('ERROR:');
        console.error(error);
    }
    return output;
}
