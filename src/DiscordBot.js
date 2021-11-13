const {Client, Intents, MessageEmbed, MessageActionRow, MessageButton} = require("discord.js");
const fs = require("fs");
const {DSB_USERNAME, DSB_PASSWORD} = require("../Credentials");
const index = require("./index");

const TOKEN = require("../Credentials").DISCORD_TOKEN;

let db = JSON.parse(fs.readFileSync("./src/discord_db.json").toString());

let client;
let instance;
let timesInitialised = 0;

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
                                    " will get updates about the form VT" + form + "!").catch(console.error);
                            }
                        this.updatedb();
                        } else {
                            interaction.reply({content: "These credentials were not correct.", ephemeral: true}).catch(console.error);
                        }
                        break;
                    }
                    case "getschedule": {
                        interaction.deferReply().then(() => {
                            index.dsbConnector.getScheduleURL().then(url => interaction.editReply(
                                url.substr(0, 3) === "ERR"?
                                    "Oh no! 😬 I encountered an error:\n" + url.substr(4):
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
                            db[id]["form"] = interaction.options.getString("form");
                            this.updatedb();
                            return interaction.editReply("Alrighty, from now on, you" +
                                (interaction.inGuild()?" (you being \"y'all on this server\")":"") +
                                " will get updates about the form VT" + db[id]["form"] + "!");
                        }).catch(console.error);
                        break;
                    case "getlessonstart": {
                        const form = this.getFormFromId(id);
                        if (!form) {
                            interaction.reply("Well, uhm, would you like to tell me which form you are in? (/setform [form])").catch(console.error);
                            // ToDo automatically ask which class to set
                            break;
                        }

                        const today = index.blockSchedule.getDayInSchedule(form, new Date());
                        const tomorrow = index.blockSchedule.getDayInSchedule(form, this.getTomorrowDate());

                        if (!(today || tomorrow)) {
                            interaction.reply("Woho, no lessons today or tomorrow for your form VT" + form + "!").catch(console.error);
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
                            interaction.reply({content: "For which day?", components: [buttons]}).catch(console.error);
                        }
                        break;
                    }
                }
            } else if (interaction.isButton()) {
                switch (interaction["customId"]) {
                    case "getlessonstart_today":
                    case "getlessonstart_tomorrow": {
                        interaction.deferUpdate().then(() => interaction.editReply({
                            content: "Your first lesson " + interaction["customId"].substr(15) + " will start at " +
                                index.parser.getFirstLesson(interaction["customId"] === "getlessonstart_tomorrow"?this.getTomorrowDate():new Date(), this.getFormFromId(id)) +
                                "o' clock.",
                            components: [],
                            ephemeral: true
                        }));
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
        return db.hasOwnProperty(id)?db[id]["form"]:null;
    }

    getTomorrowDate() {
        let tomorrowDate = new Date();
        tomorrowDate.setDate(new Date().getDate() + 1);
        return tomorrowDate;
    }

    notifyDaily() {
        for (const id in db) {
            const form = db[id]["form"];
            if (db[id]["authed"] && form && index.blockSchedule.getDayInSchedule(form, instance.getTomorrowDate())) {
                client[db[id]["channel"]?"channels":"users"].fetch(id).then(destination => {
                    destination.send(`Tomorrow, your lessons will start at ${index.parser.getFirstLesson(instance.getTomorrowDate(), form)}.`).catch(console.error);
                });
            }
        }
    }

}