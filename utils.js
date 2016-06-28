const MetaInspector = require('node-metainspector');
const ineed = require ("ineed");

export default class utils {

    getImage (item) {

        return new Promise((resolve, reject) => {

            if (item.image) {
                resolve(item.image)
            }

            if (item.enclosures && item.enclosures.length > 0) {
                resolve(item.enclosures[0].url)
            }

            if (item.link) {
                let client = new MetaInspector(item.link, {timeout: 10000});

                client.on("fetch", function () {
                    resolve(client.image);

                });
                client.on("error", function (err) {
                    console.log("Error from Metainspector");
                    console.log("item:" + item.link);
                    reject(err)
                });

                client.fetch();
            }


            if (item.description) {
                resolve(ineed.collect.images.fromHtml(item.description).images[0]);
            }

        })
    }

}
