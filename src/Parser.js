const testParserData = require("./testData").testParserData;

module.exports = class Parser {
    constructor(obj, blockSchedule) {
        this.schedule = obj;
        this.blockSchedule = blockSchedule;

        this.TEACHER = {
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

    setDay(day) {
        this.day = day;
    }

    setForm(form) {
        this.form = form;
    }

    getFirstLesson() {
        const teacherRegEx = /\b[A-Z][a-zI]s?\b/;
        function matchRoom (a) {
            let match = a?a.match(/(\d)[.,]([U0])[.,](\d{1,2})/):"";
            return match?match[1] + "." + match[2] + "." + match[3]:a.match(/\b((bis)|(und)|(Halle))\b/);
        }
        const subjectRegEx = /\b([DE]\b|([A-Z]([A-Za-z]{2,}|[A-HJ-Zp])))/g;

        let days = [[]];
        let collumns = [[]];
        let daysIn = 0;
        let topRows = 0;
        for (let i = 0; i < this.schedule.length; i++) {
            const line = this.schedule[i];
            let firstCell = line[0].match(/^\d$/);
            if (firstCell) {
                firstCell = parseInt(firstCell[0]);
                if (firstCell === 1 && collumns[2]) {
                    days[++daysIn] = [];
                }
                // console.log("We're "+daysIn+" days in; First cell reads: "+firstCell);
                days[daysIn][firstCell] = line;
                for (let j = 2; j < line.length - 1; j++) {// ToDo sometimes its the third collumn, we need to check
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
                    collumnType[i].sum++;
                    collumnType[i].room++;
                } else if (room) {
                    rooms[room]++;
                    collumnType[i].room++;
                    collumnType[i].sum++;
                }

                //teacher
                let teacher = cell.match(teacherRegEx);
                if (teacher) {
                    teacher = teacher === "KI"?"Kl":teacher;
                    collumnType[i].teacher++;
                    collumnType[i].sum++;
                }

                //subject
                let candidate = cell.match(subjectRegEx);
                const subjects = Object.getOwnPropertyNames(this.SUBJECTS);
                let intersection = candidate?subjects.filter(v => candidate.includes(v)):[];
                if (intersection.length) {
                    collumnType[i].subject++;
                    collumnType[i].sum++;
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

        let formsTotal = this.blockSchedule.getFormsAtDay(this.day);
        const indexOfForm = formsTotal.indexOf(this.form);
        formsTotal = formsTotal.length;
        // console.log(this.blockSchedule.getFormsAtDay(this.day) + " " + this.form);

        let roomCollumnIndex;
        let roomCollumnsPast = 0;
        collumnType.forEach((val,index) => {
            if (val.room > 0.15 * val.sum) {
                if (roomCollumnsPast++ === indexOfForm && !roomCollumnIndex) {
                    roomCollumnIndex = index+2;
                }
            }
        });
        if (roomCollumnsPast !== formsTotal) {console.log("Found less room collumns than classes, not reassuring...");}

        for (let d of days[this.day.getDay()-1]) {
            if(!d) {continue;}
            if (matchRoom(d[roomCollumnIndex])) {
                return d[1];
            }
        }
    }

};