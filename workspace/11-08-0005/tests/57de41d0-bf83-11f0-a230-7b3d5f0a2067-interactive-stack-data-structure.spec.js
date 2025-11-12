import { test, expect } from '@playwright/test';

test.describe('Interactive Stack Data Structure', () => {
  let page;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    await page.goto('http://127.0.0.1:5500/workspace/11-08-0005/html/57de41d0-bf83-11f0-a230-7b3d5f0a2067.html');
    await page.waitForLoadState('networkidle');
  });

  test.describe('Initial State', () => {
    test('should start in empty state', async () => {
      // Verify empty stack message is displayed
      await expect(page.locator('.status-message')).toContainText('Stack is empty');
      
      // Verify no stack items are present
      const stackItems = await page.locator('.stack-item').count();
      expect(stackItems).toBe(0);
      
      // Verify pop, peek, and clear buttons are disabled
      await expect(page.locator('button:has-text("Pop")')).toBeDisabled();
      await expect(page.locator('button:has-text("Peek")')).toBeDisabled();
      await expect(page.locator('button:has-text("Clear")')).toBeDisabled();
      
      // Verify push button is enabled
      await expect(page.locator('button:has-text("Push")')).toBeEnabled();
    });
  });

  test.describe('Push Operations', () => {
    test('should transition from empty to hasElements state on push', async () => {
      // Enter a value and push
      await page.fill('input[type="text"]', 'First Item');
      await page.click('button:has-text("Push")');
      
      // Wait for animation
      await page.waitForTimeout(600);
      
      // Verify stack has one element
      const stackItems1 = await page.locator('.stack-item').count();
      expect(stackItems).toBe(1);
      
      // Verify the element contains correct text
      await expect(page.locator('.stack-item').first()).toContainText('First Item');
      
      // Verify buttons are enabled appropriately
      await expect(page.locator('button:has-text("Pop")')).toBeEnabled();
      await expect(page.locator('button:has-text("Peek")')).toBeEnabled();
      await expect(page.locator('button:has-text("Clear")')).toBeEnabled();
      
      // Verify status message
      await expect(page.locator('.status-message')).toContainText('Stack has 1 element');
    });

    test('should handle multiple push operations', async () => {
      const items = ['Item 1', 'Item 2', 'Item 3'];
      
      for (const item of items) {
        await page.fill('input[type="text"]', item);
        await page.click('button:has-text("Push")');
        await page.waitForTimeout(300);
      }
      
      // Verify all items are in the stack
      const stackItems2 = await page.locator('.stack-item').count();
      expect(stackItems).toBe(3);
      
      // Verify LIFO order (last pushed item should be on top)
      await expect(page.locator('.stack-item').first()).toContainText('Item 3');
      
      // Verify status message
      await expect(page.locator('.status-message')).toContainText('Stack has 3 elements');
    });

    test('should transition to full state when reaching capacity', async () => {
      // Push items until stack is full (assuming MAX_CAPACITY is 10)
      for (let i = 1; i <= 10; i++) {
        await page.fill('input[type="text"]', `Item ${i}`);
        await page.click('button:has-text("Push")');
        await page.waitForTimeout(100);
      }
      
      // Verify stack is full
      await expect(page.locator('.status-message')).toContainText('Stack is full');
      
      // Verify push button is disabled
      await expect(page.locator('button:has-text("Push")')).toBeDisabled();
      
      // Verify other buttons are still enabled
      await expect(page.locator('button:has-text("Pop")')).toBeEnabled();
      await expect(page.locator('button:has-text("Peek")')).toBeEnabled();
      await expect(page.locator('button:has-text("Clear")')).toBeEnabled();
    });

    test('should clear input field after successful push', async () => {
      await page.fill('input[type="text"]', 'Test Item');
      await page.click('button:has-text("Push")');
      await page.waitForTimeout(300);
      
      // Verify input is cleared
      await expect(page.locator('input[type="text"]')).toHaveValue('');
    });

    test('should not push empty values', async () => {
      // Try to push without entering value
      await page.fill('input[type="text"]', '');
      await page.click('button:has-text("Push")');
      
      // Verify no item was added
      const stackItems3 = await page.locator('.stack-item').count();
      expect(stackItems).toBe(0);
    });
  });

  test.describe('Pop Operations', () => {
    test.beforeEach(async () => {
      // Setup: Add some items to the stack
      const items1 = ['Item 1', 'Item 2', 'Item 3'];
      for (const item of items) {
        await page.fill('input[type="text"]', item);
        await page.click('button:has-text("Push")');
        await page.waitForTimeout(200);
      }
    });

    test('should animate and remove top element on pop', async () => {
      // Initial count
      let stackItems4 = await page.locator('.stack-item').count();
      expect(stackItems).toBe(3);
      
      // Pop an item
      await page.click('button:has-text("Pop")');
      
      // Wait for popping animation
      await page.waitForTimeout(600);
      
      // Verify item was removed
      stackItems = await page.locator('.stack-item').count();
      expect(stackItems).toBe(2);
      
      // Verify correct item remains on top
      await expect(page.locator('.stack-item').first()).toContainText('Item 2');
      
      // Verify status message
      await expect(page.locator('.status-message')).toContainText('Stack has 2 elements');
    });

    test('should transition to empty state when popping last element', async () => {
      // Pop all items
      for (let i = 0; i < 3; i++) {
        await page.click('button:has-text("Pop")');
        await page.waitForTimeout(600);
      }
      
      // Verify stack is empty
      const stackItems5 = await page.locator('.stack-item').count();
      expect(stackItems).toBe(0);
      
      // Verify empty state message
      await expect(page.locator('.status-message')).toContainText('Stack is empty');
      
      // Verify pop button is disabled
      await expect(page.locator('button:has-text("Pop")')).toBeDisabled();
    });

    test('should show pop animation with visual feedback', async () => {
      // Click pop and immediately check for animation class
      await page.click('button:has-text("Pop")');
      
      // Check if popping class is applied
      const poppingElement = await page.locator('.stack-item.popping').count();
      expect(poppingElement).toBeGreaterThan(0);
    });
  });

  test.describe('Peek Operations', () => {
    test.beforeEach(async () => {
      // Setup: Add items to stack
      await page.fill('input[type="text"]', 'Bottom Item');
      await page.click('button:has-text("Push")');
      await page.waitForTimeout(200);
      
      await page.fill('input[type="text"]', 'Top Item');
      await page.click('button:has-text("Push")');
      await page.waitForTimeout(200);
    });

    test('should highlight top element on peek', async () => {
      // Click peek
      await page.click('button:has-text("Peek")');
      
      // Check for peek highlight
      const highlightedElement = await page.locator('.stack-item.peeking').count();
      expect(highlightedElement).toBe(1);
      
      // Verify it's the top element
      await expect(page.locator('.stack-item.peeking')).toContainText('Top Item');
      
      // Wait for animation to complete
      await page.waitForTimeout(1000);
      
      // Verify highlight is removed
      const highlightedAfter = await page.locator('.stack-item.peeking').count();
      expect(highlightedAfter).toBe(0);
    });

    test('should not modify stack size on peek', async () => {
      // Get initial count
      const initialCount = await page.locator('.stack-item').count();
      
      // Perform peek
      await page.click('button:has-text("Peek")');
      await page.waitForTimeout(1000);
      
      // Verify count remains the same
      const finalCount = await page.locator('.stack-item').count();
      expect(finalCount).toBe(initialCount);
    });
  });

  test.describe('Clear Operations', () => {
    test.beforeEach(async () => {
      // Setup: Add multiple items
      for (let i = 1; i <= 5; i++) {
        await page.fill('input[type="text"]', `Item ${i}`);
        await page.click('button:has-text("Push")');
        await page.waitForTimeout(100);
      }
    });

    test('should animate and remove all elements on clear', async () => {
      // Verify initial state
      let stackItems6 = await page.locator('.stack-item').count();
      expect(stackItems).toBe(5);
      
      // Click clear
      await page.click('button:has-text("Clear")');
      
      // Check for clearing animation
      const clearingElements = await page.locator('.stack-item.clearing').count();
      expect(clearingElements).toBeGreaterThan(0);
      
      // Wait for animation to complete
      await page.waitForTimeout(800);
      
      // Verify all items are removed
      stackItems = await page.locator('.stack-item').count();
      expect(stackItems).toBe(0);
      
      // Verify empty state
      await expect(page.locator('.status-message')).toContainText('Stack is empty');
      
      // Verify buttons are in correct state
      await expect(page.locator('button:has-text("Pop")')).toBeDisabled();
      await expect(page.locator('button:has-text("Peek")')).toBeDisabled();
      await expect(page.locator('button:has-text("Clear")')).toBeDisabled();
    });
  });

  test.describe('State Transitions', () => {
    test('should handle rapid state transitions correctly', async () => {
      // Push multiple items quickly
      for (let i = 1; i <= 3; i++) {
        await page.fill('input[type="text"]', `Quick ${i}`);
        await page.click('button:has-text("Push")');
      }
      
      // Immediately pop
      await page.click('button:has-text("Pop")');
      
      // Push another item
      await page.fill('input[type="text"]', 'New Item');
      await page.click('button:has-text("Push")');
      
      // Wait for all animations
      await page.waitForTimeout(1000);
      
      // Verify final state is correct
      const stackItems7 = await page.locator('.stack-item').count();
      expect(stackItems).toBe(3);
    });

    test('should maintain correct state after full cycle', async () => {
      // Empty -> hasElements
      await page.fill('input[type="text"]', 'First');
      await page.click('button:has-text("Push")');
      await page.waitForTimeout(300);
      
      // hasElements -> hasElements (multiple pushes)
      await page.fill('input[type="text"]', 'Second');
      await page.click('button:has-text("Push")');
      await page.waitForTimeout(300);
      
      // Peek (hasElements -> peeking -> hasElements)
      await page.click('button:has-text("Peek")');
      await page.waitForTimeout(1000);
      
      // Pop (hasElements -> popping -> hasElements)
      await page.click('button:has-text("Pop")');
      await page.waitForTimeout(600);
      
      // Clear (hasElements -> clearing -> empty)
      await page.click('button:has-text("Clear")');
      await page.waitForTimeout(800);
      
      // Verify we're back to empty state
      await expect(page.locator('.status-message')).toContainText('Stack is empty');
      const finalCount1 = await page.locator('.stack-item').count();
      expect(finalCount).toBe(0);
    });
  });

  test.describe('Visual Feedback', () => {
    test('should show appropriate visual feedback for each operation', async () => {
      // Test push animation
      await page.fill('input[type="text"]', 'Animated Item');
      await page.click('button:has-text("Push")');
      
      // Check for push animation class
      const pushingElement = await page.locator('.stack-item').first();
      const hasAnimation = await pushingElement.evaluate(el => {
        const style = window.getComputedStyle(el);
        return style.animation !== 'none';
      });
      expect(hasAnimation).toBe(true);
    });

    test('should update status message correctly for all states', async () => {
      // Empty state
      await expect(page.locator('.status-message')).toContainText('Stack is empty');
      
      // Has elements state
      await page.fill('input[type="text"]', 'Item');
      await page.click('button:has-text("Push")');
      await page.waitForTimeout(300);
      await expect(page.locator('.status-message')).toContainText('Stack has 1 element');
      
      // Multiple elements
      await page.fill('input[type="text"]', 'Item 2');
      await page.click('button:has-text("Push")');
      await page.waitForTimeout(300);
      await expect(page.locator('.status-message')).toContainText('Stack has 2 elements');
    });
  });

  test.describe('Edge Cases', () => {
    test('should handle whitespace-only input', async () => {
      await page.fill('input[type="text"]', '   ');
      await page.click('button:has-text("Push")');
      
      // Should either trim or reject - verify no empty item is added
      const stackItems8 = await page.locator('.stack-item').count();
      if (stackItems > 0) {
        // If item was added, verify it's not just whitespace
        const itemText = await page.locator('.stack-item').first().textContent();
        expect(itemText.trim().length).toBeGreaterThan(0);
      }
    });

    test('should handle very long input values', async () => {
      const longText = 'A'.repeat(100);
      await page.fill('input[type="text"]', longText);
      await page.click('button:has-text("Push")');
      await page.waitForTimeout(300);
      
      // Verify item was added
      const stackItems9 = await page.locator('.stack-item').count();
      expect(stackItems).toBe(1);
      
      // Verify text overflow is handled properly
      const stackItem = page.locator('.stack-item').first();
      const isOverflowing = await stackItem.evaluate(el => {
        return el.scrollWidth > el.clientWidth;
      });
      
      // Should have proper text overflow handling
      if (isOverflowing) {
        const overflow = await stackItem.evaluate(el => {
          return window.getComputedStyle(el).textOverflow;
        });
        expect(overflow).toBe('ellipsis');
      }
    });
  });
});