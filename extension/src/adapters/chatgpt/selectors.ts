export const chatGptSelectors = {
  historyRoot: '#history',
  conversationRoot: 'main',
  composer: '#prompt-textarea',
  sendButton: '[data-testid="send-button"], button[type="submit"]',
  newChatButton: '[data-testid="create-new-chat-button"]',
  attachmentButton: '#composer-plus-btn, [data-testid="composer-plus-btn"]',
  conversationLinks: '#history a[href^="/c/"]',
} as const;
