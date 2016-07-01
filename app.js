'use strict';

/**
 * Module dependencies.
 */

const
    _ = require('lodash'),
    Promise = require('bluebird'),
    request = require('request'),
    FeedParser = require('feedparser'),
    CronJob = require('cron').CronJob,
    mongoose = require('mongoose'),
    Schema = mongoose.Schema,

    logger = require('./logger.js'),
    utils = require('./utils.js'),

    feeds = require('./feeds.js')


mongoose.connect('mongodb://127.0.0.1:27017/test');

const feedSchema = new Schema({
    _id: String
}, {strict: false});
const Feed = mongoose.model('Feed', feedSchema);


const fetch = (url) => {
    return new Promise((resolve, reject) => {
        if (!url) {
            return reject(new Error(`Bad URL (url: ${url}`));
        }

        const
            feedparser = new FeedParser(),
            items = [];

        feedparser.on('error', (e) => {
            console.log("ERROR")
            console.error(e)
            return reject(e);
        }).on('readable', () => {
            // This is where the action is!
            var item;

            while (item = feedparser.read()) {
                if(items.length < 5)
                    items.push(item)
            }
        }).on('end', () => {
            resolve(items);
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


const createFeedItem = (item, bulk) => {

    return new Promise(resolve => {
        utils.getImage(item)
            .then(function (image) {
                let feedItem = {};

                feedItem._id = item.guid;
                feedItem.title = item.title;
                feedItem.summary = item.summary;

                feedItem.description = utils.getDescription(item)

                feedItem.link = item.link;
                feedItem.origlink = item.origlink;

                //feedItem.feed = ..

                feedItem.date = item.date;
                feedItem.pubDate = item.pubDate;
                feedItem.pubdate = item.pubdate;

                feedItem.image = image.url;
                feedItem.imageType = image.type;

                feedItem.meta = {
                    link: item.meta.link,
                    description: item.meta.description
                }

                bulk.find({ _id: feedItem._id }).upsert().updateOne({ "$set": feedItem });

                console.log(feedItem._id)

                resolve(feedItem);
            })
    })
}


const crawl = () => {
    Promise.map(feeds.map(item => item.url), (url) => fetch(url))
        .then((feeds) => {

            const bulk = Feed.collection.initializeUnorderedBulkOp();

            //flatten feed
            const flattened = [].concat.apply([], feeds);


            return Promise.map(flattened, item => createFeedItem(item, bulk))
                .then(res => {
                    console.log("Read length: ", res.length)
                    return res;
                })
                .then(() => {
                    bulk.execute((err, result) => {
                        if (err)
                            throw err

                        console.log(JSON.stringify(result, undefined, 4));
                    });
                })

        })
}

crawl();




