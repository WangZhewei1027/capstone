# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - heading "Two Pointers Technique Demonstration" [level=1] [ref=e2]
  - generic [ref=e3]:
    - 'heading "1. Example Problem: Pair Sum in Sorted Array" [level=2] [ref=e4]'
    - paragraph [ref=e5]:
      - text: Given a
      - strong [ref=e6]: sorted
      - text: array of integers, determine if there exist two numbers that add up to a
      - emphasis [ref=e7]: target sum
      - text: .
    - generic [ref=e8]: "Enter a sorted array (comma separated):"
    - textbox "Enter a sorted array (comma separated):" [ref=e9]:
      - /placeholder: e.g. 1, 2, 3, 4, 6, 8
      - text: 1, 2, 3, 4, 6, 8
    - generic [ref=e10]: "Enter target sum:"
    - spinbutton "Enter target sum:" [ref=e11]: "10"
    - button "Check Pair" [ref=e12] [cursor=pointer]
    - generic [ref=e14]:
      - strong [ref=e15]: "How it works:"
      - text: "We use two pointers starting at the beginning and end of the array. We sum their values:"
      - list [ref=e16]:
        - listitem [ref=e17]: If the sum equals the target, we have found our pair.
        - listitem [ref=e18]: If the sum is less than the target, move left pointer right to increase sum.
        - listitem [ref=e19]: If the sum is greater than the target, move right pointer left to decrease sum.
  - generic [ref=e20]:
    - heading "2. Visualization of Two Pointers" [level=2] [ref=e21]
    - paragraph [ref=e22]: Watch how the two pointers move through the array to find the sum.
    - button "Start Visualization" [ref=e23] [cursor=pointer]
```