# Page snapshot

```yaml
- generic [ref=e2]:
  - heading "Linear Regression" [level=2] [ref=e3]
  - paragraph [ref=e4]: "Enter your features and the target variable:"
  - generic [ref=e5]:
    - text: "Feature 1:"
    - spinbutton "Feature 1:" [active] [ref=e6]: "4210"
    - text: "Feature 2:"
    - spinbutton "Feature 2:" [ref=e7]: "20"
    - text: "Feature 3:"
    - spinbutton "Feature 3:" [ref=e8]: "30"
    - text: "Target Variable:"
    - spinbutton "Target Variable:" [ref=e9]: "50"
    - button "Predict" [ref=e10]
  - button "Reset" [ref=e12] [cursor=pointer]
```