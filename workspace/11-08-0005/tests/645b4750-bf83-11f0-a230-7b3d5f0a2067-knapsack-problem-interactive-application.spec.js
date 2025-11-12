import { test, expect } from '@playwright/test';

test.describe('Knapsack Problem Interactive Application', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://127.0.0.1:5500/workspace/11-08-0005/html/645b4750-bf83-11f0-a230-7b3d5f0a2067.html');
    await page.waitForLoadState('networkidle');
  });

  test.describe('Initial State', () => {
    test('should display all UI elements correctly', async ({ page }) => {
      // Verify main elements are present
      await expect(page.locator('h1')).toContainText('The Knapsack Problem');
      await expect(page.locator('.items-container')).toBeVisible();
      await expect(page.locator('.knapsack-container')).toBeVisible();
      await expect(page.locator('#capacity-info')).toBeVisible();
      await expect(page.locator('#reset-btn')).toBeVisible();
      await expect(page.locator('#solve-btn')).toBeVisible();
    });

    test('should show initial capacity as 0/50', async ({ page }) => {
      const capacityText = await page.locator('#capacity-info').textContent();
      expect(capacityText).toContain('0 / 50 kg');
    });

    test('should display all items in available items section', async ({ page }) => {
      const items = page.locator('.items-container .item');
      await expect(items).toHaveCount(6); // Based on typical knapsack problem setup
    });
  });

  test.describe('Drag and Drop Functionality', () => {
    test('should add dragging class when dragging starts', async ({ page }) => {
      const firstItem = page.locator('.items-container .item').first();
      
      // Start dragging
      await firstItem.hover();
      await page.mouse.down();
      
      // Verify dragging class is added
      await expect(firstItem).toHaveClass(/dragging/);
      
      await page.mouse.up();
    });

    test('should remove dragging class when dragging ends', async ({ page }) => {
      const firstItem1 = page.locator('.items-container .item').first();
      
      // Start and end dragging
      await firstItem.hover();
      await page.mouse.down();
      await page.mouse.move(100, 100);
      await page.mouse.up();
      
      // Verify dragging class is removed
      await expect(firstItem).not.toHaveClass(/dragging/);
    });

    test('should add item to knapsack when dropped on knapsack area', async ({ page }) => {
      const firstItem2 = page.locator('.items-container .item').first();
      const knapsackArea = page.locator('.knapsack-container');
      
      // Get initial item count in knapsack
      const initialKnapsackItems = await page.locator('.knapsack-container .item').count();
      
      // Drag item to knapsack
      await firstItem.dragTo(knapsackArea);
      
      // Verify item was added
      const finalKnapsackItems = await page.locator('.knapsack-container .item').count();
      expect(finalKnapsackItems).toBe(initialKnapsackItems + 1);
    });

    test('should update capacity when item is added', async ({ page }) => {
      const firstItem3 = page.locator('.items-container .item').first();
      const knapsackArea1 = page.locator('.knapsack-container');
      
      // Get item weight
      const itemWeight = await firstItem.locator('.item-weight').textContent();
      const weight = parseInt(itemWeight.match(/\d+/)[0]);
      
      // Drag item to knapsack
      await firstItem.dragTo(knapsackArea);
      
      // Verify capacity updated
      const capacityText1 = await page.locator('#capacity-info').textContent();
      expect(capacityText).toContain(`${weight} / 50 kg`);
    });

    test('should update total value when item is added', async ({ page }) => {
      const firstItem4 = page.locator('.items-container .item').first();
      const knapsackArea2 = page.locator('.knapsack-container');
      
      // Get item value
      const itemValue = await firstItem.locator('.item-value').textContent();
      const value = parseInt(itemValue.match(/\d+/)[0]);
      
      // Drag item to knapsack
      await firstItem.dragTo(knapsackArea);
      
      // Verify total value updated
      const totalValue = await page.locator('#total-value').textContent();
      expect(totalValue).toContain(`$${value}`);
    });

    test('should remove item from knapsack when dragged back to available items', async ({ page }) => {
      const firstItem5 = page.locator('.items-container .item').first();
      const knapsackArea3 = page.locator('.knapsack-container');
      const itemsArea = page.locator('.items-container');
      
      // First add item to knapsack
      await firstItem.dragTo(knapsackArea);
      
      // Then drag it back
      const knapsackItem = page.locator('.knapsack-container .item').first();
      await knapsackItem.dragTo(itemsArea);
      
      // Verify item was removed from knapsack
      const knapsackItems = await page.locator('.knapsack-container .item').count();
      expect(knapsackItems).toBe(0);
    });
  });

  test.describe('Capacity Validation', () => {
    test('should reject item when it exceeds capacity', async ({ page }) => {
      const knapsackArea4 = page.locator('.knapsack-container');
      
      // Fill knapsack close to capacity
      const items1 = page.locator('.items1-container .item');
      const itemCount = await items.count();
      
      let totalWeight = 0;
      for (let i = 0; i < itemCount; i++) {
        const item = items.nth(i);
        const weightText = await item.locator('.item-weight').textContent();
        const weight1 = parseInt(weightText.match(/\d+/)[0]);
        
        if (totalWeight + weight <= 45) {
          await item.dragTo(knapsackArea);
          totalWeight += weight;
        }
      }
      
      // Try to add an item that would exceed capacity
      const remainingItems = page.locator('.items-container .item');
      const heavyItem = remainingItems.first();
      
      // Attempt to drag heavy item
      await heavyItem.dragTo(knapsackArea);
      
      // Verify item has shake animation (rejected)
      await expect(heavyItem).toHaveClass(/shake/);
    });

    test('should show capacity warning when near limit', async ({ page }) => {
      const knapsackArea5 = page.locator('.knapsack-container');
      const items2 = page.locator('.items2-container .item');
      
      // Fill knapsack to >80% capacity
      let totalWeight1 = 0;
      const itemCount1 = await items.count();
      
      for (let i = 0; i < itemCount; i++) {
        const item1 = items.nth(i);
        const weightText1 = await item.locator('.item-weight').textContent();
        const weight2 = parseInt(weightText.match(/\d+/)[0]);
        
        if (totalWeight + weight <= 42) { // 84% of 50kg
          await item.dragTo(knapsackArea);
          totalWeight += weight;
        }
      }
      
      // Verify warning state
      const capacityBar = page.locator('.capacity-bar');
      await expect(capacityBar).toHaveClass(/warning/);
    });
  });

  test.describe('Reset Functionality', () => {
    test('should clear all items from knapsack on reset', async ({ page }) => {
      const firstItem6 = page.locator('.items-container .item').first();
      const knapsackArea6 = page.locator('.knapsack-container');
      const resetBtn = page.locator('#reset-btn');
      
      // Add some items
      await firstItem.dragTo(knapsackArea);
      
      // Click reset
      await resetBtn.click();
      
      // Verify knapsack is empty
      const knapsackItems1 = await page.locator('.knapsack-container .item').count();
      expect(knapsackItems).toBe(0);
    });

    test('should reset capacity to 0 on reset', async ({ page }) => {
      const firstItem7 = page.locator('.items-container .item').first();
      const knapsackArea7 = page.locator('.knapsack-container');
      const resetBtn1 = page.locator('#reset-btn');
      
      // Add an item
      await firstItem.dragTo(knapsackArea);
      
      // Click reset
      await resetBtn.click();
      
      // Verify capacity is reset
      const capacityText2 = await page.locator('#capacity-info').textContent();
      expect(capacityText).toContain('0 / 50 kg');
    });

    test('should reset total value to 0 on reset', async ({ page }) => {
      const firstItem8 = page.locator('.items-container .item').first();
      const knapsackArea8 = page.locator('.knapsack-container');
      const resetBtn2 = page.locator('#reset-btn');
      
      // Add an item
      await firstItem.dragTo(knapsackArea);
      
      // Click reset
      await resetBtn.click();
      
      // Verify total value is reset
      const totalValue1 = await page.locator('#total-value').textContent();
      expect(totalValue).toContain('$0');
    });

    test('should return all items to available section on reset', async ({ page }) => {
      const items3 = page.locator('.items3-container .item');
      const knapsackArea9 = page.locator('.knapsack-container');
      const resetBtn3 = page.locator('#reset-btn');
      
      // Count initial items
      const initialCount = await items.count();
      
      // Add some items to knapsack
      await items.first().dragTo(knapsackArea);
      await items.nth(1).dragTo(knapsackArea);
      
      // Click reset
      await resetBtn.click();
      
      // Verify all items are back
      const finalCount = await page.locator('.items-container .item').count();
      expect(finalCount).toBe(initialCount);
    });
  });

  test.describe('Solve Functionality', () => {
    test('should calculate optimal solution when solve is clicked', async ({ page }) => {
      const solveBtn = page.locator('#solve-btn');
      
      // Click solve
      await solveBtn.click();
      
      // Wait for animation
      await page.waitForTimeout(500);
      
      // Verify optimal items are highlighted
      const glowingItems = page.locator('.item.glow');
      await expect(glowingItems).toHaveCount(await glowingItems.count());
      expect(await glowingItems.count()).toBeGreaterThan(0);
    });

    test('should show optimal solution message', async ({ page }) => {
      const solveBtn1 = page.locator('#solve-btn');
      
      // Click solve
      await solveBtn.click();
      
      // Verify solution message appears
      await expect(page.locator('.solution-message')).toBeVisible();
    });

    test('should animate optimal items with glow effect', async ({ page }) => {
      const solveBtn2 = page.locator('#solve-btn');
      
      // Click solve
      await solveBtn.click();
      
      // Wait for animation to start
      await page.waitForTimeout(100);
      
      // Verify glow animation on optimal items
      const glowingItems1 = page.locator('.item.glow');
      await expect(glowingItems.first()).toHaveClass(/glow/);
    });

    test('should display optimal value and weight', async ({ page }) => {
      const solveBtn3 = page.locator('#solve-btn');
      
      // Click solve
      await solveBtn.click();
      
      // Wait for calculation
      await page.waitForTimeout(500);
      
      // Verify optimal stats are displayed
      await expect(page.locator('.optimal-value')).toBeVisible();
      await expect(page.locator('.optimal-weight')).toBeVisible();
    });
  });

  test.describe('State Transitions', () => {
    test('should transition from idle to dragging on drag start', async ({ page }) => {
      const item2 = page.locator('.items-container .item2').first();
      
      // Start dragging
      await item.hover();
      await page.mouse.down();
      
      // Verify dragging state
      await expect(item).toHaveClass(/dragging/);
      
      await page.mouse.up();
    });

    test('should transition from dragging to idle on drag end', async ({ page }) => {
      const item3 = page.locator('.items-container .item3').first();
      
      // Start and end drag
      await item.hover();
      await page.mouse.down();
      await page.mouse.move(100, 100);
      await page.mouse.up();
      
      // Verify back to idle (no dragging class)
      await expect(item).not.toHaveClass(/dragging/);
    });

    test('should transition through addingItem state when dropping on knapsack', async ({ page }) => {
      const item4 = page.locator('.items-container .item4').first();
      const knapsackArea10 = page.locator('.knapsack-container');
      
      // Drag and drop
      await item.dragTo(knapsackArea);
      
      // Verify item was successfully added (itemAdded state reached)
      const knapsackItems2 = await page.locator('.knapsack-container .item').count();
      expect(knapsackItems).toBeGreaterThan(0);
    });

    test('should transition to itemRejected when capacity exceeded', async ({ page }) => {
      const knapsackArea11 = page.locator('.knapsack-container');
      const items4 = page.locator('.items4-container .item');
      
      // Fill knapsack to capacity
      let totalWeight2 = 0;
      const itemCount2 = await items.count();
      
      for (let i = 0; i < itemCount; i++) {
        const item5 = items.nth(i);
        const weightText2 = await item.locator('.item-weight').textContent();
        const weight3 = parseInt(weightText.match(/\d+/)[0]);
        
        if (totalWeight + weight <= 48) {
          await item.dragTo(knapsackArea);
          totalWeight += weight;
        }
      }
      
      // Try to add item that exceeds capacity
      const remainingItem = page.locator('.items-container .item').first();
      const initialKnapsackCount = await page.locator('.knapsack-container .item').count();
      
      await remainingItem.dragTo(knapsackArea);
      
      // Verify item was rejected (shake animation)
      await expect(remainingItem).toHaveClass(/shake/);
      
      // Verify item count didn't change
      const finalKnapsackCount = await page.locator('.knapsack-container .item').count();
      expect(finalKnapsackCount).toBe(initialKnapsackCount);
    });

    test('should transition through resetting state on reset click', async ({ page }) => {
      const resetBtn4 = page.locator('#reset-btn');
      const item6 = page.locator('.items-container .item6').first();
      const knapsackArea12 = page.locator('.knapsack-container');
      
      // Add item first
      await item.dragTo(knapsackArea);
      
      // Click reset
      await resetBtn.click();
      
      // Verify reset completed
      const knapsackItems3 = await page.locator('.knapsack-container .item').count();
      expect(knapsackItems).toBe(0);
    });

    test('should transition through solving and animatingSolution states', async ({ page }) => {
      const solveBtn4 = page.locator('#solve-btn');
      
      // Click solve
      await solveBtn.click();
      
      // Wait for animation
      await page.waitForTimeout(1000);
      
      // Verify animation completed (glow effect present)
      const glowingItems2 = await page.locator('.item.glow').count();
      expect(glowingItems).toBeGreaterThan(0);
    });
  });

  test.describe('Edge Cases', () => {
    test('should handle rapid clicking of reset button', async ({ page }) => {
      const resetBtn5 = page.locator('#reset-btn');
      
      // Click reset multiple times rapidly
      await resetBtn.click();
      await resetBtn.click();
      await resetBtn.click();
      
      // Verify app is still functional
      const capacityText3 = await page.locator('#capacity-info').textContent();
      expect(capacityText).toContain('0 / 50 kg');
    });

    test('should handle dragging while solve animation is running', async ({ page }) => {
      const solveBtn5 = page.locator('#solve-btn');
      const item7 = page.locator('.items-container .item7').first();
      
      // Start solve animation
      await solveBtn.click();
      
      // Try to drag during animation
      await item.hover();
      await page.mouse.down();
      await page.mouse.move(100, 100);
      await page.mouse.up();
      
      // Verify app handles gracefully
      await expect(page.locator('.container')).toBeVisible();
    });

    test('should handle solve with empty knapsack', async ({ page }) => {
      const solveBtn6 = page.locator('#solve-btn');
      
      // Click solve with empty knapsack
      await solveBtn.click();
      
      // Verify it handles gracefully
      await expect(page.locator('.solution-message')).toBeVisible();
    });

    test('should handle solve with full knapsack', async ({ page }) => {
      const knapsackArea13 = page.locator('.knapsack-container');
      const items5 = page.locator('.items5-container .item');
      const solveBtn7 = page.locator('#solve-btn');
      
      // Fill knapsack completely
      let totalWeight3 = 0;
      const itemCount3 = await items.count();
      
      for (let i = 0; i < itemCount && totalWeight < 50; i++) {
        const item8 = items.nth(i);
        const weightText3 = await item.locator('.item-weight').textContent();
        const weight4 = parseInt(weightText.match(/\d+/)[0]);
        
        if (totalWeight + weight <= 50) {
          await item.dragTo(knapsackArea);
          totalWeight += weight;
        }
      }
      
      // Click solve
      await solveBtn.click();
      
      // Verify solution is calculated
      await expect(page.locator('.solution-message')).toBeVisible();
    });
  });

  test.describe('Visual Feedback', () => {
    test('should show hover effect on items', async ({ page }) => {
      const item9 = page.locator('.items-container .item9').first();
      
      // Hover over item
      await item.hover();
      
      // Verify hover styles are applied
      const transform = await item.evaluate(el => 
        window.getComputedStyle(el).transform
      );
      expect(transform).not.toBe('none');
    });

    test('should show capacity bar fill animation', async ({ page }) => {
      const item10 = page.locator('.items-container .item10').first();
      const knapsackArea14 = page.locator('.knapsack-container');
      
      // Add item
      await item.dragTo(knapsackArea);
      
      // Verify capacity bar updates
      const capacityBar1 = page.locator('.capacity-bar');
      const width = await capacityBar.evaluate(el => 
        window.getComputedStyle(el).width
      );
      expect(parseInt(width)).toBeGreaterThan(0);
    });

    test('should show smooth transitions when items move', async ({ page }) => {
      const item11 = page.locator('.items-container .item11').first();
      
      // Verify transition property is set
      const transition = await item.evaluate(el => 
        window.getComputedStyle(el).transition
      );
      expect(transition).toContain('0.3s');
    });
  });

  test.describe('Accessibility', () => {
    test('should have proper ARIA labels', async ({ page }) => {
      // Verify important elements have aria labels
      await expect(page.locator('#reset-btn')).toHaveAttribute('aria-label', /reset/i);
      await expect(page.locator('#solve-btn')).toHaveAttribute('aria-label', /solve/i);
    });

    test('should be keyboard navigable', async ({ page }) => {
      // Focus on reset button
      await page.locator('#reset-btn').focus();
      
      // Tab to solve button
      await page.keyboard.press('Tab');
      
      // Verify solve button is focused
      const focusedElement = await page.evaluate(() => document.activeElement.id);
      expect(focusedElement).toBe('solve-btn');
    });
  });
});