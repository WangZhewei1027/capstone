# Page snapshot

```yaml
- generic [ref=e2]:
  - heading "JavaScript Array Demonstration" [level=1] [ref=e3]
  - paragraph [ref=e4]: An array is a special variable that can hold more than one value at a time. It's a fundamental data structure for storing ordered collections of items.
  - heading "Our Current Array" [level=2] [ref=e5]
  - generic [ref=e6]:
    - generic [ref=e7]: AVOCADO
    - generic [ref=e8]: BANANA
    - generic [ref=e9]: BLUEBERRY
    - generic [ref=e10]: MANGO
    - generic [ref=e11]: ORANGE
  - paragraph [ref=e12]:
    - strong [ref=e13]: "Current State:"
    - code [ref=e14]: "[\"AVOCADO\", \"BANANA\", \"BLUEBERRY\", \"MANGO\", \"ORANGE\"]"
  - paragraph [ref=e15]:
    - strong [ref=e16]: "Length:"
    - text: "5"
  - separator [ref=e17]
  - heading "Manipulate the Array" [level=2] [ref=e18]
  - generic [ref=e19]:
    - textbox "Enter an item" [ref=e20] [cursor=pointer]
    - button "Add to End (push)" [ref=e21] [cursor=pointer]
    - button "Add to Start (unshift)" [ref=e22] [cursor=pointer]
    - button "Remove from End (pop)" [ref=e23] [cursor=pointer]
    - button "Remove from Start (shift)" [active] [ref=e24] [cursor=pointer]
  - separator [ref=e25]
  - heading "Other Common Methods" [level=2] [ref=e26]
  - generic [ref=e27]:
    - button "Sort (sort)" [ref=e28] [cursor=pointer]
    - button "Reverse (reverse)" [ref=e29] [cursor=pointer]
    - button "Find 'Apple' (find)" [ref=e30] [cursor=pointer]
    - button "Filter items > length 5 (filter)" [ref=e31] [cursor=pointer]
    - button "Capitalize All (map)" [ref=e32] [cursor=pointer]
    - button "Reset Array" [ref=e33] [cursor=pointer]
  - heading "Result of Last Operation:" [level=3] [ref=e34]
  - generic [ref=e35]: Shifted "APPLE" from the start of the array.
```