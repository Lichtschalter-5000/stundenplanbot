const {Client, Intents, MessageEmbed, MessageActionRow, MessageButton, MessageAttachment} = require("discord.js");
const fs = require("fs");
const {CronJob, CronTime} = require("cron");
const {DSB_USERNAME, DSB_PASSWORD} = require("../Credentials");
const schedule = (() => require("./Schedule").getInstance());
const dsbConnector = (() => require("./DSBConnector").getInstance());
const blockSchedule = (() => require("./BlockSchedule").getInstance());
const {log, handleError} = require("./index");

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
            log.warn("DiscordBot", "Tried to initialise Discord Bot more than once, evil.");
            return;
        }
        client = new Client({intents: [Intents.FLAGS.GUILDS]});

        client.on('interactionCreate', interaction => {
            log.silly("DiscordBot", `Received a new interaction of type ${interaction.type} from channel #${interaction.channel}${interaction.inGuild()?" (in a guild)":""} instantiated by @${interaction.client}.`)
            const id = interaction.inGuild()?interaction.channelId:interaction.user.id;
            if(!this.isAuthed(id) && !(interaction.isCommand() && interaction["commandName"] === "auth")) {
                log.info("DiscordBot", `Unauthorized interaction (id ${id})`);
                interaction.reply({content: "Please authorise first: Supply the credentials for DSBMobile via /auth [username] [password]", ephemeral: true}).catch(e => handleError(e, "DiscordBot"));
            } else if (interaction.isCommand()) {
                switch (interaction["commandName"]) {
                    case "ping": {
                        interaction.reply("Pong!").catch(e => handleError(e, "DiscordBot"));
                        break;
                    }
                    case "auth": {
                        if (this.isAuthed(id)) {
                            interaction.reply({content: "You are already authorised, there's no point in doing it over and over again, cutie.", ephemeral: true}).catch(e => handleError(e, "DiscordBot"));
                        } else if (interaction.options.getString("username") === DSB_USERNAME && interaction.options.getString("password") === DSB_PASSWORD) { //prevent runtime analysis and safely compare - in theory...
                            const form = interaction.options.getString("form");
                            interaction.reply({content: "Great, you are authorised now!", ephemeral: true}).catch(e => handleError(e, "DiscordBot"));
                            if (db.hasOwnProperty(id)) {
                                db[id]["authed"] = true;
                            } else {
                                db[id] = {"channel": interaction.inGuild(), "authed": true};
                            }
                            if (form) {
                                if(!form.match(/\d{3}/)[0]) {
                                    log.error("DiscordBot", `/auth: ${form} is not a valid form`);
                                    break;
                                }
                                db[id]["form"] = form;
                                interaction.followUp(`Alrighty, from now on, ${interaction.inGuild()?"you":"this server"} will get updates concerning form VT${db[id]["form"]}!`)
                                    .catch(e => handleError(e, "DiscordBot"));
                            }
                            console.info("DiscordBot", `Authorized a new ${interaction.inGuild()?"channel":"user"}.`)
                            this.updatedb();
                        } else {
                            interaction.reply({content: "These credentials were not correct.", ephemeral: true}).catch(e => handleError(e, "DiscordBot"));
                            log.warn("DiscordBot", `Received wrong credentials while trying to authorise somebody: User: "${interaction.options.getString("username")}" Password: "${interaction.options.getString("password")}"`);
                        }
                        break;
                    }
                    case "getschedule": {
                        interaction.deferReply().then(() => {
                            dsbConnector().getScheduleURL().then(url => {interaction.editReply(
                                !url?
                                    "Oh no! 😬 Either I encountered some kind of error or there's simply no schedule online.":
                                    {
                                        embeds: [new MessageEmbed()
                                            .setColor("#40af40")
                                            .setImage(`${url}`)
                                            .setTitle("The current schedule")
                                            .setFooter(`${url}`)]
                                    }
                            );
                            if(url) {
                                log.verbose("DiscordBot", `Sent out the current schedule to #${interaction.channel}.`);
                            } else {
                                log.warn("DiscordBot", `Could not send out the current schedule to #${interaction.channel}.`);
                            }
                            });
                        }).catch(e => handleError(e, "DiscordBot"));
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
                                return interaction.editReply(`Alrighty, from now on, ${interaction.inGuild()?"you":"this server"} will get updates concerning form VT${db[id]["form"]}!`);
                            }

                        })
                        .finally(() => {log.verbose("DiscordBot", `Set form of ${id} to "${interaction.options.getString("form")}"`);})
                        .catch(e => handleError(e, "DiscordBot"));
                        break;
                    case "getlessonstart": {
                        const form = this.getFormFromId(id);
                        if (!form) {
                            interaction.reply("Well, uhm, would you like to tell me which form you are in? (/setform [form])").catch(e => handleError(e, "DiscordBot"));
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
                                }).catch(e => handleError(e, "DiscordBot"));
                            });
                        break;
                    }
                    case "messageme": {
                        if (!interaction.inGuild() || db.hasOwnProperty(interaction.user.id)) {
                            interaction.reply({content: "Why, am I not doing so already?", ephemeral: interaction.inGuild()})
                                .then(() => {
                                    if (db.hasOwnProperty(id) && (!this.getFormFromId(id) || !this.getFormFromId(interaction.user.id)))
                                        return interaction.followUp({content: "Maybe you should set a form using /setform [form].", ephemeral: interaction.inGuild()});
                                }).catch(e => handleError(e, "DiscordBot"));
                        } else {
                            db[interaction.user.id] = {"channel": false, "authed": true, "form": "lnk"+interaction.channelId};
                            this.updatedb();
                            client.users.fetch(interaction.user.id)
                                .then(destination => destination.send(`Alright, I will DM you with information concerning the form configured in ${interaction.channel}. (VT ${this.getFormFromId(id)})`))
                                .then(interaction.reply({content: "Ok. I sent you a message.", ephemeral: true}))
                                .catch(e => handleError(e, "DiscordBot"));
                        }
                        break;
                    }
                    case "reminder": {
                        const time = parseInt(interaction.options.getInteger("time"));
                        if(interaction.options.getBoolean("active") === false) {
                            interaction.reply({content: "I won't remind you anymore, it's fine.", ephemeral: true})
                                .catch(e => handleError(e, "DiscordBot"));
                            db[id]["reminder"] = false;
                            this.updatedb();
                            return;
                        }
                        if(Math.abs(time) > 960) {
                            interaction.reply({content: `That's 16 hours ${time<0?"after":"before"} the lesson starts, don't you think that's a little bit too much?`, ephemeral: true})
                                .catch(e => handleError(e, "DiscordBot"));
                            return;
                        }
                        db[id]["reminder"] = time;
                        this.updatedb();
                        interaction.deferReply()
                        .then(this.refreshReminder(id))
                        .then(() => {
                            interaction.editReply({
                                content: reminderJobs[id]?`Alright. Next reminder is scheduled on ${new Date(reminderJobs[id].nextDates(0))}.`:"Some kind of error happened, I guess? Sorry!",
                                ephemeral: interaction.inGuild()
                            });
                        })
                        .catch(e => handleError(e, "DiscordBot"));
                        break;
                    }
                }
            } else if (interaction.isButton()) {
                switch (interaction["customId"]) {
                    case "getlessonstart_today":
                    case "getlessonstart_tomorrow": {
                        interaction.deferUpdate()
                            .then(() => schedule().getFirstLesson(interaction["customId"] === "getlessonstart_tomorrow"?this.getTomorrowDate():new Date(), this.getFormFromId(id)))
                            .then(firstLesson => interaction.editReply({
                                content: `Your first lesson ${interaction["customId"].substr(15)} will start at ${firstLesson["time"].toLocaleTimeString()} (${firstLesson["lesson"]}. lesson).`,
                                components: [],
                                ephemeral: true
                            }))
                            .catch((error) => interaction.editReply({content: `An error occured: ${error}`, components: [], ephemeral: true}))
                            .catch(e => handleError(e, "DiscordBot"));
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
        log.silly("DiscordBot", "Updating Database");
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
        log.verbose("DiscordBot", "Sending out daily reminders.");
        for (const id in db) {
            const form = instance.getFormFromId(id);
            if (instance.isAuthed(id) && form && await blockSchedule().getDayInSchedule(form, instance.getTomorrowDate())) {
                client[db[id]["channel"]?"channels":"users"].fetch(id).then(destination => {
                    log.silly("DiscordBot", `Sending reminder to ${id} for form ${form}.`);
                    return schedule().getFirstLesson(instance.getTomorrowDate(), form).then(firstLesson =>
                    destination.send(`Tomorrow, your lessons will start at ${firstLesson["time"].toLocaleTimeString()} (${firstLesson["lesson"]}. lesson).`))
                }).catch(e => handleError(e, "DiscordBot"));
            }
        }
    }

    async notifyChange(timeOfChange) {
        log.verbose("DiscordBot", "Sending out change notifiers.");
        for (const id in db) {
            const form = instance.getFormFromId(id);
            if (instance.isAuthed(id) && form && (await blockSchedule().getDayInSchedule(form, new Date()) || await blockSchedule().getDayInSchedule(form, instance.getTomorrowDate()))) {
                client[db[id]["channel"]?"channels":"users"].fetch(id).then(destination =>
                    dsbConnector().getScheduleURL().then(url =>
                        fetch(url).then(result =>
                            destination.send({
                                embeds: [new MessageEmbed()
                                    .setColor("#40af40")
                                    .setImage("attachment://img.png")
                                    .setTitle("The current schedule")
                                    .setDescription(`... has been updated${timeOfChange?" at "+timeOfChange.toLocaleTimeString(["en-GB"], {hour: "2-digit", minute: "2-digit"}):""}, so here it is in it's full glory:`)
                                    .setFooter(`${url}`)],
                                files: [new MessageAttachment(result.blob(), "img.png")]
                            }))))
                    .catch(e => handleError(e, "DiscordBot"));
            }
        }
    }

    isAuthed(id) {
        return db.hasOwnProperty(id)?(db[id].hasOwnProperty("authed")?db[id]["authed"]:false):false;
    }

    async refreshReminder(selector) {
        if(!(selector instanceof RegExp))
            selector = new RegExp(selector);
        for(let id in db){
            if (selector.test(id.toString()) && this.isAuthed(id) && db[id].hasOwnProperty("reminder") && db[id]["reminder"]!== false) {
            const form = this.getFormFromId(id);
            if(!form || !db[id].hasOwnProperty("reminder") || db[id]["reminder"] === false) {
                return Promise.reject((`aborting cuz no form? ${!form} has no reminder? ${!db[id].hasOwnProperty("reminder")} reminder is false? ${db[id]["reminder"] === false}`));
            }
            const offset = db[id]["reminder"];
            const nowTime = new Date();
            const day = new Date();
            day.setDate(day.getDate() - 1);
            for (let a = 0; a < 60; a++) { //ToDo not too far in future?
                day.setDate(day.getDate() + 1);
                log.debug(`Looking at ${day}.`);
                if(await blockSchedule().getDayInSchedule(form, day)) {
                    let firstLessonTime;
                    try {
                        firstLessonTime = (await schedule().getFirstLesson(day, form))["time"];
                    } catch (e) {
                        log.error("DiscordBot", `No firstLessonTime on day ${day}`);
                        continue;
                    }
                    const reminderTime = new Date(firstLessonTime.getTime() - offset * 60000);
                    log.debug("DiscordBot", `now: ${nowTime} ; reminderTime: ${reminderTime} ; firstLessonTime: ${firstLessonTime.getTime()}`);
                    if(nowTime >= reminderTime)
                        continue;
                    if(reminderJobs.hasOwnProperty(id)) {
                        reminderJobs[id].setTime(new CronTime(reminderTime));
                        reminderJobs[id].start();
                    } else {
                        reminderJobs[id] = new CronJob(reminderTime, () => {
                            client[db[id]["channel"]?"channels":"users"].fetch(id).then(async destination => {
                                log.info("DiscordBot", `Reminding ${id} now.`);
                                const hours = Math.abs(Math.floor(offset / 60));
                                const minutes = Math.abs(offset % 60);
                                let timestring = (hours === 0 && minutes === 0?"now":(offset > 0?"in ":""))
                                    + (hours > 0?hours + " hour" + (hours > 1?"s":"") + (minutes > 0?" and ":""):"")
                                    + (minutes > 0?minutes + " minute" + (minutes > 1?"s":""):"");
                                    log.debug("DiscordBot", `offset is ${offset} minutes: ${hours} hours, ${minutes} minutes, that is in ${timestring}.`);
                                return destination.send(offset < 0 ?
                                    `Your schoolday has started ${timestring} ago.`:
                                    `Your next lesson will start ${timestring}.`)
                                    .then(() => {reminderJobs[id].stop()})
                                    .then(() => {instance.refreshReminder(id);});
                            }).catch(e => handleError(e, "DiscordBot"));
                        }, null, true, "Europe/Berlin");
                        process.once('SIGINT', () => reminderJobs[id].stop());
                        process.once('SIGTERM', () => reminderJobs[id].stop());
                    }
                    log.info("DiscordBot", "Next reminder for " + id + " on " + new Date(reminderJobs[id].nextDates(0)));
                    break;
                }
            }}
        }
        return Promise.resolve();
    }

}