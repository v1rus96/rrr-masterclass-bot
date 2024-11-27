const { supabase } = require("../config/db");

// Create a new user if not already exists
const createUserIfNotExist = async (userInfo) => {
  try {
    // Check if the user exists
    const { data: existingUser, error: findError } = await supabase
      .from("users")
      .select("*")
      .eq("user_id", userInfo.id)
      .single();

    if (findError && findError.code !== "PGRST116") { // Ignore "No rows found" error
      throw new Error("Error fetching user");
    }

    // If user does not exist, create it
    if (!existingUser) {
      const { data: newUser, error: insertError } = await supabase.from("users").insert([
        {
          user_id: userInfo.id,
          username: userInfo.username,
          first_name: userInfo.first_name,
          last_name: userInfo.last_name,
          language_code: userInfo.language_code,
          onboarding: false,
          phone_number: null,
          created_at: new Date(),
          updated_at: new Date(),
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
      .eq("user_id", userId)
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
