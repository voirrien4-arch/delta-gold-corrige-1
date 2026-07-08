// Delta Gold - Mistral AI Integration
// Requires: MISTRAL_API_KEY, MISTRAL_INSTRUCTIONS in .env

import axios from 'axios';

const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY;
const MISTRAL_INSTRUCTIONS = process.env.MISTRAL_INSTRUCTIONS || 'Tu es Delta Gold, un assistant WhatsApp intelligent et amical créé par Mcamara. Réponds de manière concise et utile en français.';
const MISTRAL_API_URL = 'https://api.mistral.ai/v1/chat/completions';
const MISTRAL_MODEL = process.env.MISTRAL_MODEL || 'mistral-small-latest';

export async function askAI(prompt, systemPrompt) {
  if (!MISTRAL_API_KEY) {
    return '⚠️ Clé API Mistral non configurée. Ajoutez MISTRAL_API_KEY dans les variables d\'environnement sur Render.';
  }

  try {
    const response = await axios.post(MISTRAL_API_URL, {
      model: MISTRAL_MODEL,
      messages: [
        { role: 'system', content: systemPrompt || MISTRAL_INSTRUCTIONS },
        { role: 'user', content: prompt }
      ],
      max_tokens: 1024,
      temperature: 0.7,
    }, {
      headers: {
        'Authorization': `Bearer ${MISTRAL_API_KEY}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000,
    });

    return response.data.choices[0].message.content.trim();
  } catch (err) {
    const msg = err.response?.data?.message || err.message;
    console.error('Mistral AI error:', msg);
    return `⚠️ Erreur IA: ${msg}`;
  }
}
