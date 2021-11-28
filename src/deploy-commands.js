const { SlashCommandBuilder } = require('@discordjs/builders');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
let { DISCORD_CLIENT, DISCORD_SERVER, DISCORD_TOKEN } = require("../Credentials");

const addFormChoices = (opt =>
    opt
        .addChoice("VT111", "111") //ToDo automate from classes list maybe?
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
        .addChoice("None", "noform"));

const commands = [
    // new SlashCommandBuilder().setName("ping").setDescription("Replies with pong!"),
    new SlashCommandBuilder()
        .setName("auth")
        .setDescription("Please provide me with the credentials for DSBMobile")
        .addStringOption(opt =>
            opt.setName("username")
                .setDescription("The username for DSBMobile")
                .setRequired(true))
        .addStringOption(opt =>
            opt.setName("password")
                .setDescription("The password for DSBMobile")
                .setRequired(true))
        .addStringOption(opt =>
            addFormChoices(opt.setName("form")
                .setRequired(false)
                .setDescription("Optionally, you can select your form right away in the same go."))),
    new SlashCommandBuilder()
        .setName("setform")
        .setDescription("Define which form you want to get the schedule of.")
        .addStringOption(opt =>
                addFormChoices(opt.setName("form")
                    .setDescription("Select the form you want to receive notifications about.")
                    .setRequired(true))
        ),
    new SlashCommandBuilder().setName("getschedule").setDescription("You'll be happily provided with an image of the present schedule " +
        "and an URL to it as well."),
    new SlashCommandBuilder().setName("getlessonstart").setDescription("Ask me when the lessons start."),
    new SlashCommandBuilder().setName("messageme").setDescription("Activate DMs."), //ToDo maybe use subcommands, toggle messages in the evening (cfg. time) and on point etc.
    new SlashCommandBuilder().setName("reminder").setDescription("I will send you an reminder before or after lesson start, just as you want.")
        .addIntegerOption(opt =>
            opt.setName("time")
                .setDescription("Specify the time before lesson start in minutes at which I should message you.")
                .setRequired(true)
        )
]
    .map(command => command.toJSON());

// noinspection JSCheckFunctionSignatures,JSClosureCompilerSyntax
const rest = new REST({ version: '9' }).setToken(DISCORD_TOKEN);

rest.put(Routes.applicationGuildCommands(DISCORD_CLIENT, DISCORD_SERVER), { body: commands })
// rest.put(Routes.applicationCommands(DISCORD_CLIENT), { body: commands })
    .then(() => console.log('Successfully registered application commands.'))
    .catch(console.error);