module.exports = class Parser {
    constructor(obj){
        this.schedule = obj;
    }

    setDay(day) {
        this.day = day;
    }

    setForm(form){
        this.form = form;
    }

    getFirstLesson(){
        let s = this.schedule;
        //figure out how many classes there are
    }
};