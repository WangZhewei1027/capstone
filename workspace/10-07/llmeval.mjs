// // llmeval.mjs
// import fs from "fs";
// import path from "path";
// import { JSDOM } from "jsdom";
// import OpenAI from "openai";

// const client = new OpenAI({
//   apiKey: "sk-Vm2l1fKI5EKEqyfSX9wEbg9QvhUlYY9vDhoRiJ4hk9OZG76u",
//   baseURL: "https://turingai.plus/v1/",
// });

// const DATA_PATH = "./data/data.json";

// /**
//  * Extract structural interface features from an HTML file
//  */
// function extractHTMLFeatures(htmlContent) {
//   const dom = new JSDOM(htmlContent);
//   const document = dom.window.document;

//   const buttons = [...document.querySelectorAll("button")].map((b) =>
//     b.textContent.trim()
//   );
//   const sliders = [...document.querySelectorAll('input[type="range"]')].map(
//     (s) => s.id || s.name || "(unnamed slider)"
//   );
//   const inputs = [
//     ...document.querySelectorAll('input:not([type="range"])'),
//   ].map((i) => i.id || i.name || "(unnamed input)");

//   const scripts = [...document.querySelectorAll("script")].map(
//     (s) => s.textContent
//   );
//   const hasCanvas = !!document.querySelector("canvas");
//   const hasSVG = !!document.querySelector("svg");
//   const animationsDetected = scripts.some((t) =>
//     /(requestAnimationFrame|setInterval|setTimeout)/.test(t)
//   );

//   return {
//     title: document.title || "Untitled Visualization",
//     buttons,
//     sliders,
//     inputs,
//     canvasUsed: hasCanvas,
//     svgUsed: hasSVG,
//     animationsDetected,
//   };
// }

// /**
//  * Get concept name from data.json by matching filename
//  */
// function getConceptFromData(fileName, data) {
//   return (
//     data
//       .find((item) => {
//         const userMsg = item.messages?.find((m) => m.role === "user");
//         return (
//           userMsg?.content &&
//           fileName
//             .toLowerCase()
//             .includes(userMsg.content.toLowerCase().replace(/\s+/g, "_"))
//         );
//       })
//       ?.messages?.find((m) => m.role === "user")?.content || null
//   );
// }

// /**
//  * Call the LLM to evaluate conceptual quality
//  */
// async function callLLMEvaluation(concept, structure) {
//   const prompt = `
// You are an expert evaluator of interactive educational visualizations.

// Given the following concept and detected interface structure, evaluate how well the visualization supports learning through interactivity, control, and clarity.

// Concept: "${concept}"

// Detected interface:
// ${JSON.stringify(structure, null, 2)}

// Rate each of the following from 0 (very poor) to 5 (excellent):
// 1. Interactivity richness — diversity and depth of interactive elements.
// 2. User control — ability to adjust parameters, control pacing, or influence outcome.
// 3. Visual clarity — how clear, organized, and interpretable the visualization is.

// Return a JSON object of the form:
// {
//   "interactivity_score": <number>,
//   "user_control_score": <number>,
//   "visual_clarity_score": <number>,
//   "missing_features": [ ... ],
//   "comments": "short summary"
// }
// Only return valid JSON — no explanations.
// `;

//   const response = await client.chat.completions.create({
//     model: "gpt-4o-mini",
//     messages: [{ role: "user", content: prompt }],
//     temperature: 0.2,
//   });

//   const raw = response.choices[0].message.content.trim();
//   try {
//     return JSON.parse(raw);
//   } catch (err) {
//     console.error("⚠️ Could not parse JSON from LLM:", raw);
//     return { error: "Invalid JSON", raw };
//   }
// }

// /**
//  * Main execution
//  */
// async function main() {
//   const htmlPath = process.argv[2];
//   if (!htmlPath) {
//     console.error("❌ Usage: node llmeval.mjs ./html/<file>.html");
//     process.exit(1);
//   }

//   const htmlContent = fs.readFileSync(htmlPath, "utf8");
//   const structure = extractHTMLFeatures(htmlContent);

//   const data = JSON.parse(fs.readFileSync(DATA_PATH, "utf8"));
//   const fileName = path.basename(htmlPath);
//   const concept =
//     getConceptFromData(fileName, data) || fileName.replace(".html", "");

//   console.log(`🔍 Evaluating concept: ${concept} from ${fileName}`);

//   const evalResult = await callLLMEvaluation(concept, structure);

//   console.log("\n📊 LLM Evaluation Result:");
//   console.log(JSON.stringify(evalResult, null, 2));

//   // ---- Write results into data.json ----
//   const target = data.find((item) => {
//     const userMsg = item.messages?.find((m) => m.role === "user");
//     return userMsg?.content?.toLowerCase() === concept.toLowerCase();
//   });

//   if (target) {
//     target.evaluation = evalResult;
//     target.evaluation.timestamp = new Date().toISOString();
//   } else {
//     data.push({
//       id: crypto.randomUUID(),
//       timestamp: new Date().toISOString(),
//       model: "gpt-4o-mini",
//       question: concept,
//       evaluation: evalResult,
//     });
//   }

//   fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
//   console.log("\n✅ Updated data.json with LLM evaluation.");
// }

// main().catch((err) => {
//   console.error("💥 Error:", err);
//   process.exit(1);
// });

// llmeval.mjs
import fs from "fs";
import path from "path";
import { JSDOM } from "jsdom";
import OpenAI from "openai";
import { randomUUID } from "crypto";

const client = new OpenAI({
  apiKey: "sk-Vm2l1fKI5EKEqyfSX9wEbg9QvhUlYY9vDhoRiJ4hk9OZG76u",
  baseURL: "https://turingai.plus/v1/",
});

const DATA_PATH = "./data/data.json";

/**
 * Extract structural interface features from an HTML file
 */
function extractHTMLFeatures(htmlContent) {
  const dom = new JSDOM(htmlContent);
  const document = dom.window.document;

  const buttons = [...document.querySelectorAll("button")].map((b) =>
    b.textContent.trim()
  );
  const sliders = [...document.querySelectorAll('input[type="range"]')].map(
    (s) => s.id || s.name || "(unnamed slider)"
  );
  const inputs = [
    ...document.querySelectorAll('input:not([type="range"])'),
  ].map((i) => i.id || i.name || "(unnamed input)");

  const scripts = [...document.querySelectorAll("script")].map(
    (s) => s.textContent
  );
  const hasCanvas = !!document.querySelector("canvas");
  const hasSVG = !!document.querySelector("svg");
  const animationsDetected = scripts.some((t) =>
    /(requestAnimationFrame|setInterval|setTimeout)/.test(t)
  );

  return {
    title: document.title || "Untitled Visualization",
    buttons,
    sliders,
    inputs,
    canvasUsed: hasCanvas,
    svgUsed: hasSVG,
    animationsDetected,
  };
}

/**
 * Call the LLM to evaluate conceptual quality
 */
async function callLLMEvaluation(concept, structure) {
  const prompt = `
You are an expert evaluator of interactive educational visualizations.

Given the following concept and detected interface structure, evaluate how well the visualization supports learning through interactivity, control, and clarity.

Concept: "${concept}"

Detected interface:
${JSON.stringify(structure, null, 2)}

Rate each of the following from 0 (very poor) to 5 (excellent):
1. Interactivity richness — diversity and depth of interactive elements.
2. User control — ability to adjust parameters, control pacing, or influence outcome.
3. Visual clarity — how clear, organized, and interpretable the visualization is.

Return a JSON object of the form:
{
  "interactivity_score": <number>,
  "user_control_score": <number>,
  "visual_clarity_score": <number>,
  "missing_features": [ ... ],
  "comments": "short summary"
}
Only return valid JSON — no explanations.
`;

  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.2,
  });

  const raw = response.choices[0].message.content.trim();
  try {
    return JSON.parse(raw);
  } catch (err) {
    console.error("⚠️ Could not parse JSON from LLM:", raw);
    return { error: "Invalid JSON", raw };
  }
}

/**
 * Main execution
 */
async function main() {
  const htmlPath = process.argv[2];
  if (!htmlPath) {
    console.error("❌ Usage: node llmeval.mjs ./html/<file>.html");
    process.exit(1);
  }

  const htmlContent = fs.readFileSync(htmlPath, "utf8");
  const structure = extractHTMLFeatures(htmlContent);

  // Get the file ID (filename without extension)
  const fileName = path.basename(htmlPath);
  const fileId = fileName.replace(".html", "");

  console.log(`🔍 Evaluating file: ${fileName} (ID: ${fileId})`);

  // Read and parse data.json
  const data = JSON.parse(fs.readFileSync(DATA_PATH, "utf8"));

  // Find the target entry by ID
  const targetIndex = data.findIndex((item) => item.id === fileId);

  if (targetIndex === -1) {
    console.error(`❌ No entry found in data.json with id: ${fileId}`);
    console.log("Available IDs:", data.map((item) => item.id).slice(0, 5));
    process.exit(1);
  }

  const target = data[targetIndex];
  const concept = target.question || fileName.replace(".html", "");

  console.log(`📚 Concept: ${concept}`);

  // Get LLM evaluation
  const evalResult = await callLLMEvaluation(concept, structure);

  console.log("\n📊 LLM Evaluation Result:");
  console.log(JSON.stringify(evalResult, null, 2));

  // Replace the "score" feature in the target entry
  if (target.evaluation) {
    // If evaluation object exists, replace the score field
    target.evaluation.score = evalResult;
    target.evaluation.timestamp = new Date().toISOString();
  } else {
    // If no evaluation object exists, create one with the score
    target.evaluation = {
      score: evalResult,
      timestamp: new Date().toISOString(),
    };
  }

  // Write back to data.json
  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
  console.log("\n✅ Updated data.json with LLM evaluation score.");
}

main().catch((err) => {
  console.error("💥 Error:", err);
  process.exit(1);
});
