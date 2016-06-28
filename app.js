'use strict';

/**
 * Module dependencies.
 */

const
    Promise = require('bluebird'),
    request = require('request'),
    FeedParser = require('feedparser'),
    CronJob = require('cron').CronJob,
    mongoose = require('mongoose'),
    Schema = mongoose.Schema;


mongoose.connect('mongodb://127.0.0.1:27017/test');

const feedSchema = new Schema({
    _id: String
},{ strict: false });

const Feed = mongoose.model('Feed',feedSchema);



const fetch = (url) => {
    return new Promise((resolve, reject) => {
        if (!url) {
            return reject(new Error(`Bad URL (url: ${url}`));
        }

        const
            feedparser = new FeedParser(),
            items = [];

        feedparser.on('error', (e) => {
            return reject(e);
        }).on('readable', () => {
            // This is where the action is!
            var item;

            while (item = feedparser.read()) {
                items.push(item)
            }
        }).on('end', () => {
            resolve({
                meta: feedparser.meta,
                records: items
            });
        });

        request({
            method: 'GET',
            url: url
        }, (e, res, body) => {
            if (e) {
                return reject(e);
            }

            if (res.statusCode != 200) {
                return reject(new Error(`Bad status code (status: ${res.statusCode}, url: ${url})`));
            }

            feedparser.end(body);
        });
    });
};


Promise.map([
        'http://feeds.feedburner.com/ArchDaily',
        'http://feeds.feedburner.com/dezeen',
        'http://www.designboom.com/weblog/rss.php'
    ], (url) => fetch(url), {concurrency: 2})
    .then((feeds) => {
        const bulk = Feed.collection.initializeUnorderedBulkOp();

        feeds.forEach(feed => {

            feed.records.forEach(item => {
                item._id = item.guid;
                delete item.guid;
                bulk.find({ _id: item._id }).upsert().updateOne({ "$set": item });
            })


        })
        bulk.execute(function(err,response) {
            // Shouldn't be one as errors should be in the response
            // but just in case there was a problem connecting the op
            if (err) throw err;

            // Just dumping the response for demo purposes
            console.log( JSON.stringify( response, undefined, 4 ) );

        });
    });
