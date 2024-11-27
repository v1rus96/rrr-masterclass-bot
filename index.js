const express = require("express");
const { connectDB } = require("./config/db");
const { setWebhook, bot } = require("./config/telegram");
const logger = require("./utils/logger");  // Import the logger module
require("./bot");  // Import the bot module

const app = express();
const PORT = process.env.PORT || 80;

connectDB();
setWebhook(`https://rrr-masterclass-bot.onrender.com/${process.env.BOT_TOKEN}`);

app.use(express.json()); // Parse JSON request body

// Webhook endpoint
app.post(`/${process.env.BOT_TOKEN}`, (req, res) => {
  console.log("Received update:", req.body);
  try {
    bot.processUpdate(req.body);  // Process incoming update
    res.sendStatus(200); // Respond with 200 to confirm receipt
  } catch (error) {
    logger.error(`Error processing update: ${error.message}`);  // Log error
    res.sendStatus(500);  // Respond with 500 if there's an error
  }
});
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
