export const chatGptSelectors = {
  navRoot: 'nav[aria-label="Chat history"]',
  conversationRoot: 'main',
  composer: '#prompt-textarea',
  composerRoot: 'form[data-testid="composer-form"]',
  sendButton: '[data-testid="send-button"]',
  newChatButton: 'nav[aria-label="Chat history"] a[href="/"]',
  attachmentButton: '[aria-label="Attach files"], [data-testid="composer-plus-btn"]',
  conversationLinks: 'nav[aria-label="Chat history"] a[href^="/c/"]',
} as const;
