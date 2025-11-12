// playwright-fsm-probe.js
import { chromium } from "playwright";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// 修复：使用 ES module 的方式获取 __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  await page.goto(
    "http://127.0.0.1:5500/workspace/11-12-0001-fsm-examples/html/9e580470-bf51-11f0-8ac4-79272b6a78b2.html"
  );

  // Utility: get BST canvas DOM signature (list of node values)
  async function getTreeSnapshot() {
    return await page.$$eval(".node", (nodes) =>
      nodes.map((n) => parseInt(n.innerText)).sort((a, b) => a - b)
    );
  }

  // Detect all interactive buttons
  const buttons = await page.$$("button");
  console.log(`Detected ${buttons.length} clickable buttons:`);

  let insertButton = null;
  let deleteButton = null;
  let inputField = null;

  // detect input field
  const inputs = await page.$$('input[type="number"], input[type="text"]');
  if (inputs.length > 0) {
    inputField = inputs[0];
  }

  // Try to find Insert / Delete semantics by clicking and evaluating DOM change
  for (const btn of buttons) {
    const label = (await btn.innerText()).toLowerCase();
    console.log(`- Button found: "${label}"`);

    if (label.includes("insert") || label.includes("add")) {
      insertButton = btn;
    }
    if (label.includes("delete") || label.includes("remove")) {
      deleteButton = btn;
    }
  }

  // Fallback: if button naming fails, try behavior probing
  async function probeButtonBehavior(btn, valueToTry) {
    if (!inputField) return "unknown";

    await inputField.fill(String(valueToTry));
    const before = await getTreeSnapshot();

    await btn.click();
    await page.waitForTimeout(300); // give DOM some time

    const after = await getTreeSnapshot();
    if (after.length > before.length) return "insert";
    if (after.length < before.length) return "delete";
    return "no-op";
  }

  // If missing semantic labels, determine by probing
  if (!insertButton && buttons.length > 0) {
    for (const btn of buttons) {
      const behavior = await probeButtonBehavior(btn, 50);
      if (behavior === "insert") insertButton = btn;
      if (behavior === "delete") deleteButton = btn;
    }
  }

  console.log("Detected semantic roles:");
  console.log("Insert:", !!insertButton);
  console.log("Delete:", !!deleteButton);

  // Start building actual FSM
  const actualFSM = {
    states: [],
    transitions: [],
    components: {
      input_exists: !!inputField,
      insert_exists: !!insertButton,
      delete_exists: !!deleteButton,
    },
    issues: [],
  };

  // Base state: Idle (no change)
  actualFSM.states.push({ id: "Idle", type: "idle" });

  // Test Insert logic if exists
  if (insertButton && inputField) {
    // Insert -> should lead to InsertStart -> InsertNode -> Idle
    actualFSM.states.push({ id: "InsertStart", type: "operation" });
    actualFSM.states.push({ id: "InsertNode", type: "operation" });

    await inputField.fill("10");
    let before = await getTreeSnapshot();
    await insertButton.click();
    await page.waitForTimeout(300);
    let after = await getTreeSnapshot();

    if (after.length > before.length) {
      actualFSM.transitions.push({
        from: "Idle",
        event: "TriggerInsert",
        to: "InsertStart",
        score: 1.0,
      });
      actualFSM.transitions.push({
        from: "InsertStart",
        event: "UpdateTree",
        to: "InsertNode",
        score: 1.0,
      });
      actualFSM.transitions.push({
        from: "InsertNode",
        event: "Render",
        to: "Idle",
        score: 1.0,
      });
    } else {
      actualFSM.issues.push("Insert button exists but tree did not update");
    }
  } else {
    actualFSM.issues.push("Missing Insert functionality");
  }

  // Test Delete logic if exists
  if (deleteButton && inputField) {
    actualFSM.states.push({ id: "DeleteStart", type: "operation" });

    await inputField.fill("10");
    let before = await getTreeSnapshot();
    await deleteButton.click();
    await page.waitForTimeout(300);
    let after = await getTreeSnapshot();

    if (after.length < before.length) {
      actualFSM.transitions.push({
        from: "Idle",
        event: "TriggerDelete",
        to: "DeleteStart",
        score: 1.0,
      });
      actualFSM.transitions.push({
        from: "DeleteStart",
        event: "Render",
        to: "Idle",
        score: 1.0,
      });
    } else {
      actualFSM.issues.push("Delete button exists but tree did not change");
    }
  } else {
    actualFSM.issues.push("Missing Delete functionality");
  }

  console.log("\n===== Actual FSM extracted from page =====");
  console.log(JSON.stringify(actualFSM, null, 2));

  // 修复：简化文件保存逻辑
  const outputFileName = "9e580470-bf51-11f0-8ac4-79272b6a78b2.json";
  const outputFilePath = path.join(__dirname, outputFileName);

  try {
    fs.writeFileSync(outputFilePath, JSON.stringify(actualFSM, null, 2));
    console.log(`FSM JSON saved to: ${outputFilePath}`);
  } catch (error) {
    console.error("Error saving file:", error);

    // 备选方案：保存到当前工作目录
    const fallbackPath = path.join(process.cwd(), outputFileName);
    fs.writeFileSync(fallbackPath, JSON.stringify(actualFSM, null, 2));
    console.log(`FSM JSON saved to fallback location: ${fallbackPath}`);
  }

  await browser.close();
})();
