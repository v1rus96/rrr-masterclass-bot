const TelegramBot = require("node-telegram-bot-api");
const mongoose = require("mongoose");
const express = require("express");
const User = require("./models/User"); // Import the User model
const connectDB = require("./config/db"); // Connect to MongoDB
require("dotenv").config();

const BOT_TOKEN = process.env.BOT_TOKEN;
const bot = new TelegramBot(BOT_TOKEN);

connectDB().then(() => {
  console.log("MongoDB connected successfully");
}).catch((error) => {
  console.error("Error connecting to MongoDB:", error.message);
  process.exit(1); // Exit the process if DB connection fails
});

const webhookURL = `https://rrr-masterclass-bot.onrender.com/${BOT_TOKEN}`;
bot.setWebHook(webhookURL).then(() => {
  console.log(`Webhook set successfully to ${webhookURL}`);
}).catch((error) => {
  console.error("Error setting webhook:", error.message);
});

// Express setup
const app = express();
const PORT = process.env.PORT || 80;

app.use(express.json()); // Parse JSON request body

// Webhook endpoint
app.post(`/${BOT_TOKEN}`, (req, res) => {
  console.log("Received update:", req.body); // Log the incoming update
  bot.processUpdate(req.body); // Pass updates to the bot
  res.sendStatus(200); // Respond with 200 to confirm receipt
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// When user starts the bot
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  const userInfo = msg.from;

  // Check if user exists in the database
  let user = await User.findOne({ userId: userInfo.id });
  if (!user) {
    // Create a new user if not found
    user = new User({
      userId: userInfo.id,
      username: userInfo.username,
      firstName: userInfo.first_name,
      lastName: userInfo.last_name,
      languageCode: userInfo.language_code,
      onboarding: false,
      points: 0,
      phoneNumber: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await user.save();
  }

  try {
    // Send the PDF file
    bot.sendDocument(chatId, "Ochiq masterclass Haqida batafsil.pdf", {
      caption: "🤑 Masterklass haqida ko'proq bilishni xohlaysizmi unda bu PDF siz uchun❗",
    });

    // Send the video with a "Register for Masterclass" button
    bot.sendVideo(chatId, "a.mp4", {
      caption: `
💸 Siz ham shunday atomsferadan bahramand bo'lishingiz mumkin va eng kerkali bilimlarga ega bo'lasiz! 👇
      `,
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [{ text: "Ro'yxatdan o'tish", callback_data: "register_masterclass" }],
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
});

// Handle the "Register for Masterclass" button
bot.on("callback_query", async (callbackQuery) => {
  const chatId = callbackQuery.message.chat.id;
  const userId = callbackQuery.from.id;

  if (callbackQuery.data === "register_masterclass") {
    bot.sendMessage(
      chatId,
      "📱 Iltimos, Master-klassga ro'yxatdan o'tishni yakunlash uchun telefon raqamingizni baham ko'ring.",
      {
        reply_markup: {
          keyboard: [
            [
              {
                text: "Telefon Raqamini Ulashing",
                request_contact: true, // Button to request the user's phone number
              },
            ],
          ],
          resize_keyboard: true,
          one_time_keyboard: true,
        },
      }
    );
  }
});

// Handle phone number sharing
bot.on("contact", async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const phoneNumber = msg.contact.phone_number;

  if (msg.contact.user_id !== userId) {
    bot.sendMessage(chatId, "⚠️ Iltimos, o'z telefon raqamingizni baham ko'ring.");
    return;
  }

  try {
    const user = await User.findOneAndUpdate(
      { userId: userId },
      { phoneNumber: phoneNumber, updatedAt: new Date() },
      { new: true }
    );

    if (user) {
      bot.sendMessage(chatId, "✅ Ro'yxatdan o'tganingiz uchun tashakkur! Sizning telefon raqamingiz saqlandi.", {
        reply_markup: {
          remove_keyboard: true,
        },
      });
    } else {
      bot.sendMessage(
        chatId,
        "⚠️ Telefon raqamingizni saqlashda xatolik yuz berdi. Iltimos, qayta urinib ko'ring."
      );
    }
  } catch (error) {
    console.error("Error saving phone number:", error);
    bot.sendMessage(
      chatId,
      "⚠️ Telefon raqamingizni saqlashda xatolik yuz berdi. Iltimos, qayta urinib ko'ring."
    );
  }
});
