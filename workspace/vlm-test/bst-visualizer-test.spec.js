import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

/**
 * 专门为BST可视化器(210a3a10-b47f-11f0-931e-47cf29e19e2d.html)设计的完整Playwright测试
 * 基于HTML中embedded的FSM配置，测试所有状态转换并捕获每个状态的截图
 */

test.describe('BST Visualizer - Complete FSM State Testing', () => {
  const htmlFileName = '210a3a10-b47f-11f0-931e-47cf29e19e2d';
  const visualsDir = path.join(process.cwd(), 'visuals', htmlFileName);
  
  // 确保截图目录存在
  test.beforeAll(async () => {
    if (!fs.existsSync(visualsDir)) {
      fs.mkdirSync(visualsDir, { recursive: true });
    }
  });

  test.beforeEach(async ({ page }) => {
    // 导航到HTML文件
    await page.goto(`file:///${path.join(process.cwd(), 'html', `${htmlFileName}.html`).replace(/\\/g, '/')}`);
    
    // 等待页面完全加载
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('[data-testid="value-input"]');
    await page.waitForSelector('[data-testid="tree-svg"]');
    
    // 等待JavaScript初始化完成
    await page.waitForTimeout(500);
  });

  test('01 - Initial Empty State', async ({ page }) => {
    // 验证初始状态
    await expect(page.locator('[data-testid="status"]')).toHaveText('BST is empty. Insert a value to begin.');
    await expect(page.locator('[data-testid="root-value"]')).toHaveText('null');
    await expect(page.locator('[data-testid="inorder"]')).toHaveText('[]');
    
    // 捕获初始空状态截图
    await page.screenshot({ 
      path: path.join(visualsDir, '01-initial-empty-state.png'),
      fullPage: true 
    });
  });

  test('02 - Insert Valid Values and State Transitions', async ({ page }) => {
    let stepCount = 0;
    
    // 插入第一个节点：10 (empty -> ready)
    stepCount++;
    await page.fill('[data-testid="value-input"]', '10');
    await page.click('[data-testid="btn-insert"]');
    await page.waitForTimeout(300); // 等待动画和渲染
    
    await expect(page.locator('[data-testid="node-10"]')).toBeVisible();
    await expect(page.locator('[data-testid="root-value"]')).toHaveText('10');
    await expect(page.locator('[data-testid="status"]')).toHaveText('Inserted 10.');
    
    await page.screenshot({ 
      path: path.join(visualsDir, `02-${stepCount.toString().padStart(2, '0')}-inserted-node-10.png`),
      fullPage: true 
    });

    // 插入左子节点：5
    stepCount++;
    await page.fill('[data-testid="value-input"]', '5');
    await page.click('[data-testid="btn-insert"]');
    await page.waitForTimeout(300);
    
    await expect(page.locator('[data-testid="node-5"]')).toBeVisible();
    await expect(page.locator('[data-testid="status"]')).toHaveText('Inserted 5.');
    
    await page.screenshot({ 
      path: path.join(visualsDir, `02-${stepCount.toString().padStart(2, '0')}-inserted-node-5.png`),
      fullPage: true 
    });

    // 插入右子节点：15
    stepCount++;
    await page.fill('[data-testid="value-input"]', '15');
    await page.click('[data-testid="btn-insert"]');
    await page.waitForTimeout(300);
    
    await expect(page.locator('[data-testid="node-15"]')).toBeVisible();
    await expect(page.locator('[data-testid="status"]')).toHaveText('Inserted 15.');
    
    await page.screenshot({ 
      path: path.join(visualsDir, `02-${stepCount.toString().padStart(2, '0')}-inserted-node-15.png`),
      fullPage: true 
    });

    // 继续插入更多节点以构建完整的BST
    const nodesToInsert = [3, 7, 12, 18];
    for (const value of nodesToInsert) {
      stepCount++;
      await page.fill('[data-testid="value-input"]', value.toString());
      await page.click('[data-testid="btn-insert"]');
      await page.waitForTimeout(300);
      
      await expect(page.locator(`[data-testid="node-${value}"]`)).toBeVisible();
      await expect(page.locator('[data-testid="status"]')).toHaveText(`Inserted ${value}.`);
      
      await page.screenshot({ 
        path: path.join(visualsDir, `02-${stepCount.toString().padStart(2, '0')}-inserted-node-${value}.png`),
        fullPage: true 
      });
    }

    // 验证最终的遍历结果
    await expect(page.locator('[data-testid="inorder"]')).toHaveText('[3,5,7,10,12,15,18]');
    await expect(page.locator('[data-testid="preorder"]')).toHaveText('[10,5,3,7,15,12,18]');
    await expect(page.locator('[data-testid="levelorder"]')).toHaveText('[10,5,15,3,7,12,18]');
    
    stepCount++;
    await page.screenshot({ 
      path: path.join(visualsDir, `02-${stepCount.toString().padStart(2, '0')}-complete-tree-with-traversals.png`),
      fullPage: true 
    });
  });

  test('03 - Insert Duplicate Value (ready -> ready)', async ({ page }) => {
    // 先插入一个值
    await page.fill('[data-testid="value-input"]', '10');
    await page.click('[data-testid="btn-insert"]');
    await page.waitForTimeout(300);
    
    await page.screenshot({ 
      path: path.join(visualsDir, '03-01-before-duplicate-insert.png'),
      fullPage: true 
    });

    // 尝试插入重复值
    await page.fill('[data-testid="value-input"]', '10');
    await page.click('[data-testid="btn-insert"]');
    await page.waitForTimeout(300);
    
    await expect(page.locator('[data-testid="status"]')).toHaveText('Duplicate value "10" not inserted.');
    
    await page.screenshot({ 
      path: path.join(visualsDir, '03-02-duplicate-value-warning.png'),
      fullPage: true 
    });
  });

  test('04 - Invalid Input Handling (ready -> error -> ready)', async ({ page }) => {
    let stepCount = 0;

    // 测试空输入
    stepCount++;
    await page.fill('[data-testid="value-input"]', '');
    await page.click('[data-testid="btn-insert"]');
    await page.waitForTimeout(300);
    
    await expect(page.locator('[data-testid="status"]')).toHaveText('Please enter a number.');
    await expect(page.locator('[data-testid="status"]')).toHaveClass(/err/);
    
    await page.screenshot({ 
      path: path.join(visualsDir, `04-${stepCount.toString().padStart(2, '0')}-error-empty-input.png`),
      fullPage: true 
    });

    // 测试非整数输入
    stepCount++;
    await page.fill('[data-testid="value-input"]', '3.14');
    await page.click('[data-testid="btn-insert"]');
    await page.waitForTimeout(300);
    
    await expect(page.locator('[data-testid="status"]')).toHaveText('Only integer values are supported.');
    await expect(page.locator('[data-testid="status"]')).toHaveClass(/err/);
    
    await page.screenshot({ 
      path: path.join(visualsDir, `04-${stepCount.toString().padStart(2, '0')}-error-non-integer-input.png`),
      fullPage: true 
    });

    // 测试无效字符输入
    stepCount++;
    await page.fill('[data-testid="value-input"]', 'abc');
    await page.click('[data-testid="btn-insert"]');
    await page.waitForTimeout(300);
    
    await expect(page.locator('[data-testid="status"]')).toHaveText('Invalid number.');
    await expect(page.locator('[data-testid="status"]')).toHaveClass(/err/);
    
    await page.screenshot({ 
      path: path.join(visualsDir, `04-${stepCount.toString().padStart(2, '0')}-error-invalid-characters.png`),
      fullPage: true 
    });

    // 从错误状态恢复：插入有效值 (error -> ready)
    stepCount++;
    await page.fill('[data-testid="value-input"]', '42');
    await page.click('[data-testid="btn-insert"]');
    await page.waitForTimeout(300);
    
    await expect(page.locator('[data-testid="status"]')).toHaveText('Inserted 42.');
    await expect(page.locator('[data-testid="status"]')).toHaveClass(/ok/);
    await expect(page.locator('[data-testid="node-42"]')).toBeVisible();
    
    await page.screenshot({ 
      path: path.join(visualsDir, `04-${stepCount.toString().padStart(2, '0')}-recovery-from-error-state.png`),
      fullPage: true 
    });
  });

  test('05 - Search Operations (ready -> searching -> ready)', async ({ page }) => {
    let stepCount = 0;
    
    // 先构建一个包含多个节点的BST
    const values = [10, 5, 15, 3, 7, 12, 18];
    for (const value of values) {
      await page.fill('[data-testid="value-input"]', value.toString());
      await page.click('[data-testid="btn-insert"]');
      await page.waitForTimeout(200);
    }
    
    stepCount++;
    await page.screenshot({ 
      path: path.join(visualsDir, `05-${stepCount.toString().padStart(2, '0')}-tree-ready-for-search.png`),
      fullPage: true 
    });

    // 搜索存在的值：7
    stepCount++;
    await page.fill('[data-testid="value-input"]', '7');
    await page.click('[data-testid="btn-search"]');
    await page.waitForTimeout(300);
    
    await expect(page.locator('[data-testid="status"]')).toHaveText('Found 7.');
    await expect(page.locator('[data-testid="status"]')).toHaveClass(/ok/);
    
    // 验证搜索路径高亮
    const foundNode = page.locator('[data-testid="node-7"]');
    await expect(foundNode).toBeVisible();
    
    await page.screenshot({ 
      path: path.join(visualsDir, `05-${stepCount.toString().padStart(2, '0')}-search-found-value-7.png`),
      fullPage: true 
    });

    // 搜索不存在的值：25
    stepCount++;
    await page.fill('[data-testid="value-input"]', '25');
    await page.click('[data-testid="btn-search"]');
    await page.waitForTimeout(300);
    
    await expect(page.locator('[data-testid="status"]')).toHaveText('Not found: 25.');
    await expect(page.locator('[data-testid="status"]')).toHaveClass(/warn/);
    
    await page.screenshot({ 
      path: path.join(visualsDir, `05-${stepCount.toString().padStart(2, '0')}-search-not-found-value-25.png`),
      fullPage: true 
    });

    // 搜索根节点：10
    stepCount++;
    await page.fill('[data-testid="value-input"]', '10');
    await page.click('[data-testid="btn-search"]');
    await page.waitForTimeout(300);
    
    await expect(page.locator('[data-testid="status"]')).toHaveText('Found 10.');
    await expect(page.locator('[data-testid="status"]')).toHaveClass(/ok/);
    
    await page.screenshot({ 
      path: path.join(visualsDir, `05-${stepCount.toString().padStart(2, '0')}-search-found-root-value-10.png`),
      fullPage: true 
    });
  });

  test('06 - Delete Operations (ready -> deleting -> ready/empty)', async ({ page }) => {
    let stepCount = 0;
    
    // 构建一个完整的BST
    const values = [10, 5, 15, 3, 7, 12, 18];
    for (const value of values) {
      await page.fill('[data-testid="value-input"]', value.toString());
      await page.click('[data-testid="btn-insert"]');
      await page.waitForTimeout(200);
    }
    
    stepCount++;
    await page.screenshot({ 
      path: path.join(visualsDir, `06-${stepCount.toString().padStart(2, '0')}-tree-ready-for-deletion.png`),
      fullPage: true 
    });

    // 删除叶子节点：3
    stepCount++;
    await page.fill('[data-testid="value-input"]', '3');
    await page.click('[data-testid="btn-delete"]');
    await page.waitForTimeout(300);
    
    await expect(page.locator('[data-testid="status"]')).toHaveText('Deleted 3.');
    await expect(page.locator('[data-testid="status"]')).toHaveClass(/ok/);
    await expect(page.locator('[data-testid="node-3"]')).not.toBeVisible();
    await expect(page.locator('[data-testid="inorder"]')).toHaveText('[5,7,10,12,15,18]');
    
    await page.screenshot({ 
      path: path.join(visualsDir, `06-${stepCount.toString().padStart(2, '0')}-deleted-leaf-node-3.png`),
      fullPage: true 
    });

    // 删除只有一个子节点的节点：5
    stepCount++;
    await page.fill('[data-testid="value-input"]', '5');
    await page.click('[data-testid="btn-delete"]');
    await page.waitForTimeout(300);
    
    await expect(page.locator('[data-testid="status"]')).toHaveText('Deleted 5.');
    await expect(page.locator('[data-testid="node-5"]')).not.toBeVisible();
    await expect(page.locator('[data-testid="inorder"]')).toHaveText('[7,10,12,15,18]');
    
    await page.screenshot({ 
      path: path.join(visualsDir, `06-${stepCount.toString().padStart(2, '0')}-deleted-one-child-node-5.png`),
      fullPage: true 
    });

    // 删除有两个子节点的节点：15
    stepCount++;
    await page.fill('[data-testid="value-input"]', '15');
    await page.click('[data-testid="btn-delete"]');
    await page.waitForTimeout(300);
    
    await expect(page.locator('[data-testid="status"]')).toHaveText('Deleted 15.');
    await expect(page.locator('[data-testid="node-15"]')).not.toBeVisible();
    await expect(page.locator('[data-testid="inorder"]')).toHaveText('[7,10,12,18]');
    
    await page.screenshot({ 
      path: path.join(visualsDir, `06-${stepCount.toString().padStart(2, '0')}-deleted-two-children-node-15.png`),
      fullPage: true 
    });

    // 尝试删除不存在的值：99
    stepCount++;
    await page.fill('[data-testid="value-input"]', '99');
    await page.click('[data-testid="btn-delete"]');
    await page.waitForTimeout(300);
    
    await expect(page.locator('[data-testid="status"]')).toHaveText('Value 99 not found.');
    await expect(page.locator('[data-testid="status"]')).toHaveClass(/warn/);
    
    await page.screenshot({ 
      path: path.join(visualsDir, `06-${stepCount.toString().padStart(2, '0')}-delete-not-found-value-99.png`),
      fullPage: true 
    });
  });

  test('07 - Clear Operation (ready -> clearing -> empty)', async ({ page }) => {
    let stepCount = 0;
    
    // 先构建一个BST
    const values = [10, 5, 15, 3, 7];
    for (const value of values) {
      await page.fill('[data-testid="value-input"]', value.toString());
      await page.click('[data-testid="btn-insert"]');
      await page.waitForTimeout(200);
    }
    
    stepCount++;
    await page.screenshot({ 
      path: path.join(visualsDir, `07-${stepCount.toString().padStart(2, '0')}-tree-before-clear.png`),
      fullPage: true 
    });

    // 执行清空操作
    stepCount++;
    await page.click('[data-testid="btn-clear"]');
    await page.waitForTimeout(300);
    
    await expect(page.locator('[data-testid="status"]')).toHaveText('Cleared tree.');
    await expect(page.locator('[data-testid="status"]')).toHaveClass(/ok/);
    await expect(page.locator('[data-testid="root-value"]')).toHaveText('null');
    await expect(page.locator('[data-testid="inorder"]')).toHaveText('[]');
    await expect(page.locator('[data-testid="preorder"]')).toHaveText('[]');
    await expect(page.locator('[data-testid="postorder"]')).toHaveText('[]');
    await expect(page.locator('[data-testid="levelorder"]')).toHaveText('[]');
    
    // 验证所有节点都已消失
    for (const value of values) {
      await expect(page.locator(`[data-testid="node-${value}"]`)).not.toBeVisible();
    }
    
    await page.screenshot({ 
      path: path.join(visualsDir, `07-${stepCount.toString().padStart(2, '0')}-tree-after-clear-empty-state.png`),
      fullPage: true 
    });
  });

  test('08 - Keyboard Shortcuts Testing', async ({ page }) => {
    let stepCount = 0;
    
    // 测试Enter键插入
    stepCount++;
    await page.fill('[data-testid="value-input"]', '10');
    await page.press('[data-testid="value-input"]', 'Enter');
    await page.waitForTimeout(300);
    
    await expect(page.locator('[data-testid="status"]')).toHaveText('Inserted 10.');
    await expect(page.locator('[data-testid="node-10"]')).toBeVisible();
    
    await page.screenshot({ 
      path: path.join(visualsDir, `08-${stepCount.toString().padStart(2, '0')}-insert-via-enter-key.png`),
      fullPage: true 
    });

    // 测试Ctrl+S搜索快捷键
    stepCount++;
    await page.fill('[data-testid="value-input"]', '10');
    await page.keyboard.press('Control+s');
    await page.waitForTimeout(300);
    
    await expect(page.locator('[data-testid="status"]')).toHaveText('Found 10.');
    
    await page.screenshot({ 
      path: path.join(visualsDir, `08-${stepCount.toString().padStart(2, '0')}-search-via-ctrl-s.png`),
      fullPage: true 
    });

    // 添加另一个节点用于删除测试
    await page.fill('[data-testid="value-input"]', '5');
    await page.press('[data-testid="value-input"]', 'Enter');
    await page.waitForTimeout(300);

    // 测试Ctrl+D删除快捷键
    stepCount++;
    await page.fill('[data-testid="value-input"]', '5');
    await page.keyboard.press('Control+d');
    await page.waitForTimeout(300);
    
    await expect(page.locator('[data-testid="status"]')).toHaveText('Deleted 5.');
    await expect(page.locator('[data-testid="node-5"]')).not.toBeVisible();
    
    await page.screenshot({ 
      path: path.join(visualsDir, `08-${stepCount.toString().padStart(2, '0')}-delete-via-ctrl-d.png`),
      fullPage: true 
    });

    // 重新添加一些节点用于清空测试
    await page.fill('[data-testid="value-input"]', '15');
    await page.press('[data-testid="value-input"]', 'Enter');
    await page.waitForTimeout(200);

    // 测试Ctrl+K清空快捷键
    stepCount++;
    await page.keyboard.press('Control+k');
    await page.waitForTimeout(300);
    
    await expect(page.locator('[data-testid="status"]')).toHaveText('Cleared tree.');
    await expect(page.locator('[data-testid="root-value"]')).toHaveText('null');
    
    await page.screenshot({ 
      path: path.join(visualsDir, `08-${stepCount.toString().padStart(2, '0')}-clear-via-ctrl-k.png`),
      fullPage: true 
    });
  });

  test('09 - Complex Two-Children Node Deletion with Successor', async ({ page }) => {
    let stepCount = 0;
    
    // 构建一个更复杂的BST来测试两个子节点的删除
    stepCount++;
    await page.click('[data-testid="btn-clear"]'); // 确保从空开始
    await page.waitForTimeout(200);
    
    const values = [50, 30, 70, 20, 40, 60, 80];
    for (const value of values) {
      await page.fill('[data-testid="value-input"]', value.toString());
      await page.click('[data-testid="btn-insert"]');
      await page.waitForTimeout(200);
    }
    
    await page.screenshot({ 
      path: path.join(visualsDir, `09-${stepCount.toString().padStart(2, '0')}-complex-tree-before-root-deletion.png`),
      fullPage: true 
    });

    // 删除根节点（有两个子节点），应该用中序后继替换
    stepCount++;
    await expect(page.locator('[data-testid="root-value"]')).toHaveText('50');
    await page.fill('[data-testid="value-input"]', '50');
    await page.click('[data-testid="btn-delete"]');
    await page.waitForTimeout(300);
    
    await expect(page.locator('[data-testid="status"]')).toHaveText('Deleted 50.');
    await expect(page.locator('[data-testid="node-50"]')).not.toBeVisible();
    await expect(page.locator('[data-testid="root-value"]')).toHaveText('60'); // 中序后继
    await expect(page.locator('[data-testid="inorder"]')).toHaveText('[20,30,40,60,70,80]');
    
    await page.screenshot({ 
      path: path.join(visualsDir, `09-${stepCount.toString().padStart(2, '0')}-after-root-deletion-successor-replacement.png`),
      fullPage: true 
    });
  });

  test('10 - Edge Cases and Boundary Conditions', async ({ page }) => {
    let stepCount = 0;
    
    // 测试在空树上进行搜索
    stepCount++;
    await page.fill('[data-testid="value-input"]', '10');
    await page.click('[data-testid="btn-search"]');
    await page.waitForTimeout(300);
    
    await expect(page.locator('[data-testid="status"]')).toHaveText('Not found: 10.');
    
    await page.screenshot({ 
      path: path.join(visualsDir, `10-${stepCount.toString().padStart(2, '0')}-search-in-empty-tree.png`),
      fullPage: true 
    });

    // 测试在空树上进行删除
    stepCount++;
    await page.fill('[data-testid="value-input"]', '10');
    await page.click('[data-testid="btn-delete"]');
    await page.waitForTimeout(300);
    
    await expect(page.locator('[data-testid="status"]')).toHaveText('Value 10 not found.');
    
    await page.screenshot({ 
      path: path.join(visualsDir, `10-${stepCount.toString().padStart(2, '0')}-delete-in-empty-tree.png`),
      fullPage: true 
    });

    // 测试插入单个节点然后删除（ready -> deleting -> empty）
    stepCount++;
    await page.fill('[data-testid="value-input"]', '42');
    await page.click('[data-testid="btn-insert"]');
    await page.waitForTimeout(300);
    
    await page.screenshot({ 
      path: path.join(visualsDir, `10-${stepCount.toString().padStart(2, '0')}-single-node-tree.png`),
      fullPage: true 
    });

    stepCount++;
    await page.fill('[data-testid="value-input"]', '42');
    await page.click('[data-testid="btn-delete"]');
    await page.waitForTimeout(300);
    
    await expect(page.locator('[data-testid="status"]')).toHaveText('Deleted 42.');
    await expect(page.locator('[data-testid="root-value"]')).toHaveText('null');
    await expect(page.locator('[data-testid="inorder"]')).toHaveText('[]');
    
    await page.screenshot({ 
      path: path.join(visualsDir, `10-${stepCount.toString().padStart(2, '0')}-back-to-empty-after-deleting-single-node.png`),
      fullPage: true 
    });

    // 测试极大值和极小值
    stepCount++;
    const extremeValues = [-1000, 1000, 0];
    for (const value of extremeValues) {
      await page.fill('[data-testid="value-input"]', value.toString());
      await page.click('[data-testid="btn-insert"]');
      await page.waitForTimeout(200);
    }
    
    await page.screenshot({ 
      path: path.join(visualsDir, `10-${stepCount.toString().padStart(2, '0')}-extreme-values-tree.png`),
      fullPage: true 
    });
  });

  test.afterAll(async () => {
    console.log(`All screenshots saved to: ${visualsDir}`);
    console.log(`Total test files created: ${fs.readdirSync(visualsDir).length}`);
  });
});