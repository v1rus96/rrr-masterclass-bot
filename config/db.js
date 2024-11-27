const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL, // Your Supabase URL
  process.env.SUPABASE_ANON_KEY // Your Supabase Anon/Public Key
);

const connectDB = async () => {
  try {
    // Test connection by fetching a simple query (optional)
    const { error } = await supabase.from("users").select("*").limit(1);
    if (error) {
      throw error;
    }
    console.log("Connected to Supabase successfully");
  } catch (error) {
    console.error("Error connecting to Supabase:", error.message);
    process.exit(1);
  }
};

module.exports = { supabase, connectDB };
