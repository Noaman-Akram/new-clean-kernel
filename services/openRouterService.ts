import { ChatMessage } from '../types';

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

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
    systemPrompt: string,
    apiKey?: string
): Promise<string> => {
    const resolvedApiKey = apiKey || import.meta.env.VITE_OPENROUTER_API_KEY;

    if (!resolvedApiKey) {
        throw new Error('OpenRouter API key is missing.');
    }

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
                'Authorization': `Bearer ${resolvedApiKey}`,
                'HTTP-Referer': window.location.origin,
                'X-Title': 'Noeman Kernel',
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
