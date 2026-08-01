import mongoose from "mongoose";
import dotenv from "dotenv";
import Redirect from "../model/redirect.model.js";

dotenv.config();

const checkRedirect = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MongoDBURI);
    console.log("Connected to MongoDB");

    // Find all redirects that might match /demo-data-science-ai-programme
    const redirects = await Redirect.find({
      $or: [
        { sourceUrl: "/demo-data-science-ai-programme" },
        { sourceUrl: "demo-data-science-ai-programme" },
        { sourceUrl: /demo-data-science/i }
      ]
    });
    
    console.log(`Found ${redirects.length} redirects matching demo-data-science:`);
    console.log(JSON.stringify(redirects, null, 2));

    // Also check all redirects to see if any might conflict
    const allRedirects = await Redirect.find({});
    console.log(`\nTotal redirects in database: ${allRedirects.length}`);
    
    process.exit(0);
  } catch (error) {
    console.error("Error checking redirects:", error);
    process.exit(1);
  }
};

checkRedirect();