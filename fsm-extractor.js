/**
 * 从HTML文件中提取FSM配置
 * @param {string} htmlContent - HTML文件内容
 * @returns {Object|null} FSM配置对象，如果未找到则返回null
 */
function extractFSMFromHTML(htmlContent) {
  try {
    // 查找带有id="fsm"和type="application/json"的script标签
    const fsmRegex =
      /<script\s+id=["']fsm["']\s+type=["']application\/json["']>([\s\S]*?)<\/script>/i;
    const match = htmlContent.match(fsmRegex);

    if (!match || !match[1]) {
      console.warn("未找到FSM配置");
      return null;
    }

    // 提取JSON内容并解析
    const jsonContent = match[1].trim();
    const fsmConfig = JSON.parse(jsonContent);

    return fsmConfig;
  } catch (error) {
    console.error("解析FSM配置失败:", error);
    return null;
  }
}

/**
 * 从HTML文件路径提取FSM配置
 * @param {string} filePath - HTML文件路径
 * @returns {Promise<Object|null>} FSM配置对象
 */
async function extractFSMFromFile(filePath) {
  try {
    const fs = await import("fs/promises");
    const htmlContent = await fs.readFile(filePath, "utf-8");
    return extractFSMFromHTML(htmlContent);
  } catch (error) {
    console.error("读取文件失败:", error);
    return null;
  }
}

/**
 * 批量从多个HTML文件中提取FSM配置
 * @param {string[]} filePaths - HTML文件路径数组
 * @returns {Promise<Array>} FSM配置数组
 */
async function extractFSMBatch(filePaths) {
  const results = [];

  for (const filePath of filePaths) {
    try {
      const fsm = await extractFSMFromFile(filePath);
      results.push({
        filePath,
        fsm,
        success: fsm !== null,
      });
    } catch (error) {
      results.push({
        filePath,
        fsm: null,
        success: false,
        error: error.message,
      });
    }
  }

  return results;
}

/**
 * 从workspace中提取所有HTML文件的FSM配置
 * @param {string} workspacePath - workspace路径
 * @returns {Promise<Object>} 包含所有FSM配置的对象
 */
async function extractFSMFromWorkspace(workspacePath) {
  try {
    const fs = await import("fs/promises");
    const path = await import("path");

    // 读取workspace下的所有目录
    const workspaceDirs = await fs.readdir(workspacePath, {
      withFileTypes: true,
    });
    const result = {};

    for (const dir of workspaceDirs) {
      if (!dir.isDirectory()) continue;

      const htmlDir = path.join(workspacePath, dir.name, "html");

      try {
        const htmlFiles = await fs.readdir(htmlDir);
        const fsmConfigs = {};

        for (const file of htmlFiles) {
          if (!file.endsWith(".html")) continue;

          const filePath = path.join(htmlDir, file);
          const fsm = await extractFSMFromFile(filePath);

          if (fsm) {
            const fileId = file.replace(".html", "");
            fsmConfigs[fileId] = {
              file: file,
              path: filePath,
              fsm: fsm,
            };
          }
        }

        if (Object.keys(fsmConfigs).length > 0) {
          result[dir.name] = fsmConfigs;
        }
      } catch (error) {
        console.warn(`跳过目录 ${dir.name}/html:`, error.message);
      }
    }

    return result;
  } catch (error) {
    console.error("提取workspace FSM配置失败:", error);
    return {};
  }
}

/**
 * 验证FSM配置的完整性
 * @param {Object} fsmConfig - FSM配置对象
 * @returns {Object} 验证结果
 */
function validateFSMConfig(fsmConfig) {
  const errors = [];
  const warnings = [];

  if (!fsmConfig) {
    errors.push("FSM配置为空");
    return { valid: false, errors, warnings };
  }

  // 验证基本结构
  if (!fsmConfig.machine) {
    errors.push("缺少machine配置");
  } else {
    if (!fsmConfig.machine.id) warnings.push("缺少machine.id");
    if (!fsmConfig.machine.initial) errors.push("缺少machine.initial");
    if (!fsmConfig.machine.states) errors.push("缺少machine.states");
  }

  // 验证playwright配置
  if (!fsmConfig.playwright) {
    warnings.push("缺少playwright配置");
  } else {
    if (!fsmConfig.playwright.selectors) warnings.push("缺少selectors");
    if (!fsmConfig.playwright.events) warnings.push("缺少events");
    if (!fsmConfig.playwright.assertions) warnings.push("缺少assertions");
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

// 使用示例
async function example() {
  // 示例1: 从单个HTML文件提取
  const fsm = await extractFSMFromFile(
    "./workspace/10-14-0001/html/7b6ef870-a8c1-11f0-b671-bdc8446eb0e6.html"
  );
  console.log("单个文件FSM:", fsm);

  // 示例2: 从workspace批量提取
  const allFSM = await extractFSMFromWorkspace("./workspace");
  console.log("所有FSM配置:", allFSM);

  // 示例3: 验证FSM配置
  if (fsm) {
    const validation = validateFSMConfig(fsm);
    console.log("验证结果:", validation);
  }
}

// 导出函数
export {
  extractFSMFromHTML,
  extractFSMFromFile,
  extractFSMBatch,
  extractFSMFromWorkspace,
  validateFSMConfig,
};
