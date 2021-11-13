const testParserData = require("../test_data/testData").testParserData;
const blockSchedule = require("./index").blockSchedule;

module.exports = class Parser {
    constructor(obj) {
        this.debugging = require("./index").DEBUG;
        this.schedule = obj;

        this.TEACHERS = {
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

        this.SUBJECTS = {
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
        }
    }

    static getTestParser(blockSchedule){
        return new Parser(testParserData, blockSchedule);
    }

    getFirstLesson(day, form) {
        const teacherRegEx = /\b[A-Z][a-zI]s?\b/;
        function matchRoom (a) {
            let match = a?a.match(/(\d)[.,]\s?([U0])[.,\s]\s?(\d{1,2})/):"";
            return match?match[1] + "." + match[2] + "." + match[3]:a.match(/\b((bis)|(und)|(Halle))\b/);
        }
        const subjectRegEx = /\b([DE]\b|([A-Z]([A-Za-z]{2,}|[A-HJ-Zp])))/g;

        let leftCollumnsSum = 0
        for (let line of this.schedule) {
            for (let cell of line) {
                cell = cell.match(/^\d+$/) || "0";
                if(cell && parseInt(cell[0])) {
                    // console.log("cell reads '" + cell+"'");
                    // console.log("Matches " + cell+", parseInt: "+ parseInt(cell[0]));
                    break;
                }
                leftCollumnsSum++;
            }
        }

        const leftCollumns = Math.round(leftCollumnsSum/this.schedule.length);
        if (this.debugging) { console.log("Found " + leftCollumns + " collumns to the left."); }
        let days = [[]];
        let collumns = [[]];
        let daysIn = 0;
        let topRows = 0;
        let lineNumber = 0;
        for (let i = 0; i < this.schedule.length; i++) {
            const line = this.schedule[i];
            // console.log("reading line " + line);
            let firstCell = line[leftCollumns].match(/^\d$/);
            if (firstCell) {
                firstCell = parseInt(firstCell[0]);
                if (firstCell === 1 && collumns[2]) { // ToDo if firstCell < lineNumber? in case 1 wasnt parsed correctly
                    days[++daysIn] = [];
                    lineNumber = 0;
                }
                // console.log("We're "+daysIn+" days in; First cell reads: "+firstCell);
                days[daysIn][lineNumber++] = line;
                for (let j = 2 + leftCollumns; j < line.length - 1; j++) {// ToDo sometimes its the third collumn, we need to check
                    //console.log("j="+(j-2)+" i="+(i-topRows));
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
                const subjects = Object.getOwnPropertyNames(this.SUBJECTS);
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
        //     console.log("collumn " + i + ": ");
        //     console.log(collumns[i]);
        //     console.log("\nIs empty? " +
        //         (Math.abs(entriesAvg - entries[i]) > 2.0 * entriesDeviationAvg) + "\nCollumn Type is: " +
        //         // check collumn Type: (collumnType[i].teacher > collumnType[i].subject?"teacher":(collumnType[i].teacher > collumnType[i].room?"teacher":(collumnType[i].subject > collumnType[i].room?"subject":"room"))) + "\n" +
        //         // Math.max(collumnType[i].teacher, collumnType[i].subject, collumnType[i].room));
        // }

        let formsTotal = blockSchedule.getFormsAtDay(day);
        const indexOfForm = formsTotal.indexOf(form);
        if(this.debugging) {console.log("Found " + formsTotal.length + " ("+formsTotal+") forms for the day, form " + form + " should be the " + (indexOfForm + 1) + ". form from the left.");}
        formsTotal = formsTotal.length;
        // console.log(blockSchedule.getFormsAtDay(day) + " " + form);

        let roomCollumnIndex; //ToDo one room collumn spread over two adjacent collumns
        let roomCollumnsPast = 0;
        collumnType.forEach((val,index) => {
            if (this.debugging) {process.stdout.write("\nCollumn "+(index+1)+" has "+val.room+" room entries of "+val.sum+ " total ")}
            if (val.room > 0.15 * val.sum) {
                if (this.debugging) {process.stdout.write("(let's count this as a room-collumn).");}
                if (roomCollumnsPast++ === indexOfForm && !roomCollumnIndex) {
                    roomCollumnIndex = index+2;
                }
            }
        });
        if (!roomCollumnIndex) {
            console.log("Probably there were less room collumns than there should be classes, this is a thing the parser can't handle at the moment."); // ToDo
            return "ERR: found less room colllumns than there should be classes."
        }
        if (roomCollumnsPast !== formsTotal && this.debugging) {console.log("\nFound less room collumns than classes, that's not reassuring...");} else {console.log("");}
        let result = "ERR: Found nothing to indicate there's school... ";
        days[day.getDay()-1].forEach((d, index) => {
            if(!d||result.substr(0,3)!=="ERR") {/*console.log("breaking");*/ return;}
            if(this.debugging) {process.stdout.write("Line " + (index + 1) + ":");}
            if (matchRoom(d[roomCollumnIndex])) {
                if (this.debugging) {console.log("Found a room in the room collumn for this class (collumn "+(roomCollumnIndex+1)+"), assume it's the first lesson.");}
                result = d[1+leftCollumns] + " (" + (index + 1) + ". lesson)";
            } else {
                if (this.debugging) {console.log("Couldn't match a room in the room collumn for this class (collumn "+(roomCollumnIndex+1)+"): '"+d[roomCollumnIndex]+"'");}
                let concat = d[roomCollumnIndex - 2].concat(" " + d[roomCollumnIndex - 1]).concat(" "+d[roomCollumnIndex]);
                let teacherMatch = concat.replace(/\bKI\b/,"Kl").match(teacherRegEx);
                let subjectMatch = concat.match(subjectRegEx);
                if (teacherMatch && subjectMatch) { // ToDo better matching (like for collumns)
                    // console.log("Match: "+teacherMatch + " evals to "+this.TEACHERS.hasOwnProperty(teacherMatch[0]));
                    // console.log("Match: "+subjectMatch + " evals to "+this.SUBJECTS.hasOwnProperty(subjectMatch[0]));
                    if (this.TEACHERS.hasOwnProperty(teacherMatch[0]) && this.SUBJECTS.hasOwnProperty(subjectMatch[0])) {
                        if (this.debugging) {console.log("Could find a subject and a teacher in the two preceeding collumns, assume it's the first lesson.")}
                        result = d[1+leftCollumns] + " (" + (index + 1) + ". lesson)";
                    }
                }
                if (this.debugging) {console.log("Couldn't find teacher and subject either... -> '"+concat+"'");}
            }
        });

        return result;
    }

};