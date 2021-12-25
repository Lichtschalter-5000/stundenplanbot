// const testParserData = require("../test_data/testData").testParserData;
// noinspection JSUnresolvedFunction

const blockSchedule = (() => require("./BlockSchedule").getInstance());
const log = require("./index").log;

const TEACHERS = {
    "Sk": "Schwenkert",
    "Kl": "Klostermaier",
    "Ht": "Hergert",
    "Ws": "Weiss",
    "Vo": "Volkart",
    "Le": "Lechner",
    "Sc": "Schiel",
    "Hd": "Held",
    "My": "Mayer",
    "Wb": "Westerberg",
    "Kos": "Kosian oder so",
    "Fe": "Fechter"
};
const SUBJECTS = {
    "Kurse": "Kurse",
    "E": "Englisch",
    "PlOrg": "Planung und Organisation",
    "VT": "Veranstaltungstechnik",
    "PuG": "Politik und Gesellschaft",
    "EneSi": "Energie und Sicherheit",
    "D": "Deutsch",
    "RK": "Katholische Religion",
    "Eth": "Ethik",
    "Sp": "Sport"
};

let rawSchedule;

let instance;

module.exports = class Schedule {
    constructor() {}

    static getInstance() {
        if (!instance) {
            instance = new this();
        }
        return instance;
    }

    setSchedule(schedule) {rawSchedule = schedule;}

    async getFirstLesson(day, form) {
        if(!rawSchedule)
            return Promise.reject("No schedule to parse for a first lesson.");
        if(!(await blockSchedule().getDayInSchedule(form, day)))
            return Promise.reject(`${day} isn't in the schedule of form VT${form}, actually.`);

        const teacherRegEx = /\b[A-Z][a-zI]s?\b/;

        function matchRoom(a) {
            let match = a?a.match(/(\d)[.,]\s?([U0])[.,\s]\s?(\d{1,2})/):"";
            return match?match[1] + "." + match[2] + "." + match[3]:a.match(/\b((bis)|(und)|(Halle))\b/);
        }

        const subjectRegEx = /\b([DE]\b|([A-Z]([A-Za-z]{2,}|[A-HJ-Zp])))/g;

        let leftCollumnsSum = 0;
        log.info("Schedule", "Parsing the Schedule.");
        for (let line of rawSchedule) {
            for (let i = 0; i < line.length; line++) {
                if (i > 3) break;
                let cell = line[i];
                log.debug("Schedule", "cell reads '" + cell+"'");
                cell = cell.match(/^\d+$/) || "0";
                if (cell && parseInt(cell[0])) {
                    log.debug("Schedule", "Matches " + cell+", parseInt: "+ parseInt(cell[0]));
                    break;
                }
                leftCollumnsSum++;
            }
        }
        const leftCollumns = Math.round(leftCollumnsSum / rawSchedule.length);
        log.debug("Schedule", "Found " + leftCollumns + " collumns to the left.");
        let days = [[]];
        let collumns = [[]];
        let daysIn = 0;
        let topRows = 0;
        let lineNumber = 0;
        for (let i = 0; i < rawSchedule.length; i++) {
            const line = rawSchedule[i];
            log.debug("Schedule", "reading line " + line);
            let firstCell = line[leftCollumns].match(/^\d$/);
            if (firstCell) {
                firstCell = parseInt(firstCell[0]);
                if (firstCell === 1 && collumns[2]) { // ToDo if firstCell < lineNumber? in case 1 wasnt parsed correctly
                    days[++daysIn] = [];
                    lineNumber = 0;
                }
                log.debug("Schedule", "We're "+daysIn+" days in; First cell reads: "+firstCell);
                days[daysIn][lineNumber++] = line;
                for (let j = 2 + leftCollumns; j < line.length - 1; j++) {
                    if (i - topRows === 0) {
                        collumns[j - 2] = [];
                    }
                    collumns[j - 2][i - topRows] = line[j];
                }
            } else {
                topRows++;
            }
        }
        let rooms = {};
        let collumnType = [];
        let entriesSum = 0;
        let entries = [];
        for (let i = 0; i < collumns.length; i++) {
            collumnType[i] = {
                room: 0,
                teacher: 0,
                subject: 0,
                sum: 0
            }
            let collumn = collumns[i];
            entries[i] = 0;
            for (let j = 0; j < collumn.length; j++) {
                let cell = collumn[j];
                if (!cell || cell === "") {
                    continue;
                }
                collumnType[i].sum++;
                entries[i]++;

                //room
                let room = matchRoom(cell)
                if (room && !rooms.hasOwnProperty(room)) {
                    rooms[room] = 1;
                    collumnType[i].room++;
                } else if (room) {
                    rooms[room]++;
                    collumnType[i].room++;
                }

                //teacher
                let teacher = cell.match(teacherRegEx);
                if (teacher) {
                    teacher = teacher === "KI"?"Kl":teacher;
                    collumnType[i].teacher++;
                }

                //subject
                let candidate = cell.match(subjectRegEx);
                const subjects = Object.getOwnPropertyNames(SUBJECTS);
                let intersection = candidate?subjects.filter(v => candidate.includes(v)):[];
                if (intersection.length) {
                    collumnType[i].subject++;
                }
            }
            entriesSum += entries[i];
        }

        // const entriesAvg = entriesSum / collumns.length;
        // let entriesDeviation = [];
        // let entriesDeviationSum = 0;
        // for (let i = 0; i < entries.length; i++) {
        //     entriesDeviation[i] = Math.abs(entriesAvg - entries[i]);
        //     entriesDeviationSum += entriesDeviation[i];
        // }
        // let entriesDeviationAvg = entriesDeviationSum / entriesDeviation.length;
        // for (let i = 0; i < entries.length; i++) {
        //     // check for emptyness, flawed: if(Math.abs(entriesAvg - entries[i]) > 2.0 * entriesDeviationAvg) {
        //     log.debug("Schedule", "collumn " + i + ": ");
        //     log.debug("Schedule", collumns[i]);
        //     log.debug("Schedule", "\nIs empty? " +
        //         (Math.abs(entriesAvg - entries[i]) > 2.0 * entriesDeviationAvg) + "\nCollumn Type is: " +
        //         // check collumn Type: (collumnType[i].teacher > collumnType[i].subject?"teacher":(collumnType[i].teacher > collumnType[i].room?"teacher":(collumnType[i].subject > collumnType[i].room?"subject":"room"))) + "\n" +
        //         // Math.max(collumnType[i].teacher, collumnType[i].subject, collumnType[i].room));
        // }

        let formsTotal = await blockSchedule().getFormsAtDay(day);
        const indexOfForm = formsTotal.indexOf(form);
        log.debug("Schedule", `Found ${formsTotal.length} (${formsTotal}) forms for ${day}, form ${form} should be the ${indexOfForm + 1}. form from the left.`);
        log.debug("Schedule", formsTotal + " " + form);
        formsTotal = formsTotal.length;

        let roomCollumnIndex; //ToDo one room collumn spread over two adjacent collumns
        let roomCollumnsPast = 0;
        collumnType.forEach((val, index) => {
            log.debug("Schedule", `Collumn ${index + 1} has ${val.room} room entries of ${val.sum} total.`);
            if (val.room > 0.15 * val.sum) {
                log.debug("Schedule", "(let's count this as a room-collumn).");
                if (roomCollumnsPast++ === indexOfForm && !roomCollumnIndex) {
                    roomCollumnIndex = index + 2;
                }
            }
        });
        if (!roomCollumnIndex) {
            log.error("Schedule", "Probably there were less room collumns than there should be classes, this is a thing the parser can't handle at the moment."); // ToDo
            return {error: "Found less room colllumns than there should be classes."};
        }
        if (roomCollumnsPast !== formsTotal)
            log.debug("Schedule", "\nFound less room collumns than classes, that's not reassuring...");
        let result = {error: `Found nothing to indicate there's lessons at all at the given day ${day}.`};
        days[day.getDay() - 1].forEach((d, index) => {
            if (!d || result.hasOwnProperty("time")) {/*log.debug("Schedule", "breaking");*/
                return;
            }
            log.debug("Schedule", "Line " + (index + 1) + ":");
            if (matchRoom(d[roomCollumnIndex])) {
                log.debug("Schedule", "Found a room in the room collumn for this class (collumn " + (roomCollumnIndex + 1) + "), assume it's the first lesson.");
                result = {time: d[1 + leftCollumns], lesson: index + 1};
            } else {
                log.debug("Schedule", "Couldn't match a room in the room collumn for this class (collumn " + (roomCollumnIndex + 1) + "): '" + d[roomCollumnIndex] + "'");
                let concat = d[roomCollumnIndex - 2].concat(" " + d[roomCollumnIndex - 1]).concat(" " + d[roomCollumnIndex]);
                let teacherMatch = concat.replace(/\bKI\b/, "Kl").match(teacherRegEx);
                let subjectMatch = concat.match(subjectRegEx);
                if (teacherMatch && subjectMatch) { // ToDo better matching (like for collumns)
                     log.debug("Schedule", "Match: "+teacherMatch + " evals to "+TEACHERS.hasOwnProperty(teacherMatch[0]));
                     log.debug("Schedule", "Match: "+subjectMatch + " evals to "+SUBJECTS.hasOwnProperty(subjectMatch[0]));
                    if (TEACHERS.hasOwnProperty(teacherMatch[0]) && SUBJECTS.hasOwnProperty(subjectMatch[0])) {
                        log.debug("Schedule", "Could find a subject and a teacher in the two preceeding collumns, assume it's the first lesson.");
                        result = {time: d[1 + leftCollumns], lesson: index + 1};
                    }
                }
                log.debug("Schedule", `Couldn't find teacher and subject either... -> '${concat}'`);
            }
        });

        log.debug("Schedule", "Result: "+JSON.stringify(result));

        if(!result["error"]) {
            const time = day;
            const strTime = result["time"];
            time.setHours(parseInt(strTime.match(/^\d+(?=:)/)[0]));
            time.setMinutes(parseInt(strTime.match(/:(\d{2})/)[1]));
            time.setSeconds(0);
            result["time"] = time;
        } else {
            return Promise.reject(result["error"]);
        }

        return result;
    }

};