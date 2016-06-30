'use strict';

const MetaInspector = require('node-metainspector');
const ineed = require ("ineed");
const _ = require('lodash');

var config = {
    maxBodyLength: 150
}

const getImage = item => {

        return new Promise((resolve, reject) => {

            if (!_.isEmpty(item.image) ) {
                resolve(item.image)

            } else if (item.enclosures && item.enclosures.length > 0) {
                resolve( { url: item.enclosures[0].url, type: 1 })

            } else if (item.link) {

                let client = new MetaInspector(item.link, {timeout: 10000});

                client.on("fetch", function () {

                    if(!_.isEmpty(client.image)){
                        resolve( {url: client.image, type: 2});

                    } else {
                        resolve( {url: ineed.collect.images.fromHtml(item.description).images[0].src, type: 2} );
                        
                    }
                });
                client.on("error", function (err) {
                    console.log("Error from Metainspector");
                    console.log("item:" + item.link);
                    reject(err)
                });

                client.fetch();
            }
        })
}

function getDescription (item) {
    var s = item.description;
    if (s == null) {
        s = "";
    }
    s = stripMarkup (s);
    s = trimWhitespace (s);
    if (s.length > config.maxBodyLength) {
        s = trimWhitespace (maxStringLength (s, config.maxBodyLength));
    }
    return s;
}

function stripMarkup (s) { //5/24/14 by DW
    if ((s === undefined) || (s == null) || (s.length == 0)) {
        return ("");
    }
    return (s.replace (/(<([^>]+)>)/ig, ""));
}
function maxStringLength (s, len, flWholeWordAtEnd, flAddElipses) {
    if ((s === undefined) || (s === null)) {
        return ("");
    }
    else {
        if (flWholeWordAtEnd === undefined) {
            flWholeWordAtEnd = true;
        }
        if (flAddElipses === undefined) { //6/2/14 by DW
            flAddElipses = true;
        }
        if (s.length > len) {
            s = s.substr (0, len);
            if (flWholeWordAtEnd) {
                while (s.length > 0) {
                    if (s [s.length - 1] == " ") {
                        if (flAddElipses) {
                            s += "...";
                        }
                        break;
                    }
                    s = s.substr (0, s.length - 1); //pop last char
                }
            }
        }
        return (s);
    }
}

function trimWhitespace (s) { //rewrite -- 5/30/14 by DW
    function isWhite (ch) {
        switch (ch) {
            case " ": case "\r": case "\n": case "\t":
            return (true);
        }
        return (false);
    }
    if (s === undefined) { //9/10/14 by DW
        return ("");
    }
    while (isWhite (s.charAt (0))) {
        s = s.substr (1);
    }
    while (s.length > 0) {
        if (!isWhite (s.charAt (0))) {
            break;
        }
        s = s.substr (1);
    }
    while (s.length > 0) {
        if (!isWhite (s.charAt (s.length - 1))) {
            break;
        }
        s = s.substr (0, s.length - 1);
    }
    return (s);
}


module.exports = {
    getImage: getImage,
    getDescription: getDescription
}
