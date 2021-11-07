const { SlashCommandBuilder } = require('@discordjs/builders');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
let CLIENT = require("../Credentials").DISCORD_CLIENT;
let SERVER = require("../Credentials").DISCORD_SERVER;
let TOKEN = require("../Credentials").DISCORD_TOKEN;

const commands = [
    // new SlashCommandBuilder().setName("ping").setDescription("Replies with pong!"),
    new SlashCommandBuilder()
        .setName("setform")
        .setDescription("Define which form you want to get the schedule of.")
        .addStringOption(opt =>
            opt.setName("form")
                .setDescription("Select the form you want to receive notifications about.")
                .setRequired(true)
                .addChoice("VT111", "111")
                .addChoice("VT121", "121")
                .addChoice("VT131", "131")
                .addChoice("VT132", "132")
                .addChoice("VT211", "211")
                .addChoice("VT221", "221")
                .addChoice("VT222", "222")
                .addChoice("VT232", "232")
                .addChoice("VT311", "311")
                .addChoice("VT312", "312")
                .addChoice("VT321", "321")
                .addChoice("VT322", "322")
                .addChoice("VT331", "331")
        ),
    new SlashCommandBuilder().setName("getschedule").setDescription("You'll be happily provided with an image of the present schedule " +
        "and an URL to it as well."),
    new SlashCommandBuilder().setName("getlessonstart").setDescription("Ask me when the lessons start."),
    // new SlashCommandBuilder().setName("togglecallme").setDescription("I will call you ")
]
    .map(command => command.toJSON());

const rest = new REST({ version: '9' }).setToken(TOKEN);

rest.put(Routes.applicationGuildCommands(CLIENT, SERVER), { body: commands })
    .then(() => console.log('Successfully registered application commands.'))
    .catch(console.error);