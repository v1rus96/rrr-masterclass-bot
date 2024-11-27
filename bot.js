const { bot } = require("./config/telegram");
const { onStart, onCallbackQuery, onContact } = require("./controllers/botController");
const User = require("./models/User"); // Import your User model
const i18n = require("./utils/i18n"); // Import i18n for localization
const logger = require("./utils/logger"); // Import logger
const Message = require("./models/Message"); // Import the Message model
const ADMIN_CHAT_ID = 140251378; // Replace with the actual admin chat ID
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


  // Handle messages from the admin for drafting
bot.on("message", async (msg) => {
    const chatId = msg.chat.id;
  
    // Only allow the admin to draft broadcast messages
    if (chatId !== ADMIN_CHAT_ID) {
      // bot.sendMessage(
      //   chatId,
      //   "You are not authorized to send broadcast messages."
      // );
      return;
    }
  
    try {
      // Delete any existing draft message
      await Message.deleteMany();
  
      // Save the new draft message
      const newDraft = new Message({
        text: msg.caption || msg.text || null,
        mediaId: msg.photo
          ? msg.photo[msg.photo.length - 1].file_id
          : msg.video
          ? msg.video.file_id
          : null,
        mediaType: msg.photo ? "photo" : msg.video ? "video" : null,
      });
  
      await newDraft.save();
  
      // Send draft confirmation to the admin with "Broadcast" button
      bot.sendMessage(
        chatId,
        "Message draft saved. Press 'Broadcast' to send it to all users.",
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: "Broadcast", callback_data: "broadcast_message" }],
            ],
          },
        }
      );
    } catch (error) {
      console.error("Error saving draft message:", error);
      bot.sendMessage(
        chatId,
        "An error occurred while saving the draft message. Please try again."
      );
    }
  });
  
  // Handle "Broadcast" button press to send the message to all users
  bot.on("callback_query", async (callbackQuery) => {
    const chatId = callbackQuery.message.chat.id;
  
    if (callbackQuery.data === "broadcast_message" && chatId === ADMIN_CHAT_ID) {
      try {
        // Retrieve the draft message
        const draft = await Message.findOne();
        if (!draft) {
          bot.sendMessage(chatId, "No message draft found.");
          return;
        }
  
        // Retrieve all users from the User model
        const users = await User.find({});
  
        if (users.length === 0) {
          bot.sendMessage(chatId, "No users found to broadcast the message.");
          return;
        }
  
        // Send the draft message to each user in batches
        const batchSize = 50;
        const delay = 1000; // 1-second delay between batches
        for (let i = 0; i < users.length; i += batchSize) {
          const batch = users.slice(i, i + batchSize);
          await Promise.all(
            batch.map(async (user) => {
              try {
                if (draft.mediaType === "photo") {
                  await bot.sendPhoto(user.userId, draft.mediaId, {
                    caption: draft.text,
                  });
                } else if (draft.mediaType === "video") {
                  await bot.sendVideo(user.userId, draft.mediaId, {
                    caption: draft.text,
                  });
                } else {
                  await bot.sendMessage(user.userId, draft.text);
                }
              } catch (error) {
                if (error.response && error.response.statusCode === 403) {
                  console.warn(`User ${user.userId} has blocked the bot.`);
                } else {
                  console.error(
                    `Failed to send message to ${user.userId}:`,
                    error.message
                  );
                }
              }
            })
          );
          // Delay before the next batch
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
  
        bot.sendMessage(chatId, "Broadcast message sent to all users.");
        await Message.deleteMany(); // Clear the draft after broadcasting
      } catch (error) {
        console.error("Error broadcasting message:", error);
        bot.sendMessage(
          chatId,
          "An error occurred while broadcasting the message."
        );
      }
    }
  
    bot.answerCallbackQuery(callbackQuery.id);
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
  
  // General callback query handler
bot.on("callback_query", async (callbackQuery) => {
    const { data } = callbackQuery;
    const [action] = data.split(":");
  
    // Handle "send_payment" callback
    if (action === "send_payment") {
      await handleSendPayment(callbackQuery);
    } else if (action === "pay") {
      await handlePayCallback(callbackQuery);
    } else {
      bot.answerCallbackQuery(callbackQuery.id, {
        text: "Unknown action. Please try again.",
        show_alert: true,
      });
    }
  });
  
  // Function to handle "send_payment" callback
  async function handleSendPayment(callbackQuery) {
    const { data, from } = callbackQuery;
    const [, userId] = data.split(":");
  
    // Define the amount and payload for the invoice
    const amount = 10000; // Example amount in UZS
    const payload = `${userId}_${Date.now()}`; // Unique payload
    const prices = [{ label: "Payment", amount: amount * 100 }]; // Amount in cents
  
    // Replace with your actual provider token
    const providerToken = "398062629:TEST:999999999_F91D8F69C042267444B74CC0B3C747757EB0E065";
  
    try {
      // Send the invoice to the user
      await bot.sendInvoice(
        userId,
        "Payment Request",
        "Please complete the payment.",
        payload,
        providerToken,
        "UZS",
        prices,
        { start_parameter: "payment" }
      );
  
      // Notify the sender that the payment request was sent
      await bot.answerCallbackQuery(callbackQuery.id, {
        text: "Payment request sent successfully!",
      });
    } catch (error) {
      console.error("Error sending invoice:", error);
      bot.answerCallbackQuery(callbackQuery.id, {
        text: "Failed to send the payment request. Please try again.",
        show_alert: true,
      });
    }
  }
  
  // Function to handle "pay" callback
  async function handlePayCallback(callbackQuery) {
    const { data, from } = callbackQuery;
    const [, amount] = data.split(":"); // Extract amount
    const playerId = from.id; // Get user ID
    const payload = `${playerId}_${Date.now()}_${amount}`; // Unique payload
    const prices = [{ label: "Donation", amount: parseInt(amount) * 100 }]; // Amount in cents
  
    // Replace with your actual provider token
    const providerToken = "398062629:TEST:999999999_F91D8F69C042267444B74CC0B3C747757EB0E065";
  
    try {
      // Send the invoice
      await bot.sendInvoice(
        from.id,
        "Donation",
        `Donation of ${amount} UZS`,
        payload,
        providerToken,
        "UZS",
        prices,
        { start_parameter: "donation" }
      );
  
      console.log(`Payment request sent for ${amount} UZS to user ${from.id}`);
    } catch (error) {
      console.error("Error sending invoice:", error);
      bot.sendMessage(from.id, "There was an error processing your payment. Please try again later.");
    }
  }

  bot.on("inline_query", async (query) => {
    const { id, query: searchText } = query;
  
    // Check if the query starts with "payment"
    if (searchText.startsWith("payment")) {
      const searchTerm = searchText.slice(8).trim(); // Extract the username or name
  
      // If no name/username is provided, notify the user
      if (!searchTerm) {
        return bot.answerInlineQuery(id, [
          {
            type: "article",
            id: "no_username",
            title: "No name/username provided",
            input_message_content: {
              message_text: "Please provide a name or username to send the payment request.",
            },
          },
        ]);
      }
  
      // Search for the user by username or name
      const users = await User.find({
        $or: [
          { username: { $regex: searchTerm, $options: "i" } },
          { firstName: { $regex: searchTerm, $options: "i" } },
          { lastName: { $regex: searchTerm, $options: "i" } },
        ],
      }).limit(10); // Limit results to 10 users
  
      // If no user is found, notify the user
      if (users.length === 0) {
        return bot.answerInlineQuery(id, [
          {
            type: "article",
            id: "user_not_found",
            title: "User not found",
            input_message_content: {
              message_text: `No user found with the name or username "${searchTerm}".`,
            },
          },
        ]);
      }
  
      // Create inline query results for found users
      const results = users.map((user) => ({
        type: "article",
        id: user.userId.toString(),
        title: `Request Payment from ${user.firstName} ${user.lastName}`,
        input_message_content: {
          message_text: `You are about to request a payment from ${user.firstName} ${user.lastName}.`,
        },
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "Send Payment Request",
                callback_data: `send_payment:${user.userId}`,
              },
            ],
          ],
        },
      }));
  
      // Send the results to the inline query
      bot.answerInlineQuery(id, results);
    } else {
      // Handle other queries
      bot.answerInlineQuery(id, [
        {
          type: "article",
          id: "invalid_query",
          title: "Invalid query",
          input_message_content: {
            message_text: "Use the command @bot payment followed by the name or username.",
          },
        },
      ]);
    }
  });


  bot.on('pre_checkout_query', (preCheckoutQuery) => {
    const { id, from, currency, total_amount, invoice_payload, shipping_option_id, order_info } = preCheckoutQuery;
  
    // Логика проверки заказа
    const isOrderValid = true; // Здесь должна быть ваша логика проверки заказа
  
    if (isOrderValid) {
      // Отправляем подтверждение
      bot.answerPreCheckoutQuery(id, true)
        .then(() => {
          console.log('Заказ подтвержден');
        })
        .catch((error) => {
          console.error('Ошибка при подтверждении заказа:', error);
        });
    } else {
      // Отправляем ошибку с сообщением
      const errorMessage = 'Ошибка при обработке заказа. Пожалуйста, попробуйте снова.';
      bot.answerPreCheckoutQuery(id, false, errorMessage)
        .then(() => {
          console.log('Заказ отклонен');
        })
        .catch((error) => {
          console.error('Ошибка при отклонении заказа:', error);
        });
    }
  });
  
  // Обработчик успешной оплаты
  bot.on('successful_payment', (msg) => {
    const { chat, successful_payment } = msg;
    const { invoice_payload, currency, total_amount } = successful_payment;
  
    // Логика обработки успешной оплаты
    console.log(`Оплата успешна: ${currency} ${total_amount / 100} (${invoice_payload})`);
  
    // Отправляем сообщение пользователю
    bot.sendMessage(chat.id, 'Спасибо за ваш заказ! Мы скоро свяжемся с вами.');
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
