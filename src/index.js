// noinspection JSUnresolvedFunction,JSCheckFunctionSignatures

const CronJob = require("cron").CronJob;
const log = require("npmlog");
const Stream = require("stream");
const fs = require("fs");

Object.defineProperty(log, 'heading', { get: () => { return `[${new Date().toLocaleTimeString(["en-GB"],
    {
        weekday: "short",
        month: "numeric",
        day: "numeric",
        hour: "numeric",
        minute: "numeric",
        second: "numeric",
        fractionalSecondDigits: 2
    })}]`;}});
log.addLevel("public", 100000, {"fg":"white"});
log.addLevel("debug", 10, {"fg":"white", "bg":"grey"});
log.level = "verbose";

let filestream;
const duplex = new Stream.Duplex();
duplex._write = (chunk, encoding, next) => {
    duplex.push(chunk);
    next();
};
duplex._read = () => {};

log.stream._write = (chunk, encoding, next) => {
    process.stdout.write(chunk);
    duplex.write(chunk.replaceAll(/.*?m/g, ""), encoding);
    next();
};

function registerAndStartCron(job) {
    job.start();
    process.once('SIGINT', () => job.stop());
    process.once('SIGTERM', () => job.stop());
}

function handleError(e, loc) {
    log.error(loc?loc:"Unknown src.", "Error thrown: "+e);
}

registerAndStartCron(new CronJob("10 0 0 * * *", () => {
    if (filestream) {
        filestream.write(`It's ${Date()}, ending today's logfile. Byeee!\n`);
        filestream.end();
    }

    // noinspection JSCheckFunctionSignatures
    const month = new Date().toLocaleDateString(["en-GB"], {month: "long"});
    const dir = `./logs/${month}`;
    // noinspection JSCheckFunctionSignatures
    const day = new Date().toLocaleDateString(["en-GB"], {day: "2-digit"});
    const path = `${dir}/${month}-${day}.log`;
    // log.verbose("index", `dir: ${dir} // path: ${path}`);

    // delete old month
    let oldmonth = new Date();
    oldmonth.setMonth(oldmonth.getMonth() - 2);
    oldmonth = `./logs/${oldmonth.toLocaleDateString(["en-GB"], {month: "long"})}`
    fs.access(oldmonth, error => {
        if (!error) {
            log.info("index", `Removing old logs directory (${oldmonth}).`)
            fs.rm(oldmonth, {recursive: true, force: true}, error => error?handleError(error, "index"):null);
        }
    });

    if (!fs.existsSync(dir)) fs.mkdirSync(dir, {recursive:true});

    filestream = fs.createWriteStream(path, {flags: "a"});
    process.once('SIGINT', () => filestream.end());
    process.once('SIGTERM', () => filestream.end());
    filestream.write(`${"-".repeat(30)}{Good morning on the ${day}. ${month}}${"-".repeat(30)}\n`)

    duplex.pipe(filestream);
}, null, true, "Europe/Berlin", null, true));

module.exports.log = log;
module.exports.handleError = handleError;
module.exports.registerAndStartCron = registerAndStartCron;

const dsbConnector = (() => require("./DSBConnector").getInstance());
const blockSchedule = (() => require("./BlockSchedule").getInstance());
const CSVConverter = require("./CSVConverter");
const schedule = (() => require("./Schedule").getInstance());
// const TelegramBot = require("./TelegramBot");

const converter = new CSVConverter();
const cache = require("./Cache");

     cache.init()
         .then(() => dsbConnector().getScheduleURL())
         .then(url => blockSchedule().refresh()
         .then(() => CSVConverter.convert(url)))
         .then(result => schedule().setSchedule(result))
         .finally(async () => {
             const discordBot = await require("./DiscordBot").getInstance();
             // const telegramBot = new TelegramBot();
             discordBot.notifyChange(new Date()).catch(e => handleError(e, "index"));
             registerAndStartCron(new CronJob("0 0 20 * * Sun-Thu", discordBot.notifyDaily, null, true, "Europe/Berlin"));//, null, true)); // for testing purposes include arguments null & true to fire event at startup
             registerAndStartCron(new CronJob("0 25,55 5-21 * * *", () =>
                 setTimeout(() => {
                 dsbConnector().refresh().then(([changed, time]) => {
                     if (changed) {
                         return dsbConnector().getScheduleURL()
                             .then(url => CSVConverter.convert(url))
                             .then(() => schedule().setSchedule)
                             .then(time => discordBot.notifyChange(time));
                     } else
                         return Promise.resolve();
                 }).catch(e => handleError(e, "index"))}, Math.random()*10*60*1000), null, true, "Europe/Berlin"));
             registerAndStartCron(new CronJob("20 0 3 * * *", () => discordBot.refreshReminder(".*"), null, true, "Europe/Berlin", null, true));
         }).catch(e => handleError(e, "index"));


     // registerAndStartCron(new CronJob("0 0 0 1 * *", () => setTimeout(blockSchedule().refresh,Math.random()*24*60*60*1000) , null, true, "Europe/Berlin")); no point in doing that while refresh() doesn't work yet
