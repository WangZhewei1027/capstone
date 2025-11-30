# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - heading "Linear Search Visualization" [level=1] [ref=e2]
  - generic [ref=e3]: "Enter array elements (comma separated):"
  - textbox "Enter array elements (comma separated):" [ref=e4]:
    - /placeholder: e.g. 3, 6, 8, 2, 10
    - text: 3,6,8,2,10,7,4
  - generic [ref=e5]: "Enter target element to search:"
  - spinbutton "Enter target element to search:" [ref=e6]
  - generic [ref=e7]:
    - generic [ref=e8]: "Animation Speed: 500 ms"
    - 'slider "Animation Speed: 500 ms" [ref=e9]': "500"
  - button "Start Linear Search" [ref=e10] [cursor=pointer]
  - button "Reset" [disabled] [ref=e11]
  - generic "Array elements container" [ref=e12]:
    - generic [ref=e13]: "3"
    - generic [ref=e14]: "6"
    - generic [ref=e15]: "8"
    - generic [ref=e16]: "2"
    - generic [ref=e17]: "10"
    - generic [ref=e18]: "7"
    - generic [ref=e19]: "4"
  - alert [ref=e20]
  - contentinfo [ref=e21]: "Linear search algorithm: Sequentially checks each element to find the target."
```