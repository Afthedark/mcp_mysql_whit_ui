const OpenAI = require('openai');
const axios = require('axios');
require('dotenv').config();

/**
 * Generate AI response using configured provider (Ollama or OpenRouter)
 */
const generateResponse = async (messages) => {
    const provider = process.env.AI_PROVIDER || 'ollama';

    try {
        if (provider === 'openrouter') {
            const openai = new OpenAI({
                baseURL: 'https://openrouter.ai/api/v1',
                apiKey: process.env.OPENROUTER_API_KEY,
                defaultHeaders: {
                    'HTTP-Referer': 'http://localhost:3001',
                    'X-OpenRouter-Title': 'MCP MySQL Explorer',
                },
            });

            const completion = await openai.chat.completions.create({
                model: process.env.OPENROUTER_MODEL || 'meta-llama/llama-3-70b-instruct',
                messages: messages,
            });

            if (completion && completion.choices && completion.choices.length > 0) {
                return completion.choices[0].message.content;
            } else {
                throw new Error('Unexpected OpenRouter response');
            }
        } else if (provider === 'ollama') {
            const ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434/api/chat';
            const response = await axios.post(
                ollamaUrl,
                {
                    model: process.env.OLLAMA_MODEL || 'llama3.1:8b',
                    messages: messages,
                    stream: false
                },
                { timeout: 60000 }
            );

            if (response.data && response.data.message) {
                return response.data.message.content;
            } else {
                throw new Error('Unexpected Ollama response');
            }
        } else {
            throw new Error(`Unsupported AI provider: ${provider}`);
        }
    } catch (error) {
        console.error(`AI Service Error (${provider}):`, error.message);
        throw new Error(`AI response generation failed: ${error.message}`);
    }
};

module.exports = { generateResponse };
