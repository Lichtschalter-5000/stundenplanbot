module.exports.dsbConnector = require("./DSBConnector").getInstance();
module.exports.blockSchedule = require("./BlockSchedule").getInstance();
const CSVConverter = require("./CSVConverter");
const Parser = require("./Parser");
const DiscordBot = require("./DiscordBot");
const TelegramBot = require("./TelegramBot");
const CronJob = require("cron").CronJob;

let DAY = new Date("October 20, 2021 12:00:00");
const FORM = "121";

module.exports.DEBUG = false;

const converter = new CSVConverter();


(async () => {
     const url = await module.exports.dsbConnector.getScheduleURL();
     if (!url) {
          console.log("Couldn't get URL of the timetable. Aborting.");
          return;
     }
     await module.exports.blockSchedule.refresh();
     const scheduleObj = await converter.convert(url);
     if(typeof scheduleObj === "string" && scheduleObj.substr(0,3) === "ERR") {
          console.log(scheduleObj + " Aborting.");
          return;
     }
     // console.log(scheduleObj);
     // for(let k = 8; k <= 12;k++) {
     //      DAY = new Date("November "+k+", 2021 12:00:00");
     //
     //      if(module.exports.DEBUG) {console.log("Checking whether selected day is in the schedule of the selected form:");}
     //      if(!blockSchedule.getDayInSchedule(FORM, DAY)) {
     //           console.log("ERR: " + DAY + " is not in the schedule of form " + FORM + ". Aborting.");
     //           return;
     //      }
     //      if(module.exports.DEBUG) {console.log(DAY + " is in your schedule (form "+ FORM +")!");}
     //
     const parser = new Parser(scheduleObj);// Parser.getTestParser(blockSchedule);
     //
     //      console.log("First lesson of form " + FORM + " on " + DAY + " starts at " + parser.getFirstLesson(DAY, FORM));
     // }

     const discordBot = new DiscordBot({schedule:module.exports.dsbConnector, parser:parser, blockSchedule:module.exports.blockSchedule});
     await discordBot.init();
     // const telegramBot = new TelegramBot();

     let discord_daily = new CronJob("0 0 20 * * Sun-Thu", async () => {await discordBot.notifyDaily();}, null, true, "Europe/Berlin", null, true);
     discord_daily.start();

     process.once('SIGINT', () => discord_daily.stop());
     process.once('SIGTERM', () => discord_daily.stop());
})();

