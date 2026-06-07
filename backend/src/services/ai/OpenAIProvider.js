const axios = require('axios');
const AIProvider = require('./AIProvider');

class OpenAIProvider extends AIProvider {
  constructor({ apiKey, model = 'gpt-4o-mini', timeout = 15000 } = {}) {
    super();
    this.apiKey = apiKey;
    this.model = model;
    this.timeout = timeout;
  }

  async complete(messages, { temperature = 0.4, maxTokens = 450 } = {}) {
    if (!this.apiKey) {
      throw new Error('OpenAI API key is not configured');
    }

    const response = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: this.model,
      messages,
      temperature,
      max_tokens: maxTokens,
    }, {
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: this.timeout,
    });

    return {
      text: response.data?.choices?.[0]?.message?.content?.trim() || '',
      tokensUsed: response.data?.usage?.total_tokens || null,
      model: this.model,
    };
  }

  async generateReply({ prompt, context }) {
    return this.complete([
      { role: 'system', content: prompt },
      { role: 'user', content: JSON.stringify(context) },
    ]);
  }

  async summarizeConversation({ messages }) {
    return this.complete([
      { role: 'system', content: 'Summarize this customer conversation for a sales support agent.' },
      { role: 'user', content: JSON.stringify(messages || []) },
    ], { maxTokens: 250 });
  }

  async classifyIntent({ messageText }) {
    return this.complete([
      { role: 'system', content: 'Classify the customer intent in one short label.' },
      { role: 'user', content: messageText || '' },
    ], { maxTokens: 40 });
  }

  async extractLeadInformation({ messageText }) {
    return this.complete([
      { role: 'system', content: 'Extract lead information as compact JSON.' },
      { role: 'user', content: messageText || '' },
    ], { maxTokens: 180 });
  }
}

module.exports = OpenAIProvider;
