const fetch = require("make-fetch-happen");

module.exports = class CSVConverter {
    async convert(url) {
        let result;
        let blob;
        try {
            process.stdout.write("Fetching the PNG from DSBmobile... ");
            const res = await fetch(url);
            blob = await res.blob();
            console.log("Done");
        } catch (e) {
            console.error(e);
            return "ERR: Couldn't fetch the PNG."
        }
        try {
            process.stdout.write("Calling the extract-table api... ");
            result = await fetch("https://api.extract-table.com", {
                method: "POST",
                headers: {
                    "Content-Type": blob.type
                },
                body: blob
            });
            console.log("Done");
        } catch (e) {
            console.error(e);
            return "ERR: While calling the extract-table api."
        }
        return result.json();
    }
}