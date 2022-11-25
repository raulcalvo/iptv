'use strict';
const jsdom = require("jsdom");
const { JSDOM } = jsdom;

const Downloader = require("./downloader.js");
var downloader = new Downloader();

function queryAncestor(node, elementType, maxDepth){
    if (maxDepth == 0)
        return null;
    var valid = node.outerHTML.startsWith("<"+elementType);
    return valid ? node : queryAncestor(node.parentNode, elementType, maxDepth - 1);
}

function padTo2Digits(num) {
    return num.toString().padStart(2, '0');
  }
  
function formatDate(date,separator) {
  return [
    padTo2Digits(date.getDate()),
    padTo2Digits(date.getMonth() + 1),
    date.getFullYear(),
  ].join(separator);
}

module.exports = function parseEvents(eoi_url) {
    console.log("Parsing events-url: " + eoi_url);
    return downloader.download(eoi_url).then( buffer => {
        var out = new Array();
        const dom = new JSDOM(buffer);
        // let currentDateTime = new Date().toLocaleString("es-ES", { timeZone: "Europe/Madrid" });
        let currentDateTime = new Date();

        var currentDate = formatDate(currentDateTime, "/");
        var cabeceraTablaNodes = Array.from(dom.window.document.body.getElementsByClassName('cabeceraTabla'));
        console.log("Found " + cabeceraTablaNodes.length + "cabeceratablanodes");
        cabeceraTablaNodes.forEach((cabeceraTabla) => {
                console.log("Current data: " + currentDate);
                if (cabeceraTabla.textContent.indexOf(currentDate) != -1){    // today's table
                    var tbody = queryAncestor(cabeceraTabla, "tbody", 2);
                    if (tbody){
                        console.log("Found tbody");
                        var listaCanales = Array.from(tbody.getElementsByClassName("listaCanales"));
                        console.log("Found " + listaCanales.length + " canales in listaCanales");
                        if (listaCanales.length > 0){
                            var canales = Array.from(listaCanales[0].getElementsByTagName("li"));
                            console.log("Found " + canales.length + " li nodes");
                            canales.forEach((liNode) => {
                                if (Array.from(liNode.getElementsByTagName("a")).length == 0){
                                    var text = liNode.title.replace(/ *\([^)]*\) */g, "");
                                    console.log("Found channel with name: " + text);
                                    out.push(text);
                                }
                            });
                        }
                    }
                }
            // }
        });
        console.log("TOTAL EVENT CHANNELS FOUND: " + out.length);
        return out;
    }).catch( error => {
        return error;
    });
}