#!/usr/bin/env node

import { exec } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log("🔄 Triggering manual client build for sitemap update...");

// Use different client paths based on environment
let clientPath;

if (process.env.NODE_ENV === "production") {
  // Production VPS structure: /root/firstvite-client/
  clientPath = "/root/firstvite-client";
  console.log("🌐 Using production client path:", clientPath);
} else {
  // Development structure: ../../client/
  clientPath = path.join(__dirname, "../../client");
  console.log("💻 Using development client path:", clientPath);
}

exec(`cd "${clientPath}" && npm run build`, (error, stdout, stderr) => {
  if (error) {
    console.error("❌ Client build failed:", error.message);
    process.exit(1);
  }

  console.log("✅ Client build completed successfully!");
  console.log(
    "📁 Updated sitemap is now available in client/public/sitemap.xml",
  );
  console.log(
    "🌐 You can now deploy the client/build directory to your web server",
  );

  if (stderr) {
    console.warn("Build warnings:", stderr);
  }

  process.exit(0);
});
