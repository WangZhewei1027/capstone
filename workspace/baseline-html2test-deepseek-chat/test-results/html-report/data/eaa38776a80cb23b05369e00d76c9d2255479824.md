# Page snapshot

```yaml
- generic [ref=e2]:
  - heading "Sliding Window Algorithm" [level=1] [ref=e3]
  - generic [ref=e4]:
    - heading "What is the Sliding Window Technique?" [level=3] [ref=e5]
    - paragraph [ref=e6]: The sliding window technique is an algorithmic approach used to solve problems involving arrays or strings. It involves maintaining a window (subarray or substring) that slides through the data structure, avoiding redundant calculations by reusing previous computations.
    - heading "Key Benefits:" [level=3] [ref=e7]
    - list [ref=e8]:
      - listitem [ref=e9]: Reduces time complexity from O(n²) to O(n)
      - listitem [ref=e10]: Efficient for problems with contiguous subarrays/substrings
      - listitem [ref=e11]: Minimizes redundant calculations
  - generic [ref=e12]:
    - button "Reset" [ref=e13] [cursor=pointer]
    - button "Slide Left" [disabled] [ref=e14]
    - button "Slide Right" [ref=e15] [cursor=pointer]
    - button "Auto Slide" [ref=e16] [cursor=pointer]
  - generic [ref=e17]:
    - generic [ref=e18]: "Window Size: 3"
    - generic [ref=e19]: "Current Position: [0-2]"
    - generic [ref=e20]: "Current Sum: 6"
  - generic [ref=e21]:
    - generic [ref=e22]: "2"
    - generic [ref=e23]: "1"
    - generic [ref=e24]: "3"
    - generic [ref=e25]: "4"
    - generic [ref=e26]: "1"
    - generic [ref=e27]: "5"
    - generic [ref=e28]: "2"
    - generic [ref=e29]: "3"
    - generic [ref=e30]: "6"
  - generic [ref=e32]:
    - 'heading "Example: Maximum Sum of Subarray of Size K" [level=3] [ref=e33]'
    - code [ref=e34]: "function maxSumSubarray(arr, k) { let maxSum = 0; let windowSum = 0; let start = 0; for (let end = 0; end < arr.length; end++) { windowSum += arr[end]; if (end >= k - 1) { maxSum = Math.max(maxSum, windowSum); windowSum -= arr[start]; start++; } } return maxSum; }"
    - paragraph [ref=e35]:
      - text: "Try it:"
      - button "Calculate Max Sum" [ref=e36] [cursor=pointer]
```