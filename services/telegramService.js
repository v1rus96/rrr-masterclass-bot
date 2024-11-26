const { bot } = require("../config/telegram");
const User = require("../models/User");

const sendOnboardingMaterials = async (chatId) => {
  try {
    // Use the correct file path (ensure the files are in the correct directory)
    const documentPath = __dirname + "/assets/Ochiq masterclass Haqida batafsil.pdf"; // Absolute path
    const videoPath = __dirname + "/assets/a.mp4"; // Absolute path

    await bot.sendDocument(chatId, documentPath, {
      caption:
        "🤑 Masterklass haqida ko'proq bilishni xohlaysizmi unda bu PDF siz uchun❗",
    });

    await bot.sendVideo(chatId, videoPath, {
      caption: `
💸 Siz ham shunday atomsferadan bahramand bo'lishingiz mumkin va eng kerkali bilimlarga ega bo'lasiz! 👇
      `,
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "Ro'yxatdan o'tish",
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
    "📱 Iltimos, Master-klassga ro'yxatdan o'tishni yakunlash uchun telefon raqamingizni baham ko'ring.",
    {
      reply_markup: {
        keyboard: [
          [{ text: "Telefon Raqamini Ulashing", request_contact: true }],
        ],
        resize_keyboard: true,
        one_time_keyboard: true,
      },
    }
  );
};

module.exports = { sendOnboardingMaterials, handleRegisterMasterclass };
