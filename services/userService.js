const { supabase } = require("../config/db");

// Create a new user if not already exists
const createUserIfNotExist = async (userInfo) => {
  try {
    // Check if the user exists
    const { data: existingUser, error: findError } = await supabase
      .from("users")
      .select("*")
      .eq("userid", userInfo.id)
      .single();

    if (findError && findError.code !== "PGRST116") { // Ignore "No rows found" error
      throw new Error("Error fetching user");
    }

    // If user does not exist, create it
    if (!existingUser) {
      const { data: newUser, error: insertError } = await supabase.from("users").insert([
        {
          userid: userInfo.id,
          username: userInfo.username,
          firstname: userInfo.first_name,
          lastname: userInfo.last_name,
          languagecode: userInfo.language_code,
          onboarding: false,
          phonenumber: null,
          createdat: new Date(),
          updatedat: new Date(),
        },
      ]).single();

      if (insertError) {
        throw new Error("Error creating user");
      }
      return newUser;
    }

    return existingUser;
  } catch (error) {
    console.error("Error in createUserIfNotExist:", error.message);
    throw error;
  }
};

// Update user's phone number
const updateUserPhoneNumber = async (userId, phoneNumber) => {
  try {
    const { data: updatedUser, error: updateError } = await supabase
      .from("users")
      .update({ phone_number: phoneNumber, onboarding: true, updated_at: new Date() })
      .eq("userid", userId)
      .single();

    if (updateError) {
      throw new Error("Error updating phone number");
    }

    return updatedUser;
  } catch (error) {
    console.error("Error in updateUserPhoneNumber:", error.message);
    throw error;
  }
};

module.exports = { createUserIfNotExist, updateUserPhoneNumber };
