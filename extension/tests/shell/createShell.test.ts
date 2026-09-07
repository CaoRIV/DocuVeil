import { describe, expect, it, vi } from 'vitest';
import type { AdapterSnapshot } from '../../src/adapters/platformAdapter';
import { createShell } from '../../src/shell/createShell';

function snapshot(): AdapterSnapshot {
  const node = document.createElement('div');
  return {
    ready: true,
    navRoot: node,
    conversationRoot: node,
    composerRoot: node,
    composer: node,
    sendButton: node,
    newChatButton: node,
    attachmentButton: node,
    activeTitle: 'Beta report',
    conversations: [
      { id: 'alpha', title: 'Alpha brief', href: '/c/alpha', active: false },
      { id: 'beta', title: 'Beta report', href: '/c/beta', active: true },
    ],
  };
}

describe('createShell', () => {
  it('renders branded chrome, current title, and real conversations', () => {
    const view = createShell(document, snapshot(), {
      openConversation: vi.fn(), createConversation: vi.fn(), attachFile: vi.fn(),
    });
    expect(view.root.getAttribute('data-docuveil-shell')).toBe('true');
    expect(view.root.textContent).toContain('DocuVeil');
    expect(view.root.textContent).toContain('Beta report');
    expect(view.root.querySelectorAll('[data-conversation-href]')).toHaveLength(2);
    view.destroy();
  });

  it('keeps decorative formatting controls out of the tab order', () => {
    const view = createShell(document, snapshot(), {
      openConversation: vi.fn(), createConversation: vi.fn(), attachFile: vi.fn(),
    });
    const decorative = [...view.root.querySelectorAll('[data-decorative]')];
    expect(decorative.length).toBeGreaterThan(0);
    expect(decorative.every((item) => item.getAttribute('aria-hidden') === 'true')).toBe(true);
    expect(decorative.every((item) => !item.hasAttribute('tabindex'))).toBe(true);
    view.destroy();
  });

  it('delegates conversation, new-chat, and attachment actions', () => {
    const actions = { openConversation: vi.fn(), createConversation: vi.fn(), attachFile: vi.fn() };
    const view = createShell(document, snapshot(), actions);
    view.root.querySelector<HTMLElement>('[data-conversation-href="/c/alpha"]')?.click();
    view.root.querySelector<HTMLElement>('[data-docuveil-new]')?.click();
    view.root.querySelector<HTMLElement>('[data-docuveil-attach]')?.click();
    expect(actions.openConversation).toHaveBeenCalledWith('/c/alpha');
    expect(actions.createConversation).toHaveBeenCalledOnce();
    expect(actions.attachFile).toHaveBeenCalledOnce();
    view.destroy();
  });
});
