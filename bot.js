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
                        `📞 Phone: +${user.phoneNumber}`, // Show name and phone number
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
  
  bot.on("callback_query", async (callbackQuery) => {
    const { data, from, inline_message_id } = callbackQuery;
    const userId = from.id; // Get the user who initiated the callback query
  
    // Extract the action (call_phone_number) and phone number from the callback data
    const [action, phoneNumber] = data.split(":");
  
    if (action === "call_phone_number") {
      // Direct the user to call the phone number by opening the dialer
      const phoneLink = `tel:+${phoneNumber}`; // Create a link to initiate the call
  
      // Send the link to the user, telling them to click to call
      await bot.sendMessage(userId, `${i18n.__("phone_number_prompt")} ${phoneNumber}\n\n` +
                                    `Click [here](${phoneLink}) to dial the number.`, { parse_mode: "Markdown" });
    }
  });
  
  // Handle /pay command to start the payment process
  bot.onText(/pay/i, function (message) {
    var iKeys = [];
    // Define the inline keyboard with amounts for the user to choose from
    iKeys.push([{
      text: "10000 UZS",
      callback_data: "pay:10000"
    },{
      text: "20000 UZS",
      callback_data: "pay:20000"
    }]);
  
    // Send the payment options as inline buttons
    bot.sendMessage(message.chat.id, "Select an amount to pay", {
      parse_mode: 'HTML',
      disable_web_page_preview: true,
      reply_markup: {
        inline_keyboard: iKeys
      }
    });
  });
  
  // Handle callback queries for payment
  bot.on('callback_query', function (message) {
    const text = message.data;
    const func = text.split(":")[0]; // The action (pay)
    const param = text.split(":")[1]; // The amount (e.g., 2.00)
  
    if (func === "pay") {
      const player_id = message.from.id; // You can use the user ID to associate with the payment
      const payload = player_id + Date.now() + param; // Unique payload (you can modify this for your needs)
      
      // Define the price and currency
      const prices = [{
        label: "Donation",
        amount: parseInt(param) * 100
      }];
  
      // The provider token needs to be replaced with your actual CLICK Uzbekistan provider token
      const providerToken = "398062629:TEST:999999999_F91D8F69C042267444B74CC0B3C747757EB0E065"; // Replace with your provider token from CLICK Uzbekistan
  
      // Send the invoice to the user
      bot.sendInvoice(message.from.id, "Donation", `Donation of ${param}€`, payload, providerToken, "UZS", prices)
        .then(() => {
          // Optionally log or save the payment details to your database (e.g., user, amount, payload)
          console.log(`Payment request sent for ${param}€ to user ${message.from.id}`);
        })
        .catch((error) => {
          console.error("Error sending invoice:", error);
          bot.sendMessage(message.from.id, "There was an error while processing your payment. Please try again later.");
        });
    }
  });
  
  // Handle successful payment verification
  bot.on('message', function (message) {
    if (message.successful_payment !== undefined) {
      const savedPayload = "yyy"; // Retrieve this from your database (the payload you saved earlier)
      const savedStatus = "WAIT"; // Retrieve this from your database (the payment status, should be "WAIT" before payment completion)
  
      // Ensure the payload matches and the status is correct before processing
      if ((savedPayload !== message.successful_payment.invoice_payload) || (savedStatus !== "WAIT")) {
        bot.sendMessage(message.chat.id, "Payment verification failed. Please check your transaction and try again.");
        return;
      }
  
      // Payment was successful
      bot.sendMessage(message.chat.id, `Payment of ${message.successful_payment.total_amount / 100} EUR completed successfully! Thank you!`);
      
      // You can update the status in the database to "COMPLETED" or similar after verifying the payment
      // Optionally, save the transaction details (e.g., date, user ID, amount) in your database for records
    }
  });
  

// Log any uncaught exceptions
process.on("uncaughtException", (error) => {
  logger.error(`Uncaught Exception: ${error.message}`);
});

process.on("unhandledRejection", (reason, promise) => {
  logger.error(`Unhandled Rejection: ${reason}`);
});
