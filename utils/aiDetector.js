const axios = require('axios');

const SAPLING_API_KEY = process.env.SAPLING_API_KEY;

async function detectAIContent(text) {
  try {
    const response = await axios.post('https://api.sapling.ai/api/v1/aidetect', {
      key: SAPLING_API_KEY,
      text: text
    });

    const score = response.data.score; // A float between 0–1 (1 = human, 0 = AI)
    return 1 - score; // Invert it so 1 = AI
  } catch (err) {
    console.error('AI Detection failed:', err.response?.data || err.message);
    return null;
  }
}

module.exports = detectAIContent;
