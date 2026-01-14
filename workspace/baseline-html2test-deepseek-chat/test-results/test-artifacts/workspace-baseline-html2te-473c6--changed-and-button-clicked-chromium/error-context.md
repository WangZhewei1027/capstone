# Page snapshot

```yaml
- generic [ref=e2]:
  - heading "Recursion Demonstration" [level=1] [ref=e3]
  - paragraph [ref=e4]: Recursion is a programming technique where a function calls itself to solve a problem by breaking it down into smaller, similar subproblems.
  - generic [ref=e5]:
    - heading "1. Factorial Calculator" [level=2] [ref=e6]
    - paragraph [ref=e7]: Calculate n! = n × (n-1) × ... × 1 using recursion
    - spinbutton [ref=e8]: "5"
    - button "Calculate Factorial" [ref=e9] [cursor=pointer]
    - generic [ref=e10]: 5! = 120
  - generic [ref=e11]:
    - heading "2. Fibonacci Sequence" [level=2] [ref=e12]
    - paragraph [ref=e13]: Generate Fibonacci numbers where each number is the sum of the two preceding ones
    - spinbutton [ref=e14]: "6"
    - button "Calculate Fibonacci" [ref=e15] [cursor=pointer]
    - generic [ref=e16]: "Fibonacci sequence up to F(6): 0, 1, 1, 2, 3, 5, 8"
  - generic [ref=e17]:
    - heading "3. Recursion Visualization" [level=2] [ref=e18]
    - paragraph [ref=e19]: Watch how recursive calls build up and wind down
    - button "Start Visualization" [ref=e20] [cursor=pointer]
  - generic [ref=e22]:
    - heading "4. Directory Tree Generator" [level=2] [ref=e23]
    - paragraph [ref=e24]: Simulate recursively traversing a directory structure
    - button "Generate Random Tree" [ref=e25] [cursor=pointer]
```