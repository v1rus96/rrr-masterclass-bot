const TelegramBot = require("node-telegram-bot-api");

const BOT_TOKEN = process.env.BOT_TOKEN;
const bot = new TelegramBot(BOT_TOKEN);

const setWebhook = (url) => {
  return bot.setWebHook(url).then(() => {
    console.log(`Webhook set successfully to ${url}`);
  }).catch((error) => {
    console.error("Error setting webhook:", error.message);
  });
};

module.exports = { bot, setWebhook };
