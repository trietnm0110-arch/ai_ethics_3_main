import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import { AI_ETHICS_SYSTEM_PROMPT } from './systemPrompt.js';

dotenv.config();

export async function handleChatWithGemini(messages: Array<{ role: 'user' | 'model'; content: string }>) {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) throw new Error('GEMINI_API_KEY is not configured');

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    // Format messages for @google/genai
    const formattedContents = messages.map((m) => ({
      role: m.role,
      parts: [{ text: m.content }],
    }));

    const response = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL?.trim() || 'gemini-2.5-flash',
      contents: formattedContents,
      config: {
        systemInstruction: AI_ETHICS_SYSTEM_PROMPT,
        temperature: 0.7,
      },
    });

    return response.text || 'Xin lỗi, hiện tại thầy chưa xử lý được câu trả lời. Em vui lòng thử lại nhé!';
  } catch (error: unknown) {
    console.error('Error calling Gemini API in server:', error instanceof Error ? error.name : 'Unknown error');
    throw error;
  }
}
