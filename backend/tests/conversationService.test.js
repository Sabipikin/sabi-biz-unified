jest.mock('../src/config/db', () => ({
  query: jest.fn(),
}));

jest.mock('../src/services/whatsappService', () => ({
  sendMessage: jest.fn(),
}));

jest.mock('../src/services/conversationEngine', () => ({
  addMessage: jest.fn(),
}));

const { query } = require('../src/config/db');
const conversationService = require('../src/services/conversationService');

describe('conversationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('list returns tenant-scoped conversations with dashboard summary', async () => {
    query.mockResolvedValueOnce({
      rows: [
        {
          id: 'conversation-1',
          user_id: 'user-1',
          status: 'active',
          ai_status: 'ai_handled',
          unread_count: 2,
          last_message_text: 'How much is rice?',
        },
        {
          id: 'conversation-2',
          user_id: 'user-1',
          status: 'needs_human',
          ai_status: 'human_takeover',
          unread_count: 1,
          last_message_text: 'I need an agent',
        },
      ],
    });

    const result = await conversationService.list('user-1');

    expect(query).toHaveBeenCalledWith(expect.stringContaining('WHERE c.user_id = $1'), ['user-1']);
    expect(result.summary).toEqual({
      active_chats: 1,
      ai_handled_chats: 1,
      human_takeover: 1,
      unread_messages: 3,
    });
    expect(result.conversations).toHaveLength(2);
  });

  test('assign moves a conversation into human takeover for the current tenant', async () => {
    query.mockResolvedValueOnce({
      rows: [{ id: 'conversation-1', user_id: 'user-1', ai_status: 'human_takeover' }],
    });

    const result = await conversationService.assign('user-1', 'conversation-1');

    expect(query).toHaveBeenCalledWith(
      expect.stringContaining("ai_status = 'human_takeover'"),
      [null, 'user-1', 'conversation-1']
    );
    expect(result.id).toBe('conversation-1');
  });
});
