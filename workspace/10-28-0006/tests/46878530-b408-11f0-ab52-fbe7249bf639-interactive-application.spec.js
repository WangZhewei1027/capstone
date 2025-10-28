import { test, expect } from '@playwright/test';

class HashTablePage {
  constructor(page) {
    this.page = page;
    this.url = 'http://127.0.0.1:5500/workspace/10-28-0006/html/46878530-b408-11f0-ab52-fbe7249bf639.html';
    this.hashTable = page.locator('#hashTable');
    this.input = page.locator('.input-container input');
    this.addButton = page.getByRole('button', { name: /add/i }); // robust match for "Add to Hash Table"
    this.feedback = page.locator('.feedback');
  }

  async goto() {
    await this.page.goto(this.url);
    await expect(this.hashTable).toBeVisible();
    await expect(this.input).toBeVisible();
    await expect(this.addButton).toBeVisible();
  }

  bucket(n) {
    return this.page.locator(`#bucket${n}`);
  }

  async getBucketText(n) {
    return await this.bucket(n).textContent();
  }

  async isBucketFilled(n) {
    const classAttr = await this.bucket(n).getAttribute('class');
    return (classAttr || '').includes('filled');
  }

  async enterKey(value) {
    await this.input.fill(String(value));
  }

  async clearInput() {
    await this.input.fill('');
  }

  async clickAdd() {
    await this.addButton.click();
  }

  async getFeedbackText() {
    return await this.feedback.textContent();
  }

  // Assertions for feedback categories to accommodate unknown exact wording
  async expectInvalidFeedback() {
    const text = (await this.getFeedbackText()) || '';
    expect(text).toMatch(/invalid|error|please|enter.*number|range/i);
  }

  async expectCollisionFeedback() {
    const text = (await this.getFeedbackText()) || '';
    expect(text).toMatch(/collision|occupied|already.*filled|exists/i);
  }

  async expectSuccessFeedback() {
    const text = (await this.getFeedbackText()) || '';
    expect(text).toMatch(/success|added|inserted|stored/i);
  }
}

