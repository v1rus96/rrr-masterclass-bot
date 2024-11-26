const User = require("../models/User");

const createUserIfNotExist = async (userInfo) => {
  let user = await User.findOne({ userId: userInfo.id });
  if (!user) {
    user = new User({
      userId: userInfo.id,
      username: userInfo.username,
      firstName: userInfo.first_name,
      lastName: userInfo.last_name,
      languageCode: userInfo.language_code,
      onboarding: false,
      phoneNumber: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await user.save();
  }
  return user;
};

const updateUserPhoneNumber = async (userId, phoneNumber) => {
  try {
    return await User.findOneAndUpdate(
      { userId: userId },
      { phoneNumber, onboarding: true, updatedAt: new Date() },
      { new: true }
    );
  } catch (error) {
    throw new Error("Error saving phone number");
  }
};

module.exports = { createUserIfNotExist, updateUserPhoneNumber };
