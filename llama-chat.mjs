import OpenAI from "openai";

const openai = new OpenAI({
  baseURL:
    "https://ly27rtwnmzd55etf.us-east-1.aws.endpoints.huggingface.cloud/v1/",
  apiKey: "$HF_TOKEN",
});

const stream = await openai.chat.completions.create({
  model: "meta-llama/Llama-3.2-1B-Instruct",
  messages: [
    {
      role: "user",
      content: "What is deep learning?",
    },
  ],
  stream: true,
  max_tokens: 100,
});

for await (const chunk of stream) {
  console.log(chunk.choices[0]?.delta?.content || "");
}
