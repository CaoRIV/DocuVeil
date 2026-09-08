export const claudeSelectors = {
  navigationRoot: '[data-testid="sidebar"]',
  conversationRoot: 'main',
  composer: '[data-testid="chat-input"][contenteditable="true"][role="textbox"]',
  sendButton: '[data-testid="chat-input-send"]',
  newChatButton: '[data-testid="sidebar"] a[href="/new"]',
  conversationLinks: '[data-testid="sidebar"] a[href^="/chat/"]',
  artifactRoot: '[role="region"][aria-label^="Artifact panel:"]',
} as const;
