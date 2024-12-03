const { bot } = require("../config/telegram");
const User = require("../models/User");
const i18n = require("../utils/i18n"); // Import i18n for translations

const sendOnboardingMaterials = async (chatId) => {
  try {
    // Use the correct file path (ensure the files are in the correct directory)
    const documentPath = __dirname + "/../assets/Yopiq masterclass Haqida batafsil.pdf"; // Absolute path
    const videoPath = __dirname + "/../assets/b.mp4"; // Absolute path

    await bot.sendDocument(chatId, documentPath, {
      caption: i18n.__("masterclass_pdf_caption")
    });

    await bot.sendVideo(chatId, videoPath, {
      caption: i18n.__("masterclass_video_caption"),
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: i18n.__("register_masterclass"),
              callback_data: "register_masterclass",
            },
          ],
        ],
      },
    });
  } catch (error) {
    console.error("Error sending onboarding materials:", error);
    bot.sendMessage(
      chatId,
      "An error occurred while sending onboarding materials. Please try again later."
    );
  }
};

const handleRegisterMasterclass = async (chatId) => {
  await bot.sendMessage(
    chatId,
    i18n.__("phone_number_prompt"),
    {
      reply_markup: {
        keyboard: [
          [{ text: i18n.__("share_phone_number_button"), request_contact: true }],
        ],
        resize_keyboard: true,
        one_time_keyboard: true,
      },
    }
  );
};

module.exports = { sendOnboardingMaterials, handleRegisterMasterclass };
