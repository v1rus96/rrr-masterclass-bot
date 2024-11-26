const { bot } = require("./config/telegram");
const { onStart, onCallbackQuery, onContact } = require("./controllers/botController");
const User = require("./models/User"); // Import your User model
const i18n = require("./utils/i18n"); // Import i18n for localization
const logger = require("./utils/logger"); // Import logger

// When user starts the bot
bot.onText(/\/start/, onStart);

// Handle the callback query (button presses)
bot.on("callback_query", onCallbackQuery);

// Handle phone number sharing
bot.on("contact", onContact);

// Handle Inline Queries for /search command
bot.on("inline_query", async (query) => {
  const { id, query: searchText } = query; // Extract the inline query data

  // Check if the query starts with the '/search' command
  if (searchText.startsWith("find")) {
    //remove find from the search text
    const searchTerm = searchText.slice(5).trim();

    // If there's no search term, notify the user
    if (!searchTerm) {
      return bot.answerInlineQuery(id, [{
        type: "article",
        id: "no_search_term",
        title: "No search term provided",
        input_message_content: {
          message_text: i18n.__("error") // Inform user to provide a search term
        }
      }]);
    }

    // Search for registered users based on the search text (e.g., username, phone number)
    const users = await User.find({
        $or: [
          { username: { $regex: searchTerm, $options: "i" } },
          { phoneNumber: { $regex: searchTerm, $options: "i" } }
        ],
      }).limit(10); // Limit results to 10 users (you can adjust this limit)
  
      // Create the results for the inline query
      const results = users.map((user) => ({
        type: "article", // Type of result (article for each user)
        id: user.userId.toString(), // Unique ID for the article
        title: `${user.firstName} ${user.lastName}`, // Display name
        input_message_content: {
          message_text: `${i18n.__("registration_success")}\n\n` +
                        `👤 Name: ${user.firstName} ${user.lastName}\n` +
                        `📞 Phone: ${user.phoneNumber}`, // Show name and phone number
        },
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: i18n.__("share_phone_number_button"), // Button text for sharing phone number
                callback_data: `call_phone_number:${user.phoneNumber}`, // Callback to initiate the phone call
              },
            ],
          ],
        },
      }));
  
      // Send the results to the user as an inline query response
      bot.answerInlineQuery(id, results);
    } else {
      // Handle other types of inline queries or default behavior
      bot.answerInlineQuery(id, [{
        type: "article",
        id: "invalid_command",
        title: "Invalid command",
        input_message_content: {
          message_text: "Use the command /search followed by the term you want to search for."
        }
      }]);
    }
  });
  
  // Handle Callback Queries (for inline button interactions)
  bot.on("callback_query", async (callbackQuery) => {
    const { data, from } = callbackQuery;
    const chatId = callbackQuery.message.chat.id;
  
    // Extract the action (call_phone_number) and phone number from the callback data
    const [action, phoneNumber] = data.split(":");
  
    if (action === "call_phone_number") {
      // Direct the user to call the phone number by opening the dialer
      const phoneLink = `tel:+${phoneNumber}`; // Create a link to initiate the call
  
      // Send the link to the user, telling them to click to call
      await bot.sendMessage(chatId, `${i18n.__("phone_number_prompt")} ${phoneNumber}\n\n` +
                                    `Click [here](${phoneLink}) to dial the number.`, { parse_mode: "Markdown" });
    }
  });

// Log any uncaught exceptions
process.on("uncaughtException", (error) => {
  logger.error(`Uncaught Exception: ${error.message}`);
});

process.on("unhandledRejection", (reason, promise) => {
  logger.error(`Unhandled Rejection: ${reason}`);
});
