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

module.exports = function parse(url) {
    var output = new Array();
    try {
        var result = { "buffer": "" };
        var res = request('GET', url);
        result.buffer = res.getBody("UTF8");
        while (findNextTagValue(result, 'href="acestream://')) {
            const url = result.tagValue;
            if (url == "acestream://")
                continue;
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
