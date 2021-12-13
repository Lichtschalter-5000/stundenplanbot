const dsbConnector = (() => require("./DSBConnector").getInstance());
const blockSchedule = (() => require("./BlockSchedule").getInstance());
const CSVConverter = require("./CSVConverter");
const schedule = (() => require("./Schedule").getInstance());
// const TelegramBot = require("./TelegramBot");
const CronJob = require("cron").CronJob;
const log = require("npmlog");

let DAY = new Date("October 20, 2021 12:00:00");
const FORM = "121";

(()=>{
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
    log.addLevel("public", 100, {"fg":"white"});
    log.addLevel("debug", 10, {"fg":"white", "bg":"gray"});
})();
module.exports.log = log;

const converter = new CSVConverter();


(async () => {
     dsbConnector().getScheduleURL().then(url => blockSchedule().refresh()
         .then(() => CSVConverter.convert(url)))
         .then(result => schedule().setSchedule(result))
         .finally(async () => {
              const discordBot = await require("./DiscordBot").getInstance();
              // const telegramBot = new TelegramBot();

              registerAndStartCron(new CronJob("0 0 20 * * Sun-Thu", discordBot.notifyDaily, null, true, "Europe/Berlin"));//, null, true)); // for testing purposes include arguments null & true to fire event at startup
              registerAndStartCron(new CronJob("0 0,30 6-22 * * *", () => {
                   dsbConnector().refresh().then(changed => {
                        if(changed) {
                             dsbConnector().getScheduleURL().then(url => CSVConverter.convert(url))
                                 .then(schedule().setSchedule).finally(discordBot.notifyChange).catch(console.error);
                        }
                   }).catch(discordBot.sendError)
              }, null, true, "Europe/Berlin"));
              registerAndStartCron(new CronJob("20 0 0 * * *", () => discordBot.refreshReminder(".*"), null, true, "Europe/Berlin", null, true));
         }).catch(console.error);

     // registerAndStartCron(new CronJob("0 0 0 1 * *", blockSchedule().refresh, null, true, "Europe/Berlin")); no point in doing that while refresh() doesn't work yet
})();

function registerAndStartCron(job) {
     job.start();
     process.once('SIGINT', () => job.stop());
     process.once('SIGTERM', () => job.stop());
}