import { test, expect } from '@playwright/test';

test.describe('Deque Interactive Visualization', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://127.0.0.1:5500/workspace/11-08-0005/html/62f0e1e0-bf83-11f0-a230-7b3d5f0a2067.html');
    await page.waitForLoadState('networkidle');
  });

  test.describe('Initial State - Empty', () => {
    test('should display empty deque on load', async ({ page }) => {
      // Verify empty state
      await expect(page.locator('.deque.empty')).toBeVisible();
      await expect(page.locator('.deque')).toContainText('Empty Deque');
      await expect(page.locator('#capacity')).toContainText('0/10');
      
      // Verify all buttons are in correct state
      await expect(page.locator('#addFrontBtn')).toBeEnabled();
      await expect(page.locator('#addBackBtn')).toBeEnabled();
      await expect(page.locator('#removeFrontBtn')).toBeDisabled();
      await expect(page.locator('#removeBackBtn')).toBeDisabled();
      await expect(page.locator('#clearBtn')).toBeDisabled();
    });
  });

  test.describe('Adding Elements - Transitions to hasElements', () => {
    test('should add element to front and transition from empty to hasElements', async ({ page }) => {
      // Add element to front
      await page.fill('#inputValue', 'First');
      await page.click('#addFrontBtn');
      
      // Verify state transition
      await expect(page.locator('.deque')).not.toHaveClass(/empty/);
      await expect(page.locator('.element')).toHaveCount(1);
      await expect(page.locator('.element').first()).toContainText('First');
      await expect(page.locator('#capacity')).toContainText('1/10');
      
      // Verify buttons state
      await expect(page.locator('#removeFrontBtn')).toBeEnabled();
      await expect(page.locator('#removeBackBtn')).toBeEnabled();
      await expect(page.locator('#clearBtn')).toBeEnabled();
    });

    test('should add element to back and transition from empty to hasElements', async ({ page }) => {
      // Add element to back
      await page.fill('#inputValue', 'Last');
      await page.click('#addBackBtn');
      
      // Verify state transition
      await expect(page.locator('.deque')).not.toHaveClass(/empty/);
      await expect(page.locator('.element')).toHaveCount(1);
      await expect(page.locator('.element').first()).toContainText('Last');
      await expect(page.locator('#capacity')).toContainText('1/10');
    });

    test('should add multiple elements from both ends', async ({ page }) => {
      // Add from front
      await page.fill('#inputValue', 'Front1');
      await page.click('#addFrontBtn');
      
      // Add from back
      await page.fill('#inputValue', 'Back1');
      await page.click('#addBackBtn');
      
      // Add another from front
      await page.fill('#inputValue', 'Front2');
      await page.click('#addFrontBtn');
      
      // Verify order
      const elements = await page.locator('.element').allTextContents();
      expect(elements).toEqual(['Front2', 'Front1', 'Back1']);
      await expect(page.locator('#capacity')).toContainText('3/10');
    });
  });

  test.describe('Full State - Capacity Limit', () => {
    test('should transition to full state when capacity reached', async ({ page }) => {
      // Add 10 elements to reach capacity
      for (let i = 1; i <= 10; i++) {
        await page.fill('#inputValue', `Item${i}`);
        await page.click('#addFrontBtn');
      }
      
      // Verify full state
      await expect(page.locator('#capacity')).toContainText('10/10');
      await expect(page.locator('#addFrontBtn')).toBeDisabled();
      await expect(page.locator('#addBackBtn')).toBeDisabled();
      await expect(page.locator('#removeFrontBtn')).toBeEnabled();
      await expect(page.locator('#removeBackBtn')).toBeEnabled();
      await expect(page.locator('#clearBtn')).toBeEnabled();
    });

    test('should re-enable add buttons after removing from full deque', async ({ page }) => {
      // Fill deque
      for (let i = 1; i <= 10; i++) {
        await page.fill('#inputValue', `Item${i}`);
        await page.click('#addBackBtn');
      }
      
      // Verify full
      await expect(page.locator('#addFrontBtn')).toBeDisabled();
      await expect(page.locator('#addBackBtn')).toBeDisabled();
      
      // Remove one element
      await page.click('#removeFrontBtn');
      
      // Verify transition back to hasElements
      await expect(page.locator('#capacity')).toContainText('9/10');
      await expect(page.locator('#addFrontBtn')).toBeEnabled();
      await expect(page.locator('#addBackBtn')).toBeEnabled();
    });
  });

  test.describe('Removing Elements - checkIfEmpty Transition', () => {
    test('should remove from front and check if empty', async ({ page }) => {
      // Add one element
      await page.fill('#inputValue', 'Single');
      await page.click('#addFrontBtn');
      
      // Remove it
      await page.click('#removeFrontBtn');
      
      // Verify transition back to empty
      await expect(page.locator('.deque.empty')).toBeVisible();
      await expect(page.locator('#capacity')).toContainText('0/10');
      await expect(page.locator('#removeFrontBtn')).toBeDisabled();
      await expect(page.locator('#removeBackBtn')).toBeDisabled();
      await expect(page.locator('#clearBtn')).toBeDisabled();
    });

    test('should remove from back and check if empty', async ({ page }) => {
      // Add one element
      await page.fill('#inputValue', 'Single');
      await page.click('#addBackBtn');
      
      // Remove it
      await page.click('#removeBackBtn');
      
      // Verify transition back to empty
      await expect(page.locator('.deque.empty')).toBeVisible();
      await expect(page.locator('#capacity')).toContainText('0/10');
    });

    test('should remove multiple elements and stay in hasElements', async ({ page }) => {
      // Add three elements
      for (let i = 1; i <= 3; i++) {
        await page.fill('#inputValue', `Item${i}`);
        await page.click('#addBackBtn');
      }
      
      // Remove one
      await page.click('#removeFrontBtn');
      
      // Verify still has elements
      await expect(page.locator('.deque')).not.toHaveClass(/empty/);
      await expect(page.locator('.element')).toHaveCount(2);
      await expect(page.locator('#capacity')).toContainText('2/10');
    });
  });

  test.describe('Clear Operation', () => {
    test('should clear all elements and return to empty state', async ({ page }) => {
      // Add multiple elements
      for (let i = 1; i <= 5; i++) {
        await page.fill('#inputValue', `Item${i}`);
        await page.click('#addBackBtn');
      }
      
      // Clear all
      await page.click('#clearBtn');
      
      // Verify empty state
      await expect(page.locator('.deque.empty')).toBeVisible();
      await expect(page.locator('#capacity')).toContainText('0/10');
      await expect(page.locator('.element')).toHaveCount(0);
      await expect(page.locator('#clearBtn')).toBeDisabled();
    });

    test('should clear from full state', async ({ page }) => {
      // Fill deque
      for (let i = 1; i <= 10; i++) {
        await page.fill('#inputValue', `Item${i}`);
        await page.click('#addFrontBtn');
      }
      
      // Clear all
      await page.click('#clearBtn');
      
      // Verify empty state and buttons
      await expect(page.locator('.deque.empty')).toBeVisible();
      await expect(page.locator('#addFrontBtn')).toBeEnabled();
      await expect(page.locator('#addBackBtn')).toBeEnabled();
    });
  });

  test.describe('Visual Feedback - Highlighting States', () => {
    test('should highlight front label when adding to front', async ({ page }) => {
      await page.fill('#inputValue', 'Test');
      
      // Click add front and check for highlight
      const addFrontPromise = page.click('#addFrontBtn');
      
      // Check highlight appears
      await expect(page.locator('.end-label').first()).toHaveClass(/highlight/);
      
      await addFrontPromise;
      
      // Verify highlight is removed after animation
      await page.waitForTimeout(400); // Wait for animation
      await expect(page.locator('.end-label').first()).not.toHaveClass(/highlight/);
    });

    test('should highlight back label when adding to back', async ({ page }) => {
      await page.fill('#inputValue', 'Test');
      
      // Click add back and check for highlight
      const addBackPromise = page.click('#addBackBtn');
      
      // Check highlight appears
      await expect(page.locator('.end-label').last()).toHaveClass(/highlight/);
      
      await addBackPromise;
      
      // Verify highlight is removed after animation
      await page.waitForTimeout(400); // Wait for animation
      await expect(page.locator('.end-label').last()).not.toHaveClass(/highlight/);
    });
  });

  test.describe('Element Interactions', () => {
    test('should show tooltip on element hover', async ({ page }) => {
      // Add element
      await page.fill('#inputValue', 'HoverTest');
      await page.click('#addFrontBtn');
      
      // Hover over element
      await page.hover('.element');
      
      // Verify tooltip appears
      await expect(page.locator('.tooltip')).toBeVisible();
      await expect(page.locator('.tooltip')).toContainText('Click to inspect');
    });

    test('should handle element click interaction', async ({ page }) => {
      // Add element
      await page.fill('#inputValue', 'ClickTest');
      await page.click('#addBackBtn');
      
      // Click element
      await page.click('.element');
      
      // Verify some visual feedback occurs (element should have transition)
      const element = page.locator('.element').first();
      await expect(element).toBeVisible();
    });
  });

  test.describe('Input Validation', () => {
    test('should not add empty values', async ({ page }) => {
      // Try to add without entering value
      await page.click('#addFrontBtn');
      
      // Verify deque is still empty
      await expect(page.locator('.deque.empty')).toBeVisible();
      await expect(page.locator('.element')).toHaveCount(0);
    });

    test('should trim whitespace from input', async ({ page }) => {
      // Add value with spaces
      await page.fill('#inputValue', '  Trimmed  ');
      await page.click('#addFrontBtn');
      
      // Verify trimmed value
      await expect(page.locator('.element')).toContainText('Trimmed');
    });

    test('should clear input after adding element', async ({ page }) => {
      // Add element
      await page.fill('#inputValue', 'TestValue');
      await page.click('#addFrontBtn');
      
      // Verify input is cleared
      await expect(page.locator('#inputValue')).toHaveValue('');
    });
  });

  test.describe('Keyboard Interactions', () => {
    test('should add element on Enter key', async ({ page }) => {
      // Type value and press Enter
      await page.fill('#inputValue', 'EnterTest');
      await page.press('#inputValue', 'Enter');
      
      // Verify element added (defaults to front)
      await expect(page.locator('.element')).toHaveCount(1);
      await expect(page.locator('.element')).toContainText('EnterTest');
    });
  });

  test.describe('Edge Cases', () => {
    test('should handle rapid additions', async ({ page }) => {
      // Rapidly add elements
      for (let i = 1; i <= 5; i++) {
        await page.fill('#inputValue', `Rapid${i}`);
        await page.click('#addFrontBtn');
      }
      
      // Verify all elements added
      await expect(page.locator('.element')).toHaveCount(5);
      await expect(page.locator('#capacity')).toContainText('5/10');
    });

    test('should handle alternating operations', async ({ page }) => {
      // Add front
      await page.fill('#inputValue', 'F1');
      await page.click('#addFrontBtn');
      
      // Add back
      await page.fill('#inputValue', 'B1');
      await page.click('#addBackBtn');
      
      // Remove front
      await page.click('#removeFrontBtn');
      
      // Add front again
      await page.fill('#inputValue', 'F2');
      await page.click('#addFrontBtn');
      
      // Verify final state
      const elements1 = await page.locator('.element').allTextContents();
      expect(elements).toEqual(['F2', 'B1']);
    });

    test('should maintain correct order with complex operations', async ({ page }) => {
      // Build deque: [3, 1, 2, 4]
      await page.fill('#inputValue', '1');
      await page.click('#addFrontBtn');
      
      await page.fill('#inputValue', '2');
      await page.click('#addBackBtn');
      
      await page.fill('#inputValue', '3');
      await page.click('#addFrontBtn');
      
      await page.fill('#inputValue', '4');
      await page.click('#addBackBtn');
      
      // Verify order
      const elements2 = await page.locator('.element').allTextContents();
      expect(elements).toEqual(['3', '1', '2', '4']);
      
      // Remove from both ends
      await page.click('#removeFrontBtn');
      await page.click('#removeBackBtn');
      
      // Verify remaining
      const remaining = await page.locator('.element').allTextContents();
      expect(remaining).toEqual(['1', '2']);
    });
  });
});