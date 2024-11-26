const { createUserIfNotExist, updateUserPhoneNumber } = require("../services/userService");

const handleUserStart = async (msg) => {
  const chatId = msg.chat.id;
  const userInfo = msg.from;

  let user = await createUserIfNotExist(userInfo);

  return user;
};

const handlePhoneNumberShare = async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const phoneNumber = msg.contact.phone_number;

  return updateUserPhoneNumber(userId, phoneNumber);
};

module.exports = { handleUserStart, handlePhoneNumberShare };
