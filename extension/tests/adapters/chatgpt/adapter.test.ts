import { beforeEach, describe, expect, it, vi } from 'vitest';
import supportedHtml from '../../fixtures/chatgpt-supported.html?raw';
import unsupportedHtml from '../../fixtures/chatgpt-unsupported.html?raw';
import { ChatGptAdapter } from '../../../src/adapters/chatgpt/adapter';

describe('ChatGptAdapter', () => {
  beforeEach(() => history.replaceState({}, '', '/c/beta'));

  it('supports localized current DOM without a transient send button', () => {
    document.body.innerHTML = supportedHtml;
    const adapter = new ChatGptAdapter(document, window);
    const snapshot = adapter.inspect();
    expect(adapter.id).toBe('chatgpt');
    expect(snapshot.ready).toBe(true);
    expect(snapshot.navRoot?.tagName).toBe('NAV');
    expect(snapshot.composerRoot?.tagName).toBe('FORM');
    expect(snapshot.sendButton).toBeNull();
    expect(snapshot.auxiliaryRoots).toEqual([]);
    expect(snapshot.activeTitle).toBe('Beta report');
    expect(snapshot.conversations).toEqual([
      { id: 'alpha', title: 'Alpha brief', href: '/c/alpha', active: false },
      { id: 'beta', title: 'Beta report', href: '/c/beta', active: true },
    ]);
  });

  it('fails readiness when required targets are absent', () => {
    document.body.innerHTML = unsupportedHtml;
    expect(new ChatGptAdapter(document, window).inspect().ready).toBe(false);
  });

  it('delegates native actions to host controls', () => {
    document.body.innerHTML = supportedHtml;
    const adapter = new ChatGptAdapter(document, window);
    const newChat = vi.spyOn(document.querySelector<HTMLAnchorElement>('[data-testid="create-new-chat-button"]')!, 'click')
      .mockImplementation(() => undefined);
    const attach = vi.spyOn(document.querySelector<HTMLButtonElement>('[data-testid="composer-plus-btn"]')!, 'click')
      .mockImplementation(() => undefined);
    adapter.createConversation();
    adapter.attachFile();
    expect(newChat).toHaveBeenCalledOnce();
    expect(attach).toHaveBeenCalledOnce();
  });

  it('returns cleanup that disconnects observation', () => {
    document.body.innerHTML = supportedHtml;
    const disconnect = vi.spyOn(MutationObserver.prototype, 'disconnect');
    const cleanup = new ChatGptAdapter(document, window).observe(vi.fn());
    cleanup();
    expect(disconnect).toHaveBeenCalledOnce();
  });

  it('batches streaming mutations and reacts to SPA navigation', async () => {
    document.body.innerHTML = supportedHtml;
    const onChange = vi.fn();
    const cleanup = new ChatGptAdapter(document, window).observe(onChange);
    document.querySelector('main')?.append(document.createElement('article'));
    await vi.waitFor(() => expect(onChange).toHaveBeenCalledTimes(1));
    window.dispatchEvent(new PopStateEvent('popstate'));
    await vi.waitFor(() => expect(onChange).toHaveBeenCalledTimes(2));
    cleanup();
  });
});
