import { ChatMessage } from '../types';

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;

export interface OpenRouterResponse {
    choices: {
        message: {
            role: 'assistant';
            content: string;
        };
    }[];
}

export const sendMessageToOpenRouter = async (
    messages: ChatMessage[],
    model: string = 'deepseek/deepseek-r1-0528:free',
    systemPrompt: string
): Promise<string> => {
    if (!API_KEY) {
        console.warn('VITE_OPENROUTER_API_KEY is missing');
        // Return a mock response if no key is present (or throw error)
        // throw new Error('API Key missing');
    }

    // Convert ChatMessage to OpenRouter format
    const apiMessages = [
        { role: 'system', content: systemPrompt },
        ...messages.map(msg => ({
            role: msg.role === 'model' ? 'assistant' : msg.role,
            content: msg.text
        }))
    ];

    try {
        const response = await fetch(OPENROUTER_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`,
                'HTTP-Referer': 'http://localhost:5173', // Required by OpenRouter
                'X-Title': 'Noeman Kernel', // Optional
            },
            body: JSON.stringify({
                model: model,
                messages: apiMessages,
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`OpenRouter API Error: ${errorData.error?.message || response.statusText}`);
        }

        const data: OpenRouterResponse = await response.json();
        return data.choices[0].message.content;
    } catch (error) {
        console.error('Failed to fetch from OpenRouter:', error);
        throw error;
    }
};
