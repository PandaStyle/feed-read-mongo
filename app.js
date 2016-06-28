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

    utils = require('./utils.js')


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
      return reject(e);
    }).on('readable', () => {
      // This is where the action is!
      var item;

      while (item = feedparser.read()) {
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

const createFeedItem = item => {

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

      feedItem.image = image;

      feedItem.meta = {
        link: item.meta.link,
        description: item.meta.description
      }

      resolve(feedItem);
    })
  })
}


const flatfeed = () => {

}

Promise.map([
  'http://feeds.feedburner.com/ArchDaily',
  'http://feeds.feedburner.com/dezeen',
  'http://www.designboom.com/weblog/rss.php'
], (url) => fetch(url), {concurrency: 2})
.then((feeds) => {
  const bulk = Feed.collection.initializeUnorderedBulkOp();


  var flattened = [].concat.apply([],feeds);
  console.log(flattened[0]);
  console.log(flattened.length);


  return Promise.map(flattened, item => createFeedItem(item))
.then( res => {
  console.log(res);
  console.log(res.length);
  
})    

  



})
/*bulk.execute(function (err, response) {
 // Shouldn't be one as errors should be in the response
 // but just in case there was a problem connecting the op
 if (err) throw err;

 // Just dumping the response for demo purposes
 console.log(JSON.stringify(response, undefined, 4));
 */

