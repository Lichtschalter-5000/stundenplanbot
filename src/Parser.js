module.exports = class Parser {
    constructor(obj){
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
            "Wb": "Westerbauer oder so",
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
            "RK/Eth": "Katholische Religion und Ethik",
            "Sp": "Sport"
        }
    }

    setDay(day) {
        this.day = day;
    }

    setForm(form){
        this.form = form;
    }

    getFirstLesson(){
        let daysIn = 0;
        for (let i = 0; i < this.schedule.length; i++) {
            const line = this.schedule[i];
            let firstCell = line[0].match(/^\d$/);
            if(firstCell) {
                firstCell = parseInt(firstCell);
                if(firstCell === 1) {
                    daysIn++;
                }

                if (daysIn === this.day.getDay()) {

                }
            }
        }
    }
};