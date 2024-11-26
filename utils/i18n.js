const i18n = require("i18n");

i18n.configure({
  locales: ["en", "uz", "ru"],  // Add your supported languages here
  directory: __dirname + "/locales",         // Directory to store your language files
  defaultLocale: "uz",                       // Default language
  objectNotation: true,                      // Support for nested keys
});

module.exports = i18n;
