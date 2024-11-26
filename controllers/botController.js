const i18n = require("../utils/i18n");
const logger = require("../utils/logger");
const { sendOnboardingMaterials, handleRegisterMasterclass } = require("../services/telegramService");
const { handleUserStart, handlePhoneNumberShare } = require("./userController");
const { bot } = require("../config/telegram");

// Set the user's language for i18n based on their Telegram language code
const setUserLanguage = (userLanguageCode) => {
  switch (userLanguageCode) {
    case "ru":
      i18n.setLocale("ru");
      break;
    case "uz":
      i18n.setLocale("uz");
      break;
    default:
      i18n.setLocale("en");
      break;
  }
  console.log(`User language set to: ${i18n.getLocale()}`);
};

const onStart = async (msg) => {
  const chatId = msg.chat.id;
  const userInfo = msg.from;
  
  // Set the user's language
  setUserLanguage(userInfo.language_code);
  
  try {
    await handleUserStart(msg);
    await sendOnboardingMaterials(chatId);
  } catch (error) {
    logger.error(`Error in onStart: ${error.message}`);
    bot.sendMessage(chatId, i18n.__("error"));
  }
};

const onCallbackQuery = async (callbackQuery) => {
  const chatId = callbackQuery.message.chat.id;
  if (callbackQuery.data === "register_masterclass") {
    try {
      await handleRegisterMasterclass(chatId);
    } catch (error) {
      logger.error(`Error in onCallbackQuery: ${error.message}`);
    }
  }
};

const onContact = async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  try {
    await handlePhoneNumberShare(msg);
    // Check the value of i18n.__("registration_success")
    const registrationSuccessMessage = i18n.__("registration_success");
    console.log("Registration Success Message:", registrationSuccessMessage); // Log the message

    bot.sendMessage(chatId, registrationSuccessMessage);
  } catch (error) {
    logger.error(`Error in onContact: ${error.message}`);
    bot.sendMessage(chatId, i18n.__("error"));
  }
};

module.exports = { onStart, onCallbackQuery, onContact };
