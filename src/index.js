const Schedule = require("./Schedule");

const schedule = new Schedule();
(async () => {
    await schedule.getSchedule();
})();

