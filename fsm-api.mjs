// FSM Visualizer API Server
import express from "express";
import { readFileSync, existsSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = 3001;

// Enable CORS
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  next();
});

// Serve static files
app.use("/workspace", express.static(join(__dirname, "workspace")));

// Get list of HTML files
app.get("/api/html-files", (req, res) => {
  try {
    const htmlDir = join(__dirname, "workspace", "vlm-test", "html");
    if (!existsSync(htmlDir)) {
      return res.status(404).json({ error: "HTML directory not found" });
    }

    const files = readdirSync(htmlDir)
      .filter((file) => file.endsWith(".html"))
      .sort();

    res.json(files);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get FSM data from HTML file
app.get("/api/fsm-data/:filename", (req, res) => {
  try {
    const filename = req.params.filename;
    const htmlPath = join(__dirname, "workspace", "vlm-test", "html", filename);

    if (!existsSync(htmlPath)) {
      return res.status(404).json({ error: "HTML file not found" });
    }

    const htmlContent = readFileSync(htmlPath, "utf-8");

    // Extract FSM data from script tag
    const fsmMatch = htmlContent.match(
      /<script[^>]*type=['"]application\/json['"][^>]*>([\s\S]*?)<\/script>/
    );

    if (!fsmMatch) {
      return res.status(404).json({ error: "FSM data not found in HTML file" });
    }

    const fsmData = JSON.parse(fsmMatch[1]);
    res.json(fsmData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get screenshots for a file
app.get("/api/screenshots/:filename", (req, res) => {
  try {
    const filename = req.params.filename.replace(".html", "");
    const screenshotDir = join(
      __dirname,
      "workspace",
      "vlm-test",
      "visuals",
      filename
    );

    if (!existsSync(screenshotDir)) {
      return res.json([]);
    }

    const screenshots = readdirSync(screenshotDir)
      .filter((file) => file.endsWith(".png"))
      .sort()
      .map((file) => ({
        filename: file,
        url: `/workspace/vlm-test/visuals/${filename}/${file}`,
        state: extractStateFromFilename(file),
      }));

    res.json(screenshots);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Helper function to extract state from filename
function extractStateFromFilename(filename) {
  // Extract state from patterns like "01_idle_initial.png" or "02_validating_input_valid.png"
  const patterns = [
    /\d+_([a-z_]+)_.*\.png$/,
    /([a-z_]+)_[a-z_]+\.png$/,
    /\d+_([a-z_]+)\.png$/,
  ];

  for (const pattern of patterns) {
    const match = filename.match(pattern);
    if (match) {
      return match[1];
    }
  }

  return "unknown";
}

app.listen(PORT, () => {
  console.log(
    `🚀 FSM Visualizer API server running on http://localhost:${PORT}`
  );
  console.log(`📁 HTML files: http://localhost:${PORT}/api/html-files`);
  console.log(`🔄 FSM data: http://localhost:${PORT}/api/fsm-data/{filename}`);
  console.log(
    `📷 Screenshots: http://localhost:${PORT}/api/screenshots/{filename}`
  );
});
