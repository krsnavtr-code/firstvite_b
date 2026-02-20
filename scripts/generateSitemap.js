import dotenv from "dotenv";
import mongoose from "mongoose";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import generateSitemap from "../utils/sitemapGenerator.js";

// Get directory name in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

const main = async () => {
  try {
    console.log("🚀 Starting sitemap generation...");

    // Database connection
    const URI = process.env.MongoDBURI;
    let sitemap;

    if (URI) {
      try {
        console.log("📡 Connecting to database...");
        await mongoose.connect(URI, {
          serverSelectionTimeoutMS: 5000,
        });

        console.log("✅ Successfully connected to MongoDB");

        // Generate sitemap with database data
        const baseUrl = process.env.BASE_URL || "https://eklabya.com";
        console.log(`🗺️  Generating sitemap for: ${baseUrl}`);

        sitemap = await generateSitemap(baseUrl);

        // Close database connection
        await mongoose.connection.close();
        console.log("🔌 Database connection closed");
      } catch (dbError) {
        console.warn(
          "⚠️  Database connection failed, using fallback mode:",
          dbError.message,
        );

        // Generate basic sitemap without database data
        const baseUrl = process.env.BASE_URL || "https://eklabya.com";
        sitemap = await generateSitemap(baseUrl, true); // true = fallback mode

        if (mongoose.connection.readyState === 1) {
          await mongoose.connection.close();
        }
      }
    } else {
      console.warn("⚠️  MongoDBURI not found, using fallback mode");

      // Generate basic sitemap without database data
      const baseUrl = process.env.BASE_URL || "https://eklabya.com";
      sitemap = await generateSitemap(baseUrl, true); // true = fallback mode
    }

    // Save to client/public directory
    const outputPath = path.join(__dirname, "../../client/public/sitemap.xml");

    // Ensure directory exists
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
      console.log(`📁 Created directory: ${outputDir}`);
    }

    // Write sitemap file
    fs.writeFileSync(outputPath, sitemap, "utf8");

    console.log(`✅ Sitemap generated successfully!`);
    console.log(`📍 Saved to: ${outputPath}`);

    // Show stats
    const urlCount = (sitemap.match(/<url>/g) || []).length;
    console.log(`📊 Total URLs in sitemap: ${urlCount}`);

    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      console.log("🔌 Database connection closed");
    }

    process.exit(0);
  } catch (error) {
    console.error("❌ Error generating sitemap:", error.message);

    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
    }

    process.exit(1);
  }
};

// Handle unhandled promise rejections
process.on("unhandledRejection", (err) => {
  console.error("❌ UNHANDLED REJECTION:", err);
  process.exit(1);
});

// Run the script
main();