test.describe('Interactive Hash Table - FSM End-to-End Validation', () => {
  let app;

  test.beforeEach(async ({ page }) => {
    app = new HashTablePage(page);
    await app.goto();
  });

  test.afterEach(async () => {
    // No teardown required for this simple app; buckets persist by design.
    // This hook is included to meet setup/teardown requirement.
  });

  test.describe('Initial and Idle State', () => {
    test('should render hash table buckets 0-9 in idle state and be ready for input (onEnter: ready_for_input)', async () => {
      // Verify 10 buckets exist, labeled 0 through 9 and not filled
      for (let i = 0; i < 10; i++) {
        await expect(app.bucket(i)).toBeVisible();
        const text = await app.getBucketText(i);
        expect(text?.trim()).toBe(String(i));
        const isFilled = await app.isBucketFilled(i);
        expect(isFilled).toBeFalsy();
      }

      // Ready for input: input is empty or present, button enabled, feedback initially empty
      await expect(app.addButton).toBeEnabled();
      const initialFeedback = (await app.getFeedbackText()) || '';
      // Feedback may be empty or an instructional message; ensure it's not an error/collision/success
      expect(initialFeedback).not.toMatch(/invalid|error|collision|success/i);
    });
  });

  test.describe('Invalid Input State and Transition (idle -> validating_input -> invalid_input)', () => {
    test('should show invalid feedback on empty input (onEnter: show_feedback_invalid)', async () => {
      await app.clearInput();
      await app.clickAdd(); // CLICK_ADD -> validating_input -> INVALID_INPUT -> invalid_input

      await app.expectInvalidFeedback();

      // Verify no bucket becomes filled due to invalid input
      for (let i = 0; i < 10; i++) {
        const isFilled = await app.isBucketFilled(i);
        expect(isFilled).toBeFalsy();
      }
    });

    test('should reject non-numeric input', async () => {
      await app.enterKey('abc');
      await app.clickAdd();

      await app.expectInvalidFeedback();

      for (let i = 0; i < 10; i++) {
        const isFilled = await app.isBucketFilled(i);
        expect(isFilled).toBeFalsy();
      }
    });

    test('should reject out-of-range negative input', async () => {
      await app.enterKey('-1');
      await app.clickAdd();

      await app.expectInvalidFeedback();

      for (let i = 0; i < 10; i++) {
        const isFilled = await app.isBucketFilled(i);
        expect(isFilled).toBeFalsy();
      }
    });

    test('should reject out-of-range high input (>=10)', async () => {
      await app.enterKey('10');
      await app.clickAdd();

      await app.expectInvalidFeedback();

      for (let i = 0; i < 10; i++) {
        const isFilled = await app.isBucketFilled(i);
        expect(isFilled).toBeFalsy();
      }
    });

    test('should accept trimmed whitespace around a valid number and proceed (validating_input -> hashing)', async () => {
      await app.enterKey(' 9 ');
      await app.clickAdd();

      // hashing -> checking_collision -> bucket empty -> filling_bucket -> success
      await expect(app.bucket(9)).toHaveClass(/filled/);
      const bucketText = await app.getBucketText(9);
      expect(bucketText?.trim()).toBe('9');
      await app.expectSuccessFeedback();
    });
  });

  test.describe('Valid Input Path: hashing -> checking_collision -> filling_bucket -> success', () => {
    test('should compute bucket = key % 10, fill when empty, and show success feedback', async () => {
      const key = 7;
      await app.enterKey(String(key));
      await app.clickAdd();

      // OnEnter: compute_bucket -> emits BUCKET_COMPUTED -> checking_collision
      // Bucket is empty -> emits BUCKET_EMPTY -> filling_bucket (onEnter: mark_bucket_filled) -> success (onEnter: show_feedback_success)

      // Verify bucket selection and fill
      await expect(app.bucket(key % 10)).toHaveClass(/filled/);

      // Verify bucket text updated to key
      const text = await app.getBucketText(key % 10);
      expect(text?.trim()).toBe(String(key));

      // Verify success feedback set
      await app.expectSuccessFeedback();
    });

    test('should fill multiple different buckets across interactions and persist state', async () => {
      // Add 0
      await app.enterKey('0');
      await app.clickAdd();
      await expect(app.bucket(0)).toHaveClass(/filled/);
      expect((await app.getBucketText(0))?.trim()).toBe('0');
      await app.expectSuccessFeedback();

      // Add 3
      await app.enterKey('3');
      await app.clickAdd();
      await expect(app.bucket(3)).toHaveClass(/filled/);
      expect((await app.getBucketText(3))?.trim()).toBe('3');
      await app.expectSuccessFeedback();

      // Buckets remain filled (persistence)
      expect(await app.isBucketFilled(0)).toBeTruthy();
      expect(await app.isBucketFilled(3)).toBeTruthy();
      // Unrelated bucket remains unfilled (e.g., 5)
      expect(await app.isBucketFilled(5)).toBeFalsy();
    });
  });

  test.describe('Collision Handling: checking_collision -> collision', () => {
    test('should detect collision when adding a key that hashes to an already filled bucket', async () => {
      // First add 9 to fill bucket9
      await app.enterKey('9');
      await app.clickAdd();
      await expect(app.bucket(9)).toHaveClass(/filled/);
      expect((await app.getBucketText(9))?.trim()).toBe('9');
      await app.expectSuccessFeedback();

      // Attempt to add 9 again -> collision expected
      await app.enterKey('9');
      await app.clickAdd();

      // OnEnter: check_collision -> emits COLLISION_DETECTED -> collision (onEnter: show_feedback_collision)
      await app.expectCollisionFeedback();

      // Bucket remains unchanged
      await expect(app.bucket(9)).toHaveClass(/filled/);
      expect((await app.getBucketText(9))?.trim()).toBe('9');
    });

    test('should allow recovery from collision by adding a different valid key (CLICK_ADD -> validating_input)', async () => {
      // Ensure a collision occurs (fill bucket7 then try 7 again)
      await app.enterKey('7');
      await app.clickAdd();
      await expect(app.bucket(7)).toHaveClass(/filled/);
      await app.expectSuccessFeedback();

      await app.enterKey('7');
      await app.clickAdd();
      await app.expectCollisionFeedback();

      // Now change to a different key that targets an empty bucket
      // Choose 5 (assuming bucket5 is empty in this test context)
      await app.enterKey('5');
      await app.clickAdd();

      await expect(app.bucket(5)).toHaveClass(/filled/);
      expect((await app.getBucketText(5))?.trim()).toBe('5');
      await app.expectSuccessFeedback();
    });
  });

  test.describe('Transitions from invalid_input and success back to validating_input via CLICK_ADD', () => {
    test('invalid_input -> CLICK_ADD -> validating_input -> success with corrected input', async () => {
      // Start with invalid
      await app.enterKey('xyz');
      await app.clickAdd();
      await app.expectInvalidFeedback();

      // Correct the input and click add to proceed through validating -> hashing -> success
      await app.enterKey('4');
      await app.clickAdd();

      await expect(app.bucket(4)).toHaveClass(/filled/);
      expect((await app.getBucketText(4))?.trim()).toBe('4');
      await app.expectSuccessFeedback();
    });

    test('success -> CLICK_ADD -> validating_input -> collision when attempting same key', async () => {
      // Add key 2 successfully
      await app.enterKey('2');
      await app.clickAdd();
      await expect(app.bucket(2)).toHaveClass(/filled/);
      await app.expectSuccessFeedback();

      // Click add again with the same key to trigger collision path
      await app.enterKey('2');
      await app.clickAdd();
      await app.expectCollisionFeedback();
    });
  });

  test.describe('Edge Cases and Visual Feedback Checks', () => {
    test('should not fill any bucket on pure whitespace input', async () => {
      await app.enterKey('   ');
      await app.clickAdd();

      await app.expectInvalidFeedback();

      for (let i = 0; i < 10; i++) {
        const isFilled = await app.isBucketFilled(i);
        // Buckets previously filled in other tests may remain filled; here we ensure no new fill occurred due to whitespace.
        // To make this deterministic, check that bucket0 text isn't changed from its index unless previously filled in this test.
        // Since this test runs isolated by page reload, we can still assert that no buckets are filled.
        // Re-verify all buckets empty in this fresh test context.
        expect(isFilled).toBeFalsy();
      }
    });

    test('visual feedback element updates text appropriately on success and collision', async () => {
      // Success
      await app.enterKey('8');
      await app.clickAdd();
      await app.expectSuccessFeedback();

      // Collision
      await app.enterKey('8');
      await app.clickAdd();
      await app.expectCollisionFeedback();
    });

    test('boundary values: 0 and 9 should be valid and correctly map to buckets 0 and 9', async () => {
      // Add 0
      await app.enterKey('0');
      await app.clickAdd();
      await expect(app.bucket(0)).toHaveClass(/filled/);
      expect((await app.getBucketText(0))?.trim()).toBe('0');
      await app.expectSuccessFeedback();

      // Add 9
      await app.enterKey('9');
      await app.clickAdd();
      await expect(app.bucket(9)).toHaveClass(/filled/);
      expect((await app.getBucketText(9))?.trim()).toBe('9');
      await app.expectSuccessFeedback();
    });
  });

  test.describe('Event and Action Verification via DOM Effects', () => {
    test('verifies onEnter actions effects for invalid_input, collision, success, and filling_bucket', async () => {
      // invalid_input -> show_feedback_invalid
      await app.enterKey('bad');
      await app.clickAdd();
      await app.expectInvalidFeedback();

      // success path: filling_bucket -> mark_bucket_filled, then success -> show_feedback_success
      await app.enterKey('6');
      await app.clickAdd();
      await expect(app.bucket(6)).toHaveClass(/filled/);
      expect((await app.getBucketText(6))?.trim()).toBe('6');
      await app.expectSuccessFeedback();

      // collision path: show_feedback_collision
      await app.enterKey('6');
      await app.clickAdd();
      await app.expectCollisionFeedback();
    });

    test('ensures BUCKET_COMPUTED and BUCKET_EMPTY/ COLLISION_DETECTED lead to expected DOM outcomes', async () => {
      // Valid input: BUCKET_COMPUTED -> checking_collision
      const key = 1;
      await app.enterKey(String(key));
      await app.clickAdd();

      // BUCKET_EMPTY -> filling_bucket
      await expect(app.bucket(key)).toHaveClass(/filled/);
      expect((await app.getBucketText(key))?.trim()).toBe(String(key));
      await app.expectSuccessFeedback();

      // COLLISION_DETECTED -> collision for same key
      await app.enterKey(String(key));
      await app.clickAdd();
      await app.expectCollisionFeedback();
      await expect(app.bucket(key)).toHaveClass(/filled/);
      expect((await app.getBucketText(key))?.trim()).toBe(String(key));
    });
  });
});