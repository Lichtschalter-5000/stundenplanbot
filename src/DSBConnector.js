// noinspection JSUnresolvedFunction

const fetch = require("make-fetch-happen");
const Credentials = require("../Credentials");
const {log, handleError} = require("./index");

let instance, currentId, url, refreshingPromise;
module.exports = class DSBConnector {

    constructor() {
        this.refresh().catch(e => handleError(e, "DSBConnector"));
    }

    static getInstance() {
        if (!instance) {
            instance = new this();
        }
        return instance;
    }

    async getScheduleURL() {
        return url?Promise.resolve(url):this.refresh().then(() => url);
    }


    async refresh() {
        if(!refreshingPromise) {
            log.verbose("DSBConnector", "Refreshing the URL from DSBmobile.");
            refreshingPromise = fetch("https://mobileapi.dsbcontrol.de/dsbdocuments?authid=" + Credentials.DSB_AUTH_TOKEN)
            .then((res) => {
                return res.json().then((result) => {
                    if (result && result.length) {
                        for (let object of result) {
                            if (object["Title"].match(/VT/)) {
                                 const d = object["Date"].match(/^(\d{2}).(\d{2}).(\d{4})\s(\d{2}):(\d{2})$/);
                                 const date = new Date(d[3], parseInt(d[2]) - 1, d[1], d[5], d[6]);
                                if (!currentId || currentId !== object["Id"]) {
                                    currentId = object["Id"];
                                    url = object["Childs"][0]["Detail"];
                                    log.info("DSBConnector", "Found a new schedule on DSBMobile: %s", url);
                                    return Promise.resolve([true, date]);
                                } else {
                                    return Promise.resolve([false, undefined]);
                                }
                            }
                        }
                    }
                    url = undefined;
                    return Promise.reject("Could not find an URL for the Schedule.");
                });
            }).finally(()=>{refreshingPromise = undefined;});
        } else
            log.debug("DSBConnector", "refreshingPromise is already defined, returning the existing version.");
        return refreshingPromise;
    }
}
