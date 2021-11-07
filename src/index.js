const Schedule = require("./Schedule");
const CSVConverter = require("./CSVConverter");
const BlockSchedule = require("./BlockSchedule");
const Parser = require("./Parser");
const DiscordBot = require("./DiscordBot");
const TelegramBot = require("./TelegramBot");
const CronJob = require("cron").CronJob;

let DAY = new Date("October 20, 2021 12:00:00");
const FORM = "121";

module.exports.DEBUG = false;

const converter = new CSVConverter();
const blockSchedule = new BlockSchedule();


(async () => {
     const url = await Schedule.getScheduleURL();
     if (url.substr(0, 3) === "ERR") {
          console.log(url + " Aborting.");
          return;
     }
     const scheduleObj = await converter.convert(url);
     if(typeof scheduleObj === "string" && scheduleObj.substr(0,3) === "ERR") {
          console.log(scheduleObj + " Aborting.");
          return;
     }
     // console.log(scheduleObj);
     await blockSchedule.setBlockSchedule();
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
     const parser = new Parser(scheduleObj, blockSchedule);// Parser.getTestParser(blockSchedule);
     //
     //      console.log("First lesson of form " + FORM + " on " + DAY + " starts at " + parser.getFirstLesson(DAY, FORM));
     // }

     const discordBot = new DiscordBot({schedule:Schedule, parser:parser, blockSchedule:blockSchedule});
     await discordBot.init();
     // const telegramBot = new TelegramBot();

     let discord_daily = new CronJob("0 0 20 * * Sun-Thu", async () => {await discordBot.notifyDaily();}, null, true, "Europe/Berlin", null, true);
     discord_daily.start();
     await discordBot.notifyDaily();

     process.once('SIGINT', () => discord_daily.stop());
     process.once('SIGTERM', () => discord_daily.stop());
})();

