import { ChatGptAdapter } from './chatgpt/adapter';
import { ClaudeAdapter } from './claude/adapter';
import type { PlatformAdapter } from './platformAdapter';
import type { PlatformId } from '../shared/platform';

export function createPlatformAdapter(
  platform: PlatformId,
  doc: Document,
  win: Window,
): PlatformAdapter {
  return platform === 'chatgpt'
    ? new ChatGptAdapter(doc, win)
    : new ClaudeAdapter(doc, win);
}
