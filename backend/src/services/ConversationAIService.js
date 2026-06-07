const OpenAIProvider = require('./ai/OpenAIProvider');

class ConversationAIService {
  createProvider(config = {}) {
    return new OpenAIProvider({
      apiKey: config.apiKey,
      model: config.model,
    });
  }

  async generateReply({ config, prompt, context }) {
    const provider = this.createProvider(config);
    return provider.generateReply({ prompt, context });
  }
}

module.exports = new ConversationAIService();
