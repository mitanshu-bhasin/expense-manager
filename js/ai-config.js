// Explyra AI Configuration — Dynamic Environment Routing
const AI_CONFIG = {
    url: (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
        ? 'https://api.groq.com/openai/v1/chat/completions'
        : '/api/ai/groq',
    model: 'moonshotai/kimi-k2-instruct-0905',
    apiKey: window.EXPLYRA_CONFIG?.ai?.apiKey || 'USE_BACKEND_API_ONLY'
};

window.AI_CONFIG = AI_CONFIG;
