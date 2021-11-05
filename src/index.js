const Schedule = require("./Schedule");
const CSVConverter = require("./CSVConverter");
const BlockSchedule = require("./BlockSchedule");
const Parser = require("./Parser");

let DAY = new Date("October 20, 2021 12:00:00");
const FORM = "111";

module.exports.DEBUG = false;

const schedule = new Schedule();
const converter = new CSVConverter();
const blockSchedule = new BlockSchedule();


(async () => {
     // const url = await schedule.getScheduleURL();
     // if (url.substr(0, 3) === "ERR") {
     //      console.log(url + " Aborting.");
     //      return;
     // }
     // const scheduleObj = await converter.convert(url);
     // if(typeof scheduleObj === "string" && scheduleObj.substr(0,3) === "ERR") {
     //      console.log(scheduleObj + " Aborting.");
     //      return;
     // }
     await blockSchedule.setBlockSchedule();
     for(let k = 25; k <= 29;k++) {
          DAY = new Date("October "+k+", 2021 12:00:00");

          if(module.exports.DEBUG) {console.log("Checking whether selected day is in the schedule of the selected form:");}
          if(!blockSchedule.getDayInSchedule(FORM, DAY)) {
               console.log("ERR: " + DAY + " is not in the schedule of form " + FORM + ". Aborting.");
               return;
          }
          if(module.exports.DEBUG) {console.log(DAY + " is in your schedule (form "+ FORM +")!");}

          const parser = Parser.getTestParser(blockSchedule);// new Parser(scheduleObj);
          parser.setDay(DAY);
          parser.setForm(FORM);

          console.log("First lesson of form " + FORM + " on " + DAY + " starts at " + parser.getFirstLesson());
     }
})();

