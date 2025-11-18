# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - banner [ref=e2]:
    - heading "K-Nearest Neighbors (KNN) Interactive Exploration" [level=1] [ref=e3]
  - generic [ref=e4]:
    - heading "What is KNN?" [level=2] [ref=e5]
    - paragraph [ref=e6]: K-Nearest Neighbors is a simple, instance-based learning algorithm that classifies data points based on the closest training examples in the feature space. It can be used for both classification and regression tasks.
  - generic [ref=e7]:
    - heading "How KNN Works" [level=2] [ref=e8]
    - paragraph [ref=e9]: Given a data point to classify, KNN identifies the 'K' nearest neighbors from the training dataset and assigns the majority class among those neighbors to the new point.
  - generic [ref=e10]:
    - heading "Interactive Simulation" [level=2] [ref=e11]
    - generic [ref=e13]:
      - generic [ref=e14]:
        - text: "Select K:"
        - spinbutton "Select K:" [ref=e15]: "3"
      - generic [ref=e16]:
        - button "Clear Points" [ref=e17] [cursor=pointer]
        - button "Predict Class" [ref=e18] [cursor=pointer]
  - generic [ref=e19]:
    - heading "How to Use" [level=2] [ref=e20]
    - list [ref=e21]:
      - listitem [ref=e22]: Click on the canvas to place data points.
      - listitem [ref=e23]: Use the slider to select the value of K.
      - listitem [ref=e24]: Click "Predict Class" to see the classification based on KNN.
      - listitem [ref=e25]: Press "Clear Points" to start over.
  - contentinfo [ref=e26]:
    - paragraph [ref=e27]: Developed by [Your Name] | Inspired by K-Nearest Neighbors Algorithm
```