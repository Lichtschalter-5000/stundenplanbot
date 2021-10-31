module.exports = class Parser {
    constructor(obj) {
        this.schedule = obj;

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

    setDay(day) {
        this.day = day;
    }

    setForm(form) {
        this.form = form;
    }

    getFirstLesson() {
        let days = [[]];
        let collumns = [[]];
        let daysIn = 0;
        let topRows = 0;
        for (let i = 0; i < this.schedule.length; i++) {
            const line = this.schedule[i];
            let firstCell = line[0].match(/^\d$/);
            if (firstCell) {
                firstCell = parseInt(firstCell[0]);
                //console.log(firstCell);
                days[daysIn][firstCell] = line;
                if (firstCell === 1 && collumns[2]) {
                    days[++daysIn] = [];
                }
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
                if (!cell) {
                    continue;
                }
                collumnType[i].sum++;
                entries[i]++;

                //room
                let room = cell.match(/(\d)[.,]([U0])[.,](\d{1,2})/);
                room = room?room[1] + "." + room[2] + "." + room[3]:cell.match(/\b((bis)|(und)|(Halle))\b/);
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
                let teacher = cell.match(/\b[A-Z][a-zI]s?\b/);
                if (teacher) {
                    teacher = teacher === "KI"?"Kl":teacher;
                    collumnType[i].teacher++;
                    collumnType[i].sum++;
                }

                //subject
                let candidate = cell.match(/\b([DE]\b|([A-Z]([A-Za-z]{2,}|[A-HJ-Zp])))/g);
                const subjects = Object.getOwnPropertyNames(this.SUBJECTS);
                let intersection = candidate?subjects.filter(v => candidate.includes(v)):[];
                if (intersection.length) {
                    collumnType[i].subject++;
                    collumnType[i].sum++;
                }
            }
            entriesSum += entries[i];
        }

        const entriesAvg = entriesSum / collumns.length;
        let entriesDeviation = [];
        let entriesDeviationSum = 0;
        for (let i = 0; i < entries.length; i++) {
            entriesDeviation[i] = Math.abs(entriesAvg - entries[i]);
            entriesDeviationSum += entriesDeviation[i];
        }
        let entriesDeviationAvg = entriesDeviationSum / entriesDeviation.length;
        for (let i = 0; i < entries.length; i++) {
            console.log("collumn " + i + ": ");
            console.log(collumns[i]);
            console.log("\nIs empty? " +
                (Math.abs(entriesAvg - entries[i]) > 2.0 * entriesDeviationAvg) + "\nCollumn Type is: " +
                (collumnType[i].teacher>collumnType[i].subject?"teacher":(collumnType[i].teacher >collumnType[i].room?"teacher":(collumnType[i].subject>collumnType[i].room?"subject":"room"))) + "\n" +
                Math.max(collumnType[i].teacher, collumnType[i].subject, collumnType[i].room));
        }
    }

};