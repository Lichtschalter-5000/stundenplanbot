const {Client, Intents, MessageEmbed, MessageActionRow, MessageButton} = require("discord.js");
const fs = require("fs");
const {DSB_USERNAME, DSB_PASSWORD} = require("../Credentials");

const TOKEN = require("../Credentials").DISCORD_TOKEN;

let db = JSON.parse(fs.readFileSync("./src/discord_db.json").toString());

let client;

module.exports = class DiscordBot {

    constructor(index) {
        this.blockSchedule = index.blockSchedule;
        this.schedule = index.schedule;
        this.parser = index.parser;
    }


    async init() {
        client = new Client({intents: [Intents.FLAGS.GUILDS]});

        client.on('interactionCreate', async interaction => {
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
                            interaction.reply({content: "Great, you are authorised now!", ephemeral: true}).then(() => {
                                if (db.hasOwnProperty(id)) {
                                    db[id]["authed"] = true;
                                } else {
                                    db[id] = {"channel": interaction.inGuild(), "authed": true};
                                }
                                if (form) {
                                    db[id]["form"] = form;
                                    return interaction.followUp("Alrighty, from now on you" +
                                        (interaction.inGuild()?" (you being \"y'all on this server\")":"") +
                                        " will get updates about the form VT" + form + "!").catch(console.error);
                                }
                            }).catch(console.error).finally(() => {
                                this.updatedb();
                            });
                        } else {
                            interaction.reply({content: "These credentials were not correct.", ephemeral: true}).catch(console.error);
                        }
                        break;
                    }
                    case "getschedule": {
                        await interaction.deferReply();
                        const url = await this.schedule.getScheduleURL();
                        if (url.substr(0, 3) === "ERR") {
                            await interaction.editReply("Oh no! 😬 I encountered an error:\n" + url.substr(4));
                        } else {
                            await interaction.editReply({
                                embeds: [new MessageEmbed()
                                    .setColor("#40af40")
                                    .setImage(url)
                                    .setTitle("The current schedule")
                                    .setFooter(url)]
                            });
                        }
                        break;
                    }
                    case "setform":
                        const form = interaction.options.getString("form");
                        await interaction.reply("Alrighty, from now on you" +
                            (interaction.inGuild()?" (you being \"y'all on this server\")":"") +
                            " will get updates about the form VT" + form + "!");
                        db[id]["form"] = form;
                        this.updatedb();
                        break;
                    case "getlessonstart": {
                        const form = this.getFormFromId(id);
                        if (!form) {
                            await interaction.reply("Well, uhm, would you like to tell me which form you are in? (/setform [form])");
                            // ToDo automatically ask which class to set
                            break;
                        }

                        const today = this.blockSchedule.getDayInSchedule(form, new Date());
                        const tomorrow = this.blockSchedule.getDayInSchedule(form, this.getTomorrowDate());

                        if (!(today || tomorrow)) {
                            await interaction.reply("Woho, no lessons today or tomorrow for your form VT" + form + "!")
                            break;
                        }
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
                        await interaction.reply({content: "For which day?", components: [buttons]});
                        break;
                    }
                }
            } else if (interaction.isButton()) {
                switch (interaction["customId"]) {
                    case "getlessonstart_today": {
                        try {
                            await interaction.deferUpdate();
                            await interaction.editReply({
                                content: this.parser.getFirstLesson(new Date(), this.getFormFromId(id)),
                                components: []
                            });
                        } catch (e) {
                            console.error(e);
                        }
                        break;
                    }
                    case "getlessonstart_tomorrow": {
                        try {
                            await interaction.deferUpdate();
                            await interaction.editReply({
                                content: this.parser.getFirstLesson(this.getTomorrowDate(), this.getFormFromId(id)),
                                components: []
                            });
                        } catch (e) {
                            console.error(e);
                        }
                        break;
                    }
                }
            }
        });

        process.once('SIGINT', () => client.destroy());
        process.once('SIGTERM', () => client.destroy());

        await client.login(TOKEN);
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

    async notifyDaily() {
        for (const id in db) {
            if (db[id]["authed"]) {
                const form = db[id]["form"];
                const destination = db[id]["channel"]?await client.channels.fetch(id):await client.users.fetch(id);
                if (this.blockSchedule.getDayInSchedule(form, this.getTomorrowDate())) {
                    await destination.send("Tomorrow, your lessons will start at " + this.parser.getFirstLesson(this.getTomorrowDate(), form));
                }
            }
        }
    }

}