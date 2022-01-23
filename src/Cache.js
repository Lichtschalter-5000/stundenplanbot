// noinspection JSUnresolvedFunction

const fs = require("fs/promises");
const CronJob = require("cron").CronJob;
const {log, handleError, registerAndStartCron} = require("./index");

const types = {
    BLOCK_SCHEDULE: 0,
    SCHEDULE: 1,
}
let typestrings = {};
for (const [key, value] of Object.entries(types)) {
    typestrings[value] = key;
}

module.exports = {
    put: (type, id, content, ttl) => {
        if(!(isNaN(type)?types:typestrings).hasOwnProperty(type))
            return Promise.reject(`"${type}" is not a valid type of stuff to put in cache.`);
        type = !isNaN(type)?typestrings[type.toString()]:type;
        const path = `./cache/${type}/${id.replaceAll(/\W/g, "")}`;
        log.verbose("cache", `writing to ${path}`);
        if(!isNaN(ttl))
            registerAndStartCron(new CronJob(new Date(Date.now() + Math.abs(ttl) * 1000), () => {
                fs.rm(path).catch(e => handleError(e, "Cache"))}));
        return fs.writeFile(path, content)
            .catch(e => handleError(e, "Cache"));
    },
    has: (type, id) => {
        if(!(isNaN(type)?types:typestrings).hasOwnProperty(type))
            return Promise.reject(`"${type}" is not a valid type of stuff that could be in cache.`);
        type = !isNaN(type)?typestrings[type.toString()]:type;
        const path = `./cache/${type}/${id.replaceAll(/\W/g, "")}`;
        return fs.access(path)
            .then(() => Promise.resolve(true))
            .catch(() => Promise.resolve(false));
    },
    retrieve: (type, id) => {
        if(!(isNaN(type)?types:typestrings).hasOwnProperty(type))
            return Promise.reject(`"${type}" is not a valid type of stuff to get out of cache.`);
        type = !isNaN(type)?typestrings[type.toString()]:type;
        const path = `./cache/${type}/${id.replaceAll(/\W/g, "")}`;
        return fs.access(path)
            .then(() => fs.readFile(path));
    },
    init: () => {
        let promises = [];
        for(const type in types) {
            const path = `./cache/${type}`;
            promises.push(fs.access(path)
                .catch(e => {
                    log.info("Cache", `Creating directory ${path}.`);
                    return fs.mkdir(path, {recursive: true});
                })
                .catch(e => handleError(e, "Cache")));
        }
        return Promise.all(promises);
    },
    types: types,
};