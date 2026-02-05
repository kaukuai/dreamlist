import { GoogleGenAI } from "@google/genai";

let ai: GoogleGenAI | null = null;

try {
  // Check if API_KEY is provided before initializing
  if (process.env.API_KEY) {
    ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  } else {
    console.warn("API Key is missing. AI features will be disabled.");
  }
} catch (error) {
  console.error("Failed to initialize GoogleGenAI:", error);
}

export const getMotivationalInspiration = async (dreams: string[]): Promise<string> => {
  if (!ai) {
    return "請在 Vercel 設定環境變數 API_KEY 來啟用西施惠的鼓勵唷！";
  }

  try {
    const dreamsList = dreams.length > 0 ? `目前夢想有：${dreams.join('、')}` : "目前還沒有登記目標";
    const prompt = `你是一位像《動物森友會》裡西施惠一樣溫暖、樂觀的人。根據用戶的夢想（${dreamsList}），寫一段 50 字以內的話鼓勵他。要多用口語，比如「唷！」、「嘿嘿」、「一起加油吧！」，並帶著一點點對美好生活的嚮往。請直接回覆文字。`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        temperature: 0.9,
      }
    });

    return response.text || "嘿嘿，看到你在為夢想努力，我覺得今天天氣都變好了喔！加油唷！";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "心之所向，就是最美的風景。今天也要開開心心地往夢想前進喔！";
  }
};
