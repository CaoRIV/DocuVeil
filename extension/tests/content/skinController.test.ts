import { describe, expect, it, vi } from 'vitest';
import type { AdapterSnapshot, PlatformAdapter } from '../../src/adapters/platformAdapter';
import { SkinController } from '../../src/content/skinController';

function snapshot(ready = true): AdapterSnapshot {
  const create = () => document.createElement('div');
  return {
    ready,
    navRoot: ready ? create() : null,
    conversationRoot: ready ? create() : null,
    composerRoot: ready ? create() : null,
    composer: ready ? create() : null,
    sendButton: ready ? create() : null,
    newChatButton: ready ? create() : null,
    attachmentButton: null,
    activeTitle: 'Document',
    conversations: [],
  };
}

function adapter(current: AdapterSnapshot): PlatformAdapter {
  return {
    inspect: vi.fn(() => current),
    openConversation: vi.fn(),
    createConversation: vi.fn(),
    attachFile: vi.fn(),
    observe: vi.fn(() => vi.fn()),
  };
}

describe('SkinController', () => {
  it('places an external composer in the page and restores its exact position', () => {
    const current = snapshot();
    const page = current.conversationRoot!;
    const host = document.createElement('section');
    const form = current.composerRoot!;
    const next = document.createElement('span');
    host.append(form, next);
    document.body.append(page, host);
    const controller = new SkinController(document, adapter(current));
    try {
      controller.setEnabled(true);
      expect(page.contains(form)).toBe(true);
      controller.refresh();
      expect(page.lastElementChild).toBe(form);
      controller.setEnabled(false);
      expect(host.firstElementChild).toBe(form);
      expect(form.nextSibling).toBe(next);
    } finally {
      controller.destroy();
      page.remove();
      host.remove();
    }
  });

  it('keeps native nested composer nodes in place and releases their layout wrappers', () => {
    const current = snapshot();
    const page = current.conversationRoot!;
    const wrapper = document.createElement('div');
    wrapper.append(current.composerRoot!);
    page.append(wrapper);
    document.body.append(page);
    const controller = new SkinController(document, adapter(current));
    try {
      controller.setEnabled(true);
      expect(current.composerRoot!.parentElement).toBe(wrapper);
      expect(wrapper.hasAttribute('data-docuveil-composer-path')).toBe(true);
      controller.setEnabled(false);
      expect(wrapper.hasAttribute('data-docuveil-composer-path')).toBe(false);
      expect(current.composerRoot!.parentElement).toBe(wrapper);
    } finally {
      controller.destroy();
      page.remove();
    }
  });

  it('mounts once and unmounts cleanly', () => {
    const platform = adapter(snapshot());
    const controller = new SkinController(document, platform);
    controller.setEnabled(true);
    controller.setEnabled(true);
    expect(document.querySelectorAll('[data-docuveil-shell]')).toHaveLength(1);
    expect(platform.observe).toHaveBeenCalledOnce();
    expect(document.documentElement.classList.contains('docuveil-enabled')).toBe(true);
    controller.setEnabled(false);
    expect(document.querySelector('[data-docuveil-shell]')).toBeNull();
    expect(document.documentElement.classList.contains('docuveil-enabled')).toBe(false);
  });

  it('leaves native UI visible and reports incompatibility', () => {
    const controller = new SkinController(document, adapter(snapshot(false)));
    controller.setEnabled(true);
    expect(document.documentElement.classList.contains('docuveil-enabled')).toBe(false);
    expect(document.querySelector('[data-docuveil-compatibility]')?.textContent)
      .toContain('ChatGPT interface is not supported');
    controller.destroy();
  });

  it('recovers when a delayed host DOM becomes ready', () => {
    let current = snapshot(false);
    let refresh: (() => void) | undefined;
    const platform: PlatformAdapter = {
      inspect: () => current,
      openConversation: vi.fn(),
      createConversation: vi.fn(),
      attachFile: vi.fn(),
      observe: (onChange) => {
        refresh = onChange;
        return vi.fn();
      },
    };
    const controller = new SkinController(document, platform);
    controller.setEnabled(true);
    current = snapshot(true);
    refresh?.();
    expect(document.documentElement.classList.contains('docuveil-enabled')).toBe(true);
    expect(document.querySelector('[data-docuveil-compatibility]')).toBeNull();
    controller.destroy();
  });

  it('removes every marker and observer on destroy', () => {
    const platform = adapter(snapshot());
    const stopObserving = vi.fn();
    vi.mocked(platform.observe).mockReturnValue(stopObserving);
    const controller = new SkinController(document, platform);
    controller.setEnabled(true);
    controller.destroy();
    expect(document.querySelector('[data-docuveil-shell]')).toBeNull();
    expect(document.documentElement.classList.contains('docuveil-enabled')).toBe(false);
    expect(platform.observe).toHaveBeenCalledOnce();
    expect(stopObserving).toHaveBeenCalledOnce();
  });
});
