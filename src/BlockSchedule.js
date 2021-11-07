const fetch = require("make-fetch-happen");
const tabula = require("tabula-js");
const fs = require("fs");
const tmp = require("tmp");

module.exports = class BlockSchedule {
    constructor() {
        this.blockSchedule = null;
    }

    async downloadBlockSchedule() { //ToDo dynamically get link
        // const res = await fetch("https://bsmedien.musin.de/medienberufe/wp-content/uploads/2021/05/Blockplan_VT_2021-22.pdf");
        // const tmpObj = tmp.fileSync();
        // console.log(tmpObj.name);
        // fs.writeFileSync(tmpObj.name, await res.buffer());
        // const t = tabula("C:\\Chrome\\ Downloads\\Blockplan_VT_2021-22.pdf", {silent: true});
        // t.extractCsv((e, data) => {
        //     console.log("Data: "+data);
        //     if (e) {console.log("tabula error "+e)}
        // });
    }

    async setBlockSchedule() {
        // ToDo fetch BlockSchedule from website
        const csv = `,,,,,,,VT,101/102,,VT,201/202,,VT,301/302,
Jahr,Monat,,Montag,-,Freitag,,,,,,,,,,
2021,Sept.,37,13.09.2021,-,17.09.2021,4,,,,,,,,,
,,38,20.09.2021,-,24.09.2021,5,5,,,5,,,5,,
,,39,27.09.2021,-,01.10.2021,5,,5,,,5,,,5,
Tag der dt. Einheit,Okt.,40,04.10.2021,-,08.10.2021,5,,,5,,,5,,,5
,,41,11.10.2021,-,15.10.2021,5,5,,,5,,,5,,
,,42,18.10.2021,-,22.10.2021,5,5,,,5,,,5,,
,,43,25.10.2021,-,29.10.2021,5,,5,,,5,,,5,
Herbst,Nov.,44,01.11.2021,-,05.11.2021,,,,,,,,,,
,,45,08.11.2021,-,12.11.2021,5,,5,,,5,,,5,
BuG-u.Bettag,,46,15.11.2021,-,19.11.2021,4,,,5,,,5,,,5
,,47,22.11.2021,-,26.11.2021,5,,,5,,,5,,,5
,,48,29.11.2021,-,03.12.2021,5,5,,,5,,,5,,
07.12.21 IHK-Theorle,Dez.,49,06.12.2021,,10.12.2021,5,5,,,5,,,5,,
,,50,13.12.2021,,17.12.2021,5,,5,,,5,,,5,
,,51,20.12.2021,-,24.12.2021,4,,4,,,4,,,4,
Welhnachten,,52,27.12.2021,-,31.12.2021,,,,,,,,,,
2022,Jan.,1,03.01.2022,-,07.01.2022,,,,,,,,,,
,,2,10.01.2022,,14.01.2022,5,,,5,,,5,,,5
,,3,17.01.2022,-,21.01.2022,5,,,5,,,5,,,5
,,4,24.01.2022,-,28.01.2022,5,5,,,5,,,5,,
,,5,31.01.2022,-,04.02.2022,5,5,,,5,,,5,,
,Feb.,6,07.02.2022,-,11.02.2022,5,,5,,,5,,,5,
Bohulhalbjahrende,,7,14.02.2022,-,18.02.2022,5,,5,,,5,,,5,
,,8,21.02.2022,-,25.02.2022,5,,,5,,,5,,,5
Fasching,,9,28.02.2022,-,04.03.2022,,,,,,,,,,
,Mrz.,10,07.03.2022,-,11.03.2022,5,,,5,,,5,,,5
,,11,14.03.2022,-,18.03.2022,5,5,,,5,,,5,,
,,12,21.03.2022,-,25.03.2022,5,5,,,5,,,5,,
,,13,28.03.2022,-,01.04.2022,5,,5,,,5,,,5,
,,14,04.04.2022,-,08.04.2022,5,,5,,,5,,,4,
Ostern,,15,11.04.2022,-,15.04.2022,,,,,,,,,,
,,16,18.04.2022,-,22.04.2022,,,,,,,,,,
,,17,25.04.2022,-,29.04.2022,5,,,5,,,5,,,5
Mai,,18,02.05.2022,-,06.05.2022,5,,,5,,,5,,,
10.05.22 IHK Theorle,Mai,19,09.05.2022,-,13.05.2022,5,5,,,5,,,,,
,,20,16.05.2022,-,20.05.2022,5,5,,,5,,,,,
Chr. Himmelfahrt bew.,Ferientag,21,23.05.2022,-,27.05.2022,4,,3,,,,,,,
,,22,30.05.2022,-,03.06.2022,5,,5,,,5,,,,
Pfingsten,,23,06.06.2022,-,10.06.2022,,,,,,,,,,
,Juni,24,13.06.2022,,17.06.2022,,,,,,,,,,
,,25,20.06.2022,-,24.06.2022,5,,,5,,,5,,,
,,26,27.06.2022,-,01.07.2022,5,,,5,,,5,,,
,Juli,27,04.07.2022,-,08.07.2022,5,5,,,5,,,,,
14.+16.07.1 pad.Konf.,,28,11.07.2022,-,15.07.2022,5,,,,,,,,,
,,29,18.07.2022,,22.07.2022,5,,,5,,,5,,,
,,30,25.07.2022,,29.07.2022,5,,4,,,4,,,,`; //ToDo pay attention, parser screws up the last line

        const lines = csv.split("\n");
        let result = [];
        for (let i = 0; i < lines.length; i++) {
            result.push(lines[i].split(","))
        }
        this.blockSchedule = result;

        this.forms = [ // classes[year][block][class] ToDo automate or check with English and "Kurse"
            [
                ["111"],
                ["121"],
                ["131","132"]
            ],
            [
                ["211"],
                ["221","222"],
                ["232"]
            ],
            [
                ["311","312"],
                ["321","322"],
                ["331"]
            ]
        ]
    }

    getDayInSchedule(form, day) {
        form = form.match(/\d{3}/)[0];
        const formIndex = 7 + (parseInt(form[0]) - 1) * 3 + parseInt(form[1]) - 1;
        const lineofday = this.getLineOfDay(day);
        return lineofday["index"] !== -1 && !!lineofday["line"][formIndex];
    }

    getFormsAtDay(day) {
        let line = this.getLineOfDay(day);
        if(line.index===-1) {
            return [];
        }
        line = line["line"];
        let result = [];
        for (let i = 7; i <= 7 + 9; i++) {
            if (line[i]) {
                for( let form of this.forms[Math.floor((i-7)/3)][(i-7)%3]) {
                    result.push(form);
                }
            }
        }
        result.sort();//(a,b)=>parseInt(a)-parseInt(b));
        return result;
    }

    getLineOfDay(day) {
        for (let i = 0; i < this.blockSchedule.length; i++) {
            const line = this.blockSchedule[i];
            let endDate = line[5].trim().match(/(\d{2})\.(\d{2})\.(\d{4})/);
            // console.log("Parsed end Date: "+endDate+" is "+ !!endDate);
            if (endDate) {
                endDate = new Date(parseInt(endDate[3]), parseInt(endDate[2]) - 1, parseInt(endDate[1]), 12);
                // console.log("converted end date "+endDate);
                if (endDate >= day) {
                    let startDate = line[3].trim().match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
                    // console.log("parsed start date is " + startDate);
                    startDate = new Date(parseInt(startDate[3]), parseInt(startDate[2]) - 1, parseInt(startDate[1]), 5);
                    if (startDate.getTime() <= day.getTime()) {
                        return {index: i, line: this.blockSchedule[i]};
                    }
                }
            }
        }
        return {index: -1};
    }

    getNextSchoolDay(form) {
        let day = new Date();
        for (let i = 0; i < 356; i++) {
            if (this.getDayInSchedule(form, day)) {
                return day;
            } else {
                day.setDate(day.getDate() + 1);
            }
        }
        return new Date(0);
    }
}