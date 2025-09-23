import OpenAI from "openai";
// 实例化
const client = new OpenAI({
  apiKey: "sk-TMWW3DAvUDjmpLr61kzSLPlJuzTbksEM1tyj7JyM1jHoafzg", // xxx为GitHub授权的每个账号的key值
  baseURL: "https://turingai.plus/v1",
});

async function main() {
  const chatCompletion = await client.chat.completions.create({
    messages: [{ role: "user", content: "你是谁创造的？" }],
    model: "gpt-4o-mini",
  });
  console.log(chatCompletion.choices[0].message);
}

main();
