const {Client, Intents, MessageEmbed, MessageActionRow, MessageButton} = require("discord.js");
const fs = require("fs");
const {CronJob, CronTime} = require("cron");
const {DSB_USERNAME, DSB_PASSWORD} = require("../Credentials");
const schedule = (() => require("./Schedule").getInstance());
const dsbConnector = (() => require("./DSBConnector").getInstance());
const blockSchedule = (() => require("./BlockSchedule").getInstance());

const TOKEN = require("../Credentials").DISCORD_TOKEN;

let db = JSON.parse(fs.readFileSync("./src/discord_db.json").toString());

let client;
let instance;
let timesInitialised = 0;

let reminderJobs = {};

// noinspection JSUnresolvedFunction, JSUnresolvedVariable, JSCheckFunctionSignatures
module.exports = class DiscordBot {

    constructor() {}

    static async getInstance() {
        if (!instance) {
            instance = new this();
            await instance.init();
        }
        return instance;
    }

    async init() {
        if(++timesInitialised>1) {
            console.error("Tried to initialise Discord Bot more than once, evil.");
            return;
        }
        client = new Client({intents: [Intents.FLAGS.GUILDS]});

        client.on('interactionCreate', interaction => {
            // if(!interaction.isCommand() && !interaction.isButton()) return;
            const id = interaction.inGuild()?interaction.channelId:interaction.user.id;
            const isAuthed = db.hasOwnProperty(id)?db[id]["authed"]:false;
            if(!isAuthed && !(interaction.isCommand() && interaction["commandName"] === "auth")) {
                interaction.reply({content: "Please authorise first: Supply the credentials for DSBMobile via /auth [username] [password]", ephemeral: true}).catch(console.error);
            } else if (interaction.isCommand()) {
                switch (interaction["commandName"]) {
                    case "ping": {
                        interaction.reply("Pong!").catch(console.error);
                        break;
                    }
                    case "auth": {
                        if (isAuthed) {
                            interaction.reply({content: "You are already authorised, there's no point in doing it over and over again, cutie.", ephemeral: true}).catch(console.error);
                        } else if (interaction.options.getString("username") === DSB_USERNAME && interaction.options.getString("password") === DSB_PASSWORD) { //ToDo prevent runtime analysis and safely compare
                            const form = interaction.options.getString("form");
                            interaction.reply({content: "Great, you are authorised now!", ephemeral: true}).catch(console.error);
                            if (db.hasOwnProperty(id)) {
                                db[id]["authed"] = true;
                            } else {
                                db[id] = {"channel": interaction.inGuild(), "authed": true};
                            }
                            if (form) {
                                db[id]["form"] = form;
                                interaction.followUp("Alrighty, from now on, you" +
                                    (interaction.inGuild()?" (you being \"y'all on this server\")":"") +
                                    " will get updates concerning form VT" + form + "!").catch(console.error);
                            }
                        this.updatedb();
                        } else {
                            interaction.reply({content: "These credentials were not correct.", ephemeral: true}).catch(console.error);
                        }
                        break;
                    }
                    case "getschedule": {
                        interaction.deferReply().then(() => {
                            dsbConnector().getScheduleURL().then(url => interaction.editReply(
                                !url?
                                    "Oh no! 😬 Either I encountered some kind of error or there's simply no schedule online.":
                                    {
                                        embeds: [new MessageEmbed()
                                            .setColor("#40af40")
                                            .setImage(`${url}`)
                                            .setTitle("The current schedule")
                                            .setFooter(`${url}`)]
                                    }
                            ))
                        }).catch(console.error);
                        break;
                    }
                    case "setform":
                        interaction.deferReply().then(() => {
                            const input = interaction.options.getString("form");
                            if(input==="noform") {
                                db[id]["form"] = "";
                                this.updatedb();
                                return interaction.editReply("Alright, I will no longer send you any updates.");
                            } else {
                                db[id]["form"] = input;
                                this.updatedb();
                                return interaction.editReply("Alrighty, from now on, you" +
                                    (interaction.inGuild()?" (you being \"y'all on this server\")":"") +
                                    " will get updates concerning form VT" + db[id]["form"] + "!");
                            }
                        }).catch(console.error);
                        break;
                    case "getlessonstart": {
                        const form = this.getFormFromId(id);
                        if (!form) {
                            interaction.reply("Well, uhm, would you like to tell me which form you are in? (/setform [form])").catch(console.error);
                            // ToDo automatically ask which class to set
                            break;
                        }
                        interaction.deferReply().then(() => blockSchedule().getDayInSchedule(form, new Date()))
                            .then(today => {
                                blockSchedule().getDayInSchedule(form, this.getTomorrowDate()).then(tomorrow => {
                                    if (!(today || tomorrow)) {
                                        return interaction.editReply("Woho, no lessons today or tomorrow for your form VT" + form + "!");
                                    } else {
                                        const buttons = new MessageActionRow()
                                            .addComponents(
                                                new MessageButton()
                                                    .setCustomId("getlessonstart_today")
                                                    .setLabel("Today")
                                                    .setDisabled(!today)
                                                    .setStyle("PRIMARY"),
                                                new MessageButton()
                                                    .setCustomId("getlessonstart_tomorrow")
                                                    .setLabel("Tomorrow")
                                                    .setDisabled(!tomorrow)
                                                    .setStyle("PRIMARY")
                                            );
                                        return interaction.editReply({
                                            content: "For which day?",
                                            components: [buttons],
                                            ephemeral: true
                                        });
                                    }
                                }).catch(console.error);
                            });
                        break;
                    }
                    case "messageme": {
                        if (!interaction.inGuild() || db.hasOwnProperty(interaction.user.id)) {
                            interaction.reply({content: "Why, am I not doing so already?", ephemeral: interaction.inGuild()})
                                .then(() => {
                                    if (db.hasOwnProperty(id) && (!this.getFormFromId(id) || !this.getFormFromId(interaction.user.id))) return interaction.followUp({content: "Maybe you should set a form using /setform [form].", ephemeral: interaction.inGuild()});
                                }).catch(console.error);
                        } else {
                            db[interaction.user.id] = {"channel": false, "authed": true, "form": "lnk"+interaction.channelId};
                            this.updatedb();
                            client.users.fetch(interaction.user.id)
                                .then(destination => destination.send(`Alright, I will DM you with information concerning the class configured in ${interaction.channel}`))
                                .then(interaction.reply({content: "Ok. I sent you a message", ephemeral: true}))
                                .catch(console.error);
                        }
                        break;
                    }
                    case "reminder": {
                        const time = parseInt(interaction.options.getInteger("time"));
                        if(Math.abs(time) > 960) {
                            interaction.reply({content: `That's 16 hours ${time<0?"after":"before"} the lesson starts, don't you think that's a little bit too much?`, ephemeral: true})
                                .catch(console.error);
                            return;
                        }
                        db[id]["reminder"] = time; // ToDo disable reminder
                        this.updatedb();
                        interaction.deferReply()
                        .then(this.refreshReminder(id))
                        .then(() => {
                            interaction.editReply({
                                content: reminderJobs[id]?"Alright. Next reminder is scheduled on " + new Date(reminderJobs[id].nextDates(0)):"Some kind of error happened, I guess? Sorry!",
                                ephemeral: interaction.inGuild()
                            });
                        })
                        .catch(console.error);
                        break;
                    }
                }
            } else if (interaction.isButton()) {
                switch (interaction["customId"]) {
                    case "getlessonstart_today":
                    case "getlessonstart_tomorrow": {
                        interaction.deferUpdate().then(async () => {
                            const firstLesson = await schedule().getFirstLesson(interaction["customId"] === "getlessonstart_tomorrow"?this.getTomorrowDate():new Date(), this.getFormFromId(id));
                            interaction.editReply({
                            content: "Your first lesson " + interaction["customId"].substr(15) + " will start at " +
                                firstLesson["time"].toLocaleTimeString() +
                                " (" +
                                firstLesson["lesson"] +
                                ". lesson).",
                            components: [],
                            ephemeral: true
                        });});
                        break;
                    }
                }
            }
        });

        process.once('SIGINT', () => client.destroy());
        process.once('SIGTERM', () => client.destroy());

        return client.login(TOKEN);
    }

    updatedb() {
        fs.writeFileSync("./src/discord_db.json", JSON.stringify(db, null, "\t"));
    }

    getFormFromId(id) {
        if(db.hasOwnProperty(id)){
            const form = db[id]["form"];
            if (form) {
                return form.substr(0, 3) === "lnk"?this.getFormFromId(form.substr(3)):form;
            }
        }
        return undefined;
    }

    getTomorrowDate() {
        let tomorrowDate = new Date();
        tomorrowDate.setDate(new Date().getDate() + 1);
        return tomorrowDate;
    }

    async notifyDaily() {
        for (const id in db) {
            const form = instance.getFormFromId(id);
            if (db[id]["authed"] && form && await blockSchedule().getDayInSchedule(form, instance.getTomorrowDate())) {
                client[db[id]["channel"]?"channels":"users"].fetch(id).then(async destination => {
                    destination.send(`Tomorrow, your lessons will start at ${(await schedule().getFirstLesson(instance.getTomorrowDate(), form))["time"].toLocaleTimeString()}.`).catch(console.error);
                });
            }
        }
    }

    async notifyChange() {
        for (const id in db) {
            const form = this.getFormFromId(id);
            if (db[id]["authed"] && form && (await blockSchedule().getDayInSchedule(form, new Date()) || await blockSchedule().getDayInSchedule(form, instance.getTomorrowDate()))) {
                client[db[id]["channel"]?"channels":"users"].fetch(id).then(destination =>
                    dsbConnector().getScheduleURL().then(url => destination.send({
                        embeds: [new MessageEmbed()
                            .setColor("#40af40")
                            .setImage(`${url}`)
                            .setTitle("The current schedule")
                            .setDescription("... has been updated, so here it is in it's full glory:")
                            .setFooter(`${url}`)]
                    }))).catch(console.error);
            }
        }
    }

    async refreshReminder(id) {
        if(id !== "all") {
        const form = this.getFormFromId(id);
        if(!form || !db[id].hasOwnProperty("reminder") || db[id]["reminder"] === false) {
            return Promise.reject((`aborting cuz no form? ${!form} has no reminder? ${!db[id].hasOwnProperty("reminder")} reminder is false? ${db[id]["reminder"] === false}`));
        }

        for (let a = 0; a < 60; a++) {
            const nowTime = new Date();
            const day = new Date();
            day.setDate(new Date().getDate() + a);
            // console.log(`Looking at ${day}.`);
            if(await blockSchedule().getDayInSchedule(form, day)) {
                const firstLessonTime = (await schedule().getFirstLesson(day, form))["time"];
                const reminderTime = new Date(firstLessonTime.getTime() - db[id]["reminder"] * 60000);
                // console.log(`now: ${nowTime} ; reminderTime: ${reminderTime} ; firstLessonTime: ${firstLessonTime.getTime()}`);
                if(reminderTime.getTime() > nowTime.getTime() + 5000) {
                    // console.log(`Reminding at ${reminderTime}.`)
                    if(!reminderJobs.hasOwnProperty(id)) {
                        reminderJobs[id] = new CronJob(reminderTime, () => {
                            client[db[id]["channel"]?"channels":"users"].fetch(id).then(async destination => {
                                destination.send(`Your next lesson will start in ${db[id]["reminder"]} minutes.`)
                                    .then(()=> {instance.refreshReminder(id);})
                                    .catch(console.error);
                            });
                        }, null, true, "Europe/Berlin");
                        process.once('SIGINT', () => reminderJobs[id].stop());
                        process.once('SIGTERM', () => reminderJobs[id].stop());
                    } else {
                        reminderJobs[id].setTime(new CronTime(reminderTime));
                    }
                    break;
                }
            }
        }}
        else {
            for(let id in db){
                if (db[id].hasOwnProperty("reminder")) {
                    instance.refreshReminder(id).catch(console.error);
                }
            }
        }
        return Promise.resolve();
    }
}