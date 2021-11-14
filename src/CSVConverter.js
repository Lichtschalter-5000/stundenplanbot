const fetch = require("make-fetch-happen");

module.exports = class CSVConverter {
    static async convert(url) {
        return fetch(url)
            .then(res => res.blob())
            .then(blob => fetch("https://api.extract-table.com", {
                    method: "POST",
                    headers: {
                        "Content-Type": blob.type
                    },
                    body: blob
                }
            )).then(result => result.json());
    }
}