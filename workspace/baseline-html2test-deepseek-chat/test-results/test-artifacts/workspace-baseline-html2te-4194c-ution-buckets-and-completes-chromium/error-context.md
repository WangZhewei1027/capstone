# Page snapshot

```yaml
- generic [ref=e2]:
  - heading "Radix Sort Visualization" [level=1] [ref=e3]
  - generic [ref=e4]:
    - textbox "Enter numbers (comma-separated)" [ref=e5]: 170, 45, 75, 90, 2, 802, 24, 66
    - button "Random Array" [ref=e6] [cursor=pointer]
    - button "Start Radix Sort" [ref=e7] [cursor=pointer]
    - button "Next Step" [active] [ref=e8] [cursor=pointer]
    - button "Reset" [ref=e9] [cursor=pointer]
  - generic [ref=e10]:
    - strong [ref=e11]: "Current Array:"
    - generic [ref=e12]: "170"
    - generic [ref=e13]: "45"
    - generic [ref=e14]: "75"
    - generic [ref=e15]: "90"
    - generic [ref=e16]: "2"
    - generic [ref=e17]: "802"
    - generic [ref=e18]: "24"
    - generic [ref=e19]: "66"
  - generic [ref=e21]:
    - heading "How Radix Sort Works" [level=3] [ref=e22]
    - paragraph [ref=e23]: Radix Sort is a non-comparative sorting algorithm that sorts numbers by processing individual digits.
    - paragraph [ref=e24]:
      - strong [ref=e25]: "Steps:"
    - list [ref=e26]:
      - listitem [ref=e27]: Find the maximum number to know the number of digits
      - listitem [ref=e28]:
        - text: "Do following for each digit (starting from least significant digit):"
        - list [ref=e29]:
          - listitem [ref=e30]: Sort numbers based on current digit using counting sort (or bucket sort)
          - listitem [ref=e31]: Move to next more significant digit
    - paragraph [ref=e32]:
      - strong [ref=e33]: "Time Complexity:"
      - text: O(d*(n+b)) where d is number of digits, n is number of elements, and b is base (10 for decimal)
    - paragraph [ref=e34]:
      - strong [ref=e35]: "Space Complexity:"
      - text: O(n+b)
```