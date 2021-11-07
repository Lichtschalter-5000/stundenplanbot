const {Client, Intents, MessageEmbed, MessageActionRow, MessageButton} = require("discord.js");
const fs = require("fs");

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

            if (interaction.isCommand()) {
                switch (interaction["commandName"]) {
                    case "ping": {
                        await interaction.reply("Pong!");
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
                        let id = interaction.inGuild()?interaction.channelId:interaction.user.id;
                        if (db.hasOwnProperty(id)) {
                            db[id]["form"] = form;
                        } else {
                            db[id] = {"form": form, "channel": interaction.inGuild()};
                        }
                        this.updatedb();
                        break;
                    case "getlessonstart": {
                        const form = this.getFormFromInteraction(interaction);
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
                                content: this.parser.getFirstLesson(new Date(), this.getFormFromInteraction(interaction)),
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
                                content: this.parser.getFirstLesson(this.getTomorrowDate(), this.getFormFromInteraction(interaction)),
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

    getFormFromInteraction(interaction) {
        const id = interaction.inGuild()?interaction.channelId:interaction.user.id;
        return db.hasOwnProperty(id)?db[id]["form"]:null;
    }

    getTomorrowDate() {
        let tomorrowDate = new Date();
        tomorrowDate.setDate(new Date().getDate() + 1);
        return tomorrowDate;
    }

    async notifyDaily() {
        for (const id in db) {
            const form = db[id]["form"];
            const destination = db[id]["channel"]?await client.channels.fetch(id):await client.users.fetch(id);
            if(this.blockSchedule.getDayInSchedule(form,this.getTomorrowDate())) {
                await destination.send("Tomorrow, your lessons will start at " + this.parser.getFirstLesson(this.getTomorrowDate(), form));
            }
        }
    }

}