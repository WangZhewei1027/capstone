import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T05-14-37/html/cdca21d1-ca86-11f0-aa32-8b1afd472b96.html';

test.describe('Binary Search Application Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application page before each test
    await page.goto(BASE_URL);
  });

  test('should render the page in the Idle state', async ({ page }) => {
    // Validate that the page is rendered correctly in the Idle state
    const bodyContent = await page.textContent('body');
    expect(bodyContent).toContain('Binary Search'); // Assuming the title or some content is present
  });

  test('should perform binary search and return correct index', async ({ page }) => {
    // Test the binary search function with a valid input
    await page.evaluate(() => {
      const arr = [4, 8, 9, 5, 3];
      const target = 7;
      return binarySearch(arr, target);
    }).then(result => {
      expect(result).toBe(-1); // Expect -1 for target not found
    });
  });

  test('should return correct index for target found', async ({ page }) => {
    // Test the binary search function with a valid input where target is found
    await page.evaluate(() => {
      const arr = [1, 2, 3, 4, 5, 6, 7, 8, 9];
      const target = 5;
      return binarySearch(arr, target);
    }).then(result => {
      expect(result).toBe(4); // Expect index 4 for target 5
    });
  });

  test('should handle empty array', async ({ page }) => {
    // Test the binary search function with an empty array
    await page.evaluate(() => {
      const arr = [];
      const target = 1;
      return binarySearch(arr, target);
    }).then(result => {
      expect(result).toBe(-1); // Expect -1 for target not found in empty array
    });
  });

  test('should handle single element array where target is not found', async ({ page }) => {
    // Test the binary search function with a single element array
    await page.evaluate(() => {
      const arr = [5];
      const target = 3;
      return binarySearch(arr, target);
    }).then(result => {
      expect(result).toBe(-1); // Expect -1 for target not found
    });
  });

  test('should handle single element array where target is found', async ({ page }) => {
    // Test the binary search function with a single element array
    await page.evaluate(() => {
      const arr = [5];
      const target = 5;
      return binarySearch(arr, target);
    }).then(result => {
      expect(result).toBe(0); // Expect index 0 for target found
    });
  });

  test('should handle sorted array with duplicates', async ({ page }) => {
    // Test the binary search function with a sorted array containing duplicates
    await page.evaluate(() => {
      const arr = [1, 2, 2, 2, 3, 4, 5];
      const target = 2;
      return binarySearch(arr, target);
    }).then(result => {
      expect(result).toBe(1); // Expect index of first occurrence of target 2
    });
  });
});