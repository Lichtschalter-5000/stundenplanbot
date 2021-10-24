const Schedule = require("./Schedule");
const CSVConverter = require("./CSVConverter");
const BlockSchedule = require("./BlockSchedule");
const Parser = require("./Parser");

const DAY = new Date("October 25, 2021 12:00:00");
const FORM = "221";

const schedule = new Schedule();
const converter = new CSVConverter();
const blockSchedule = new BlockSchedule();


(async () => {
    // const url = await schedule.getScheduleURL();
    // const scheduleObj = await converter.convert(url);
    await blockSchedule.setBlockSchedule();

    // const parser = new Parser(scheduleObj);
    // parser.setDay(DAY);
    // parser.setForm(FORM);

    if(!blockSchedule.getDayInSchedule(FORM, DAY)) {
        console.log(DAY + " is not in your schedule.");
        return;
    }
    console.log(DAY + " is in your schedule (form "+ FORM +")!");
    //parser.getFirstLesson();


})();

