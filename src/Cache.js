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
        if(!(type.is(Number)?typestrings:types).hasOwnProperty(type))
            return Promise.reject(`"${type}" is not a valid type of stuff to put in cache.`);
        type = type.is(Number)?typestrings[type]:type;
        const path = `./cache/${type}/${id.replaceAll(/\W/g, "_")}`;
        if(ttl && ttl.is(Number))
            registerAndStartCron(new CronJob(new Date(Date.now() + Math.abs(ttl) * 1000), () => {
                fs.rm(path).catch(e => handleError(e, "Cache"))}));
        return fs.writeFile(path)
            .catch(e => handleError(e, "Cache"));
    },
    has: (type, id) => {
        if(!(type.is(Number)?typestrings:types).hasOwnProperty(type))
            return Promise.reject(`"${type}" is not a valid type of stuff that could be in cache.`);
        type = type.is(Number)?typestrings[type]:type;
        const path = `./cache/${type}/${id.replaceAll(/\W/g, "_")}`;
        return fs.access(path)
            .then(() => Promise.resolve(true))
            .catch(() => Promise.resolve(false));
    },
    retrieve: (type, id) => {
        if(!(type.is(Number)?typestrings:types).hasOwnProperty(type))
            return Promise.reject(`"${type}" is not a valid type of stuff to get out of cache.`);
        type = type.is(Number)?typestrings[type]:type;
        const path = `./cache/${type}/${id.replaceAll(/\W/g, "_")}`;
        return fs.access(path)
            .then(() => fs.readFile(path));
    },
    init: () => {
        for(const type in types) {
            const path = `./cache/${type}`;
            fs.access(path)
                .catch(e => {
                    log.info("Cache", `Creating directory ${path}.`);
                    return fs.mkdir(path, {recursive: true});
                })
                .catch(e => handleError(e, "Cache"));
        }
        return Promise.resolve();
    },
    types: types,
};