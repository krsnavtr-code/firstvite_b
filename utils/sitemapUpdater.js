import dns from "dns";
import mongoose from "mongoose";
import generateSitemap from "./sitemapGenerator.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Set DNS servers for database connection
if (process.env.NODE_ENV !== "production") {
  dns.setServers(["8.8.8.8", "8.8.4.4"]);
}

/**
 * Updates the sitemap file automatically
 * This function connects to database, generates sitemap, and saves it
 */
export const updateSitemap = async () => {
  try {
    console.log("🔄 Auto-updating sitemap...");
    
    // Database connection
    const URI = process.env.MongoDBURI;
    
    if (!URI) {
      console.warn("⚠️  MongoDBURI not found, skipping sitemap update");
      return false;
    }

    // Connect to database
    await mongoose.connect(URI, {
      serverSelectionTimeoutMS: 30000,
    });

    // Generate sitemap
    const baseUrl = process.env.BASE_URL || "https://www.eklabya.com";
    const sitemap = await generateSitemap(baseUrl);

    // Close database connection
    await mongoose.connection.close();

    // Save to client/public directory
    const outputPath = path.join(__dirname, "../../client/public/sitemap.xml");

    // Ensure directory exists
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Write sitemap file
    fs.writeFileSync(outputPath, sitemap, "utf8");

    // Show stats
    const urlCount = (sitemap.match(/<url>/g) || []).length;
    console.log(`✅ Sitemap auto-updated successfully! Total URLs: ${urlCount}`);
    
    return true;
  } catch (error) {
    console.error("❌ Error auto-updating sitemap:", error.message);
    
    // Close database connection if still open
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
    }
    
    return false;
  }
};

/**
 * Async sitemap update (non-blocking)
 * Use this when you don't want to wait for sitemap update to complete
 */
export const updateSitemapAsync = () => {
  // Run asynchronously without blocking the main response
  setImmediate(() => {
    updateSitemap();
  });
};
