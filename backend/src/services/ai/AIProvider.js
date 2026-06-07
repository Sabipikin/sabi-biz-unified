class AIProvider {
  async generateReply() {
    throw new Error('generateReply() must be implemented by an AI provider');
  }

  async summarizeConversation() {
    throw new Error('summarizeConversation() must be implemented by an AI provider');
  }

  async classifyIntent() {
    throw new Error('classifyIntent() must be implemented by an AI provider');
  }

  async extractLeadInformation() {
    throw new Error('extractLeadInformation() must be implemented by an AI provider');
  }
}

module.exports = AIProvider;
