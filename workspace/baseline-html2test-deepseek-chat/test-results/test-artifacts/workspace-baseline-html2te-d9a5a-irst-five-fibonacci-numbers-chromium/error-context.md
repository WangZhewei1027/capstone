# Page snapshot

```yaml
- generic [ref=e2]:
  - heading "Recursion Demonstration" [level=1] [ref=e3]
  - generic [ref=e4]:
    - heading "1. Factorial Calculator" [level=2] [ref=e5]
    - paragraph [ref=e6]: "Enter a number to calculate its factorial:"
    - spinbutton [ref=e7]: "5"
    - button "Calculate Factorial" [ref=e8] [cursor=pointer]
    - generic [ref=e9]: "5! = 120 Calculation time: 0.10ms"
  - generic [ref=e10]:
    - heading "2. Fibonacci Sequence" [level=2] [ref=e11]
    - paragraph [ref=e12]: "Enter the number of Fibonacci numbers to generate:"
    - spinbutton [ref=e13]: "5"
    - button "Generate Fibonacci" [active] [ref=e14] [cursor=pointer]
    - generic [ref=e15]: "Fibonacci sequence (5 numbers): 0, 1 Calculation time: 0.20ms"
  - generic [ref=e16]:
    - heading "3. Recursive Directory Structure" [level=2] [ref=e17]
    - paragraph [ref=e18]: "Simulated file system traversal:"
    - button "Show Directory Structure" [ref=e19] [cursor=pointer]
    - generic [ref=e20]: "Directory Structure: 📁 Root 📁 Documents 📄 resume.pdf 📄 project.docx 📁 Photos 📄 vacation.jpg 📄 portrait.png 📁 Code 📄 script.js 📁 src 📄 main.js 📄 utils.js 📄 readme.txt"
  - generic [ref=e21]:
    - heading "4. Visual Recursion - Nested Squares" [level=2] [ref=e22]
    - paragraph [ref=e23]: "Click to create recursive nested squares:"
    - button "Create Nested Squares" [ref=e24] [cursor=pointer]
```