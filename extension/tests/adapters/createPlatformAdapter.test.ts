import { describe, expect, it } from 'vitest';
import { ChatGptAdapter } from '../../src/adapters/chatgpt/adapter';
import { ClaudeAdapter } from '../../src/adapters/claude/adapter';
import { createPlatformAdapter } from '../../src/adapters/createPlatformAdapter';

describe('createPlatformAdapter', () => {
  it('creates the ChatGPT adapter for chatgpt.com', () => {
    expect(createPlatformAdapter('chatgpt', document, window)).toBeInstanceOf(ChatGptAdapter);
  });

  it('creates the Claude adapter for claude.ai', () => {
    expect(createPlatformAdapter('claude', document, window)).toBeInstanceOf(ClaudeAdapter);
  });
});
