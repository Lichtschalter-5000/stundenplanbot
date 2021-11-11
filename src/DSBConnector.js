const fetch = require("make-fetch-happen");
const Credentials = require("../Credentials")

let instance, currentId, url, refreshingPromise;
module.exports = class DSBConnector {

    constructor() {
        this.refresh().catch(console.error);
    }

    static getInstance() {
        if (!instance) {
            instance = new this();
        }
        return instance;
    }

    async getScheduleURL() {
        return url?Promise.resolve(url):this.refresh().then(() => {return url;}).catch(console.error);
    }


    async refresh() {
        if(!refreshingPromise) {
            refreshingPromise = fetch("https://mobileapi.dsbcontrol.de/dsbdocuments?authid=" + Credentials.DSB_AUTH_TOKEN)
            .then((res) => {
                return res.json().then((result) => {
                    // console.log(result);
                    if (result && result.length) {
                        for (let object of result) {
                            if (object["Title"].match(/VT/)) {
                                /* No point in using the Date if we can also use the ID.
                                 * const d = object["Date"].match(/^(\d{2}).(\d{2}).(\d{4})\s(\d{2}):(\d{2})$/);
                                 * const date = new Date(d[3], parseInt(d[2]) - 1, d[1], d[5], d[6]);
                                 * if(lastDate instanceof Date && lastDate < date) {}
                                 */
                                if (!currentId || currentId !== object["Id"]) {
                                    currentId = object["Id"];
                                    url = object["Childs"][0]["Detail"];
                                    return true;
                                } else {
                                    return false;
                                }
                            }
                        }
                    }
                    return url = undefined;
                });
            }).finally(()=>{refreshingPromise = undefined;});
        }
        return refreshingPromise;
    }
}
