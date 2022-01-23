const fetch = require("make-fetch-happen");
const cache = require("./Cache");

module.exports = class CSVConverter {
    static async convert(url) {
        return cache.has(cache.types.SCHEDULE, url).then(has => {
            if (has) {
                return cache.retrieve(cache.types.SCHEDULE, url);
            } else {
                return fetch(url)
                    .then(res => res.blob())
                    .then(blob => fetch("https://api.extract-table.com", {
                        method: "POST",
                        headers: {
                            "Content-Type": blob.type
                        },
                        body: blob
                    }))
                    .then(result => result.json())
                    .then(json =>
                        cache.put(cache.types.SCHEDULE, url, json)
                            .then(() => Promise.resolve(json))
                    );
            }
        });
    }
}