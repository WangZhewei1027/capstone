import { test, expect } from '@playwright/test';

test.describe('Dynamic Array Explorer', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://127.0.0.1:5500/workspace/11-08-0005/html/5cea8620-bf83-11f0-a230-7b3d5f0a2067.html');
    await page.waitForLoadState('networkidle');
  });

  test.describe('Initial State', () => {
    test('should display empty array on load', async ({ page }) => {
      // Verify initial idle state
      await expect(page.locator('.array-container')).toBeVisible();
      await expect(page.locator('.array-element')).toHaveCount(0);
      await expect(page.locator('.state-indicator')).toContainText('idle');
      await expect(page.locator('.code-display')).toContainText('[]');
    });

    test('should have all control buttons enabled', async ({ page }) => {
      await expect(page.locator('button:has-text("Push")')).toBeEnabled();
      await expect(page.locator('button:has-text("Unshift")')).toBeEnabled();
      await expect(page.locator('button:has-text("Pop")')).toBeEnabled();
      await expect(page.locator('button:has-text("Shift")')).toBeEnabled();
      await expect(page.locator('button:has-text("Clear All")')).toBeEnabled();
    });
  });

  test.describe('Adding Elements', () => {
    test('should push element to array end', async ({ page }) => {
      // Test PUSH_ELEMENT event and adding state
      await page.fill('input[type="text"]', 'Apple');
      await page.click('button:has-text("Push")');
      
      // Verify state transition to adding
      await expect(page.locator('.state-indicator')).toContainText('adding');
      
      // Wait for highlighting state
      await expect(page.locator('.state-indicator')).toContainText('highlighting');
      
      // Verify element is added with highlight
      const newElement = page.locator('.array-element').last();
      await expect(newElement).toContainText('Apple');
      await expect(newElement).toHaveClass(/highlight/);
      
      // Wait for return to idle state
      await expect(page.locator('.state-indicator')).toContainText('idle');
      await expect(newElement).not.toHaveClass(/highlight/);
      
      // Verify code display updated
      await expect(page.locator('.code-display')).toContainText('["Apple"]');
    });

    test('should unshift element to array start', async ({ page }) => {
      // Add initial element
      await page.fill('input[type="text"]', 'Banana');
      await page.click('button:has-text("Push")');
      await page.waitForTimeout(1000);
      
      // Test UNSHIFT_ELEMENT event
      await page.fill('input[type="text"]', 'Orange');
      await page.click('button:has-text("Unshift")');
      
      // Verify state transitions
      await expect(page.locator('.state-indicator')).toContainText('adding');
      await expect(page.locator('.state-indicator')).toContainText('highlighting');
      
      // Verify element is added at start
      const firstElement = page.locator('.array-element').first();
      await expect(firstElement).toContainText('Orange');
      await expect(firstElement).toHaveClass(/highlight/);
      
      // Verify array order
      await expect(page.locator('.array-element').nth(0)).toContainText('Orange');
      await expect(page.locator('.array-element').nth(1)).toContainText('Banana');
      await expect(page.locator('.code-display')).toContainText('["Orange", "Banana"]');
    });

    test('should handle empty input gracefully', async ({ page }) => {
      await page.fill('input[type="text"]', '');
      await page.click('button:has-text("Push")');
      
      // Should remain in idle state
      await expect(page.locator('.state-indicator')).toContainText('idle');
      await expect(page.locator('.array-element')).toHaveCount(0);
    });

    test('should add multiple elements sequentially', async ({ page }) => {
      const elements = ['First', 'Second', 'Third'];
      
      for (const element of elements) {
        await page.fill('input[type="text"]', element);
        await page.click('button:has-text("Push")');
        await page.waitForTimeout(1000);
      }
      
      await expect(page.locator('.array-element')).toHaveCount(3);
      await expect(page.locator('.code-display')).toContainText('["First", "Second", "Third"]');
    });
  });

  test.describe('Removing Elements', () => {
    test.beforeEach(async ({ page }) => {
      // Setup array with test data
      const testData = ['Apple', 'Banana', 'Cherry', 'Date'];
      for (const item of testData) {
        await page.fill('input[type="text"]', item);
        await page.click('button:has-text("Push")');
        await page.waitForTimeout(500);
      }
    });

    test('should pop element from array end', async ({ page }) => {
      // Test POP_ELEMENT event and removing state
      await page.click('button:has-text("Pop")');
      
      // Verify state transition
      await expect(page.locator('.state-indicator')).toContainText('removing');
      
      // Wait for animation and return to idle
      await expect(page.locator('.state-indicator')).toContainText('idle');
      
      // Verify element removed
      await expect(page.locator('.array-element')).toHaveCount(3);
      await expect(page.locator('.array-element').last()).toContainText('Cherry');
      await expect(page.locator('.code-display')).toContainText('["Apple", "Banana", "Cherry"]');
    });

    test('should shift element from array start', async ({ page }) => {
      // Test SHIFT_ELEMENT event
      await page.click('button:has-text("Shift")');
      
      // Verify state transition
      await expect(page.locator('.state-indicator')).toContainText('removing');
      await expect(page.locator('.state-indicator')).toContainText('idle');
      
      // Verify first element removed
      await expect(page.locator('.array-element')).toHaveCount(3);
      await expect(page.locator('.array-element').first()).toContainText('Banana');
      await expect(page.locator('.code-display')).toContainText('["Banana", "Cherry", "Date"]');
    });

    test('should remove element at specific index', async ({ page }) => {
      // Test REMOVE_AT_INDEX event
      const secondElement = page.locator('.array-element').nth(1);
      await secondElement.locator('.remove-btn').click();
      
      // Verify state transition
      await expect(page.locator('.state-indicator')).toContainText('removing');
      await expect(page.locator('.state-indicator')).toContainText('idle');
      
      // Verify correct element removed
      await expect(page.locator('.array-element')).toHaveCount(3);
      await expect(page.locator('.array-element').nth(1)).toContainText('Cherry');
      await expect(page.locator('.code-display')).not.toContainText('Banana');
    });

    test('should handle pop on empty array', async ({ page }) => {
      // Clear array first
      await page.click('button:has-text("Clear All")');
      await page.waitForTimeout(500);
      
      // Try to pop from empty array
      await page.click('button:has-text("Pop")');
      
      // Should remain in idle state
      await expect(page.locator('.state-indicator')).toContainText('idle');
      await expect(page.locator('.array-element')).toHaveCount(0);
    });
  });

  test.describe('Clear Array', () => {
    test('should clear all elements', async ({ page }) => {
      // Add elements
      const items = ['One', 'Two', 'Three'];
      for (const item of items) {
        await page.fill('input[type="text"]', item);
        await page.click('button:has-text("Push")');
        await page.waitForTimeout(500);
      }
      
      // Test CLEAR_ARRAY event and clearing state
      await page.click('button:has-text("Clear All")');
      
      // Verify state transitions
      await expect(page.locator('.state-indicator')).toContainText('clearing');
      await expect(page.locator('.state-indicator')).toContainText('idle');
      
      // Verify all elements removed
      await expect(page.locator('.array-element')).toHaveCount(0);
      await expect(page.locator('.code-display')).toContainText('[]');
    });
  });

  test.describe('Drag and Drop Reordering', () => {
    test.beforeEach(async ({ page }) => {
      // Setup array for drag tests
      const items1 = ['First', 'Second', 'Third', 'Fourth'];
      for (const item of items) {
        await page.fill('input[type="text"]', item);
        await page.click('button:has-text("Push")');
        await page.waitForTimeout(500);
      }
    });

    test('should reorder elements via drag and drop', async ({ page }) => {
      // Test START_DRAG, DROP_ELEMENT events and dragging/reordering states
      const firstElement1 = page.locator('.array-element').first();
      const thirdElement = page.locator('.array-element').nth(2);
      
      // Start drag
      await firstElement.hover();
      await page.mouse.down();
      
      // Verify dragging state
      await expect(page.locator('.state-indicator')).toContainText('dragging');
      await expect(firstElement).toHaveClass(/dragging/);
      
      // Drag to new position
      await thirdElement.hover();
      await page.mouse.up();
      
      // Verify reordering state
      await expect(page.locator('.state-indicator')).toContainText('reordering');
      
      // Wait for reorder complete
      await expect(page.locator('.state-indicator')).toContainText('idle');
      
      // Verify new order
      await expect(page.locator('.array-element').nth(0)).toContainText('Second');
      await expect(page.locator('.array-element').nth(1)).toContainText('Third');
      await expect(page.locator('.array-element').nth(2)).toContainText('First');
      await expect(page.locator('.array-element').nth(3)).toContainText('Fourth');
    });

    test('should cancel drag on escape key', async ({ page }) => {
      // Test CANCEL_DRAG event
      const element = page.locator('.array-element').first();
      
      // Start drag
      await element.hover();
      await page.mouse.down();
      
      // Verify dragging state
      await expect(page.locator('.state-indicator')).toContainText('dragging');
      
      // Cancel with escape
      await page.keyboard.press('Escape');
      
      // Verify return to idle without reordering
      await expect(page.locator('.state-indicator')).toContainText('idle');
      await expect(page.locator('.array-element').first()).toContainText('First');
    });

    test('should handle drag to same position', async ({ page }) => {
      const firstElement2 = page.locator('.array-element').first();
      
      // Drag element to its own position
      await firstElement.hover();
      await page.mouse.down();
      await firstElement.hover();
      await page.mouse.up();
      
      // Should complete drag cycle without changing order
      await expect(page.locator('.array-element').first()).toContainText('First');
    });
  });

  test.describe('Visual Feedback and Animations', () => {
    test('should show visual feedback during operations', async ({ page }) => {
      // Test highlighting on add
      await page.fill('input[type="text"]', 'Highlight Test');
      await page.click('button:has-text("Push")');
      
      const newElement1 = page.locator('.array-element').last();
      await expect(newElement).toHaveClass(/highlight/);
      
      // Highlight should be removed after animation
      await page.waitForTimeout(1500);
      await expect(newElement).not.toHaveClass(/highlight/);
    });

    test('should show fade out animation on remove', async ({ page }) => {
      await page.fill('input[type="text"]', 'Remove Test');
      await page.click('button:has-text("Push")');
      await page.waitForTimeout(500);
      
      const element1 = page.locator('.array-element1').first();
      await element.locator('.remove-btn').click();
      
      // Element should fade out before being removed
      await expect(element).toHaveClass(/fade-out/);
    });
  });

  test.describe('Code Display Updates', () => {
    test('should update code display after each operation', async ({ page }) => {
      const codeDisplay = page.locator('.code-display');
      
      // Initial state
      await expect(codeDisplay).toContainText('[]');
      
      // After push
      await page.fill('input[type="text"]', 'A');
      await page.click('button:has-text("Push")');
      await expect(codeDisplay).toContainText('["A"]');
      
      // After unshift
      await page.fill('input[type="text"]', 'B');
      await page.click('button:has-text("Unshift")');
      await expect(codeDisplay).toContainText('["B", "A"]');
      
      // After pop
      await page.click('button:has-text("Pop")');
      await expect(codeDisplay).toContainText('["B"]');
      
      // After clear
      await page.click('button:has-text("Clear All")');
      await expect(codeDisplay).toContainText('[]');
    });
  });

  test.describe('Edge Cases and Error Handling', () => {
    test('should handle rapid clicks gracefully', async ({ page }) => {
      await page.fill('input[type="text"]', 'Rapid');
      
      // Click push multiple times rapidly
      await Promise.all([
        page.click('button:has-text("Push")'),
        page.click('button:has-text("Push")'),
        page.click('button:has-text("Push")')
      ]);
      
      // Should handle state transitions properly
      await page.waitForTimeout(2000);
      await expect(page.locator('.state-indicator')).toContainText('idle');
    });

    test('should maintain array integrity during concurrent operations', async ({ page }) => {
      // Add multiple elements
      for (let i = 1; i <= 5; i++) {
        await page.fill('input[type="text"]', `Item${i}`);
        await page.click('button:has-text("Push")');
        await page.waitForTimeout(300);
      }
      
      // Verify final state
      await expect(page.locator('.array-element')).toHaveCount(5);
      await expect(page.locator('.state-indicator')).toContainText('idle');
    });
  });
});