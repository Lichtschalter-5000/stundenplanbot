const fetch = require("make-fetch-happen");

module.exports = class CSVConverter {
    async convert(url) {
        // ToDo Error url==="NOURL"
        const res = await fetch(url);
        const blob = await res.blob();
        const res2 = await fetch("https://api.extract-table.com", {
            method: "POST",
            headers: {
                "Content-Type": blob.type
            },
            body: blob
        });

        return res2.json();
    }
}