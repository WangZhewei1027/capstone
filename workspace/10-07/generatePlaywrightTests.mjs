// File: generatePlaywrightTests.mjs
// Usage: node generatePlaywrightTests.mjs "gradient descent" ./visualizations/gradient_descent.html

import fs from "fs";
import path from "path";
import OpenAI from "openai";

// const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const client = new OpenAI({
  apiKey: "sk-Vm2l1fKI5EKEqyfSX9wEbg9QvhUlYY9vDhoRiJ4hk9OZG76u",
  baseURL: "https://turingai.plus/v1/",
});

/**
 * Generate a high-quality prompt for the LLM
 * that explains how to build Playwright tests
 * for the given HTML visualization.
 */
function buildPrompt(conceptName, htmlPath, htmlContent) {
  return `
You are an expert software QA engineer specializing in interactive visualization testing using Playwright.

Your task is to generate a **complete Playwright test file (.spec.js)** to evaluate the **functional correctness, robustness, and performance** of an educational visualization HTML file.

The test should comprehensively assess the visualization’s behavior for the given **concept** and **HTML source**.

---

### 🔍 INPUT CONTEXT

Concept name: "${conceptName}"

HTML file path: "${htmlPath}"

HTML contents:
\`\`\`html
${htmlContent}
\`\`\`

---

### 🎯 YOUR GOAL
Generate a single Playwright test file that evaluates the visualization on **10 specific metrics** of functional correctness, interactivity, and robustness:

1. **initial_render_correct (bool)** — Verify that key visual elements (e.g., bars, nodes, points, or axes) exist and that their attributes or data correspond to the initial data configuration.

2. **control_presence (bool / list)** — Ensure essential UI controls (buttons, sliders, dropdowns) exist and are interactable. For example, “Sort”, “Start”, “Reset”, or “Adjust Array Size” if conceptually relevant.

3. **final_sorted (bool)** — If applicable (sorting, optimization, convergence), check that the visualization reaches a correct final state (e.g., sorted array, converged gradient).

4. **stepwise_progression (percent / snapshots)** — Detect whether the DOM changes progressively between states (e.g., swaps, iterations). Collect intermediate snapshots.

5. **swap_count (number)** — Estimate number of swap/iteration updates based on DOM or data changes.

6. **time_to_sort_ms (number)** — Measure elapsed time from start of visualization to completion.

7. **console_errors (count)** — Count console errors and warnings during execution.

8. **idempotency (bool)** — Clicking the main control again on a finished visualization should not crash or change results incorrectly.

9. **robustness_under_rapid_clicks (bool / count)** — Rapidly trigger the main action multiple times; verify no crashes, consistent output, and final correctness.

10. **visual_regression_hash (string)** — Capture a before/after screenshot pair and compute or log a placeholder hash (e.g., MD5 or text placeholder) for future comparison.

---

### 🧩 FILE STRUCTURE

The output should be a **single Playwright spec file** named according to the concept, e.g.:

\`\`\`js
// tests/${conceptName.toLowerCase().replace(/\s+/g, "-")}.spec.js
\`\`\`

Follow this format:

\`\`\`js
import { test, expect } from "@playwright/test";

const FILE_URL = "file://" + process.cwd() + "${htmlPath}";

// Helper functions: getHeights(), isSorted(), etc.
// BeforeEach: navigate to page, optionally speed up animations.
// Then implement 9-10 Playwright tests corresponding to the metrics above.
// Include console logging for duration, swap count, and screenshot hash.

test.describe("${conceptName} Visualization Evaluation", () => {
  ...
});
\`\`\`

---

### ⚙️ ADDITIONAL GUIDELINES
- Assume the HTML may be imperfect. Do not skip a test if missing controls; instead, **log that they are missing**.
- Handle different visualization types: bars, SVGs, canvases, or dynamic text.
- Prefer robust selectors (by id, class, or role).
- Use async Playwright syntax.
- Do not output explanations — only the **final Playwright code**.

---
Now generate the complete Playwright test file.
`;
}

/**
 * Generate a Playwright test file for a given concept and HTML file.
 */
async function generatePlaywrightTest(concept, htmlPath) {
  const htmlContent = fs.readFileSync(htmlPath, "utf8");
  const prompt = buildPrompt(concept, htmlPath, htmlContent);

  console.log(`🧠 Generating Playwright test for "${concept}"...`);

  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "You generate high-quality Playwright test files for visualization evaluation.",
      },
      { role: "user", content: prompt },
    ],
    temperature: 0.3,
  });

  const testCode = response.choices?.[0]?.message?.content?.trim();

  if (!testCode) {
    console.error("❌ No code generated from LLM.");
    return;
  }

  // Prepare output directory
  const testDir = path.resolve("./tests");
  if (!fs.existsSync(testDir)) fs.mkdirSync(testDir);

  // Normalize file name
  const fileName = htmlPath.split("/").pop().replace(".html", "") + ".spec.js";
  const outputPath = path.join(testDir, fileName);

  fs.writeFileSync(outputPath, testCode, "utf8");
  console.log(`✅ Test generated and saved to: ${outputPath}`);
  console.log(`👉 Run it with: npx playwright test ${outputPath}`);
}

/**
 * Command-line usage:
 * node generatePlaywrightTests.mjs "concept" "./path/to/html"
 */
if (process.argv.length < 4) {
  console.error(
    'Usage: node generatePlaywrightTests.mjs "concept name" ./path/to/htmlfile.html'
  );
  process.exit(1);
}

const concept = process.argv[2];
const htmlPath = process.argv[3];

await generatePlaywrightTest(concept, htmlPath);
