import { GoogleGenAI } from '@google/genai';
import { ChatMessage } from '../types';

const buildTranscript = (messages: ChatMessage[]): string => {
  return messages
    .map((message) => `${message.role === 'model' ? 'Assistant' : 'User'}: ${message.text}`)
    .join('\n\n');
};

export const sendMessageToGemini = async (
  messages: ChatMessage[],
  model: string,
  systemPrompt: string,
  apiKey?: string
): Promise<string> => {
  const resolvedApiKey = apiKey || import.meta.env.VITE_GEMINI_API_KEY;

  if (!resolvedApiKey) {
    throw new Error('Gemini API key is missing.');
  }

  const ai = new GoogleGenAI({ apiKey: resolvedApiKey });
  const response = await ai.models.generateContent({
    model,
    contents: `${systemPrompt}\n\nConversation transcript:\n${buildTranscript(messages)}\n\nReply as the assistant.`,
  });

  if (!response.text?.trim()) {
    throw new Error('Gemini returned an empty response.');
  }

  return response.text;
};
