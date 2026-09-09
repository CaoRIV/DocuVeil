import { beforeEach, describe, expect, it, vi } from 'vitest';
import supportedHtml from '../../fixtures/claude-supported.html?raw';
import unsupportedHtml from '../../fixtures/claude-unsupported.html?raw';
import capturedLayout from '../../fixtures/claude-layout.html?raw';
import { ClaudeAdapter } from '../../../src/adapters/claude/adapter';

describe('ClaudeAdapter', () => {
  beforeEach(() => history.replaceState({}, '', '/chat/beta'));

  it('detects the fieldset-free sticky composer and excludes response footer actions', () => {
    document.body.innerHTML = new DOMParser().parseFromString(capturedLayout, 'text/html').body.innerHTML;
    const snapshot = new ClaudeAdapter(document, window).inspect();
    expect(snapshot.ready).toBe(true);
    expect(snapshot.composerRoot).toBe(document.querySelector('.native-composer'));
    expect(snapshot.composerRoot?.contains(snapshot.composer)).toBe(true);
    expect(snapshot.composerRoot?.contains(document.querySelector('[data-testid="chat-footer-spark"]'))).toBe(false);
  });

  it('normalizes a supported Claude chat and preserves its Artifact root', () => {
    document.body.innerHTML = supportedHtml;
    const adapter = new ClaudeAdapter(document, window);
    const snapshot = adapter.inspect();

    expect(adapter.id).toBe('claude');
    expect(snapshot.ready).toBe(true);
    expect(snapshot.navRoot?.getAttribute('data-testid')).toBe('sidebar');
    expect(snapshot.conversationRoot?.tagName).toBe('MAIN');
    expect(snapshot.composerRoot?.tagName).toBe('FIELDSET');
    expect(snapshot.composer?.getAttribute('data-testid')).toBe('chat-input');
    expect(snapshot.sendButton?.getAttribute('data-testid')).toBe('chat-input-send');
    expect(snapshot.activeTitle).toBe('Beta conversation');
    expect(snapshot.conversations).toEqual([
      { id: 'alpha', title: 'Alpha conversation', href: '/chat/alpha', active: false },
      { id: 'beta', title: 'Beta conversation', href: '/chat/beta', active: true },
    ]);
    expect(snapshot.auxiliaryRoots).toEqual([
      document.querySelector('[role="region"][aria-label^="Artifact panel:"]'),
    ]);
  });

  it('fails readiness when the native Claude editor is absent', () => {
    document.body.innerHTML = unsupportedHtml;
    expect(new ClaudeAdapter(document, window).inspect().ready).toBe(false);
  });

  it('delegates chat navigation to Claude controls and leaves uploads native-only', () => {
    document.body.innerHTML = supportedHtml;
    const adapter = new ClaudeAdapter(document, window);
    const newChat = vi.spyOn(document.querySelector<HTMLAnchorElement>('a[href="/new"]')!, 'click')
      .mockImplementation(() => undefined);
    const conversation = vi.spyOn(document.querySelector<HTMLAnchorElement>('a[href="/chat/alpha"]')!, 'click')
      .mockImplementation(() => undefined);
    const attach = vi.spyOn(document.querySelector<HTMLButtonElement>('[data-testid="chat-input-attach"]')!, 'click')
      .mockImplementation(() => undefined);

    adapter.createConversation();
    adapter.openConversation('/chat/alpha');
    adapter.attachFile();

    expect(newChat).toHaveBeenCalledOnce();
    expect(conversation).toHaveBeenCalledOnce();
    expect(attach).not.toHaveBeenCalled();
  });

  it('returns cleanup that disconnects observation', () => {
    document.body.innerHTML = supportedHtml;
    const disconnect = vi.spyOn(MutationObserver.prototype, 'disconnect');
    const cleanup = new ClaudeAdapter(document, window).observe(vi.fn());
    cleanup();
    expect(disconnect).toHaveBeenCalledOnce();
  });

  it('batches streaming mutations and reacts to SPA navigation', async () => {
    document.body.innerHTML = supportedHtml;
    const onChange = vi.fn();
    const cleanup = new ClaudeAdapter(document, window).observe(onChange);
    document.querySelector('main')?.append(document.createTextNode(' streamed'));
    document.querySelector('main')?.append(document.createTextNode(' response'));
    await vi.waitFor(() => expect(onChange).toHaveBeenCalledTimes(1));
    window.dispatchEvent(new PopStateEvent('popstate'));
    await vi.waitFor(() => expect(onChange).toHaveBeenCalledTimes(2));
    cleanup();
  });
});
