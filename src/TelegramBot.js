const {Telegraf} = require("telegraf");
const fs = require("fs");

const TOKEN = require("../Credentials").TELEGRAM_TOKEN;
const ADMIN_IDS = require("../Credentials").TELEGRAM_ADMINS;
let authorizedUsers = JSON.parse(fs.readFileSync("./src/authorized_tg_users.json").toString());

module.exports = class TelegramBot {
    constructor() {
        const bot = new Telegraf(TOKEN);

        bot.command("ping", (ctx) => ctx.reply("Pong! Hey, " + ctx.message.chat.id));
        bot.command("authorize", (ctx => {
            let id = ctx.message.chat.id.toString();
            if (!this.isAuthorized(id)) {
                ctx.reply("I'll need your name and which form you are in, please.\n" +
                    "This information will be forwarded to an admin; I will notify you once your account has been added to the whitelist.");
                // ToDo
            } else {
                ctx.reply("You are already authorized.")
            }
        }))
        bot.help((ctx) => {
            if (!this.isAuthorized(ctx.message.chat.id.toString())) {
                ctx.reply("You're not yet on the whitelist." +
                    "Have you /authorize (d) yet?");
            }

        });

        bot.launch();

        // Enable graceful stop
        process.once('SIGINT', () => bot.stop('SIGINT'));
        process.once('SIGTERM', () => bot.stop('SIGTERM'));
    }

    isAuthorized(id) {
        return !!ADMIN_IDS.indexOf(id) || !!authorizedUsers.indexOf(id);
    }
};
