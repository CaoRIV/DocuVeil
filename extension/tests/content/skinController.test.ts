import { describe, expect, it, vi } from 'vitest';
import type { AdapterSnapshot, PlatformAdapter } from '../../src/adapters/platformAdapter';
import { SkinController } from '../../src/content/skinController';
import type { PlatformId } from '../../src/shared/platform';

function snapshot(ready = true, auxiliaryRoots: HTMLElement[] = []): AdapterSnapshot {
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
    auxiliaryRoots,
    activeTitle: 'Document',
    conversations: [],
  };
}

function adapter(current: AdapterSnapshot, id: PlatformId = 'chatgpt'): PlatformAdapter {
  return {
    id,
    inspect: vi.fn(() => current),
    openConversation: vi.fn(),
    createConversation: vi.fn(),
    attachFile: vi.fn(),
    observe: vi.fn(() => vi.fn()),
  };
}

describe('SkinController', () => {
  it('never reparents a native composer during enable and refresh', () => {
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
      expect(host.firstElementChild).toBe(form);
      controller.refresh();
      expect(form.nextSibling).toBe(next);
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
    expect(document.documentElement.dataset.docuveilPlatform).toBe('chatgpt');
    controller.setEnabled(false);
    expect(document.querySelector('[data-docuveil-shell]')).toBeNull();
    expect(document.documentElement.classList.contains('docuveil-enabled')).toBe(false);
    expect(document.documentElement.hasAttribute('data-docuveil-platform')).toBe(false);
  });

  it('leaves native Claude visible and reports platform-specific incompatibility', () => {
    const controller = new SkinController(document, adapter(snapshot(false), 'claude'));
    controller.setEnabled(true);
    expect(document.documentElement.classList.contains('docuveil-enabled')).toBe(false);
    expect(document.querySelector('[data-docuveil-compatibility]')?.textContent)
      .toContain('this Claude interface is not supported');
    expect(document.querySelector('[data-docuveil-compatibility]')?.textContent)
      .toContain('Native Claude remains available');
    controller.destroy();
  });

  it('marks auxiliary platform UI and removes every platform attribute on disable', () => {
    const auxiliary = document.createElement('aside');
    const controller = new SkinController(document, adapter(snapshot(true, [auxiliary]), 'claude'));
    try {
      controller.setEnabled(true);
      expect(document.documentElement.dataset.docuveilPlatform).toBe('claude');
      expect(auxiliary.getAttribute('data-docuveil-native')).toBe('auxiliary');
      controller.setEnabled(false);
      expect(document.documentElement.hasAttribute('data-docuveil-platform')).toBe(false);
      expect(auxiliary.hasAttribute('data-docuveil-native')).toBe(false);
    } finally {
      controller.destroy();
    }
  });

  it('recovers when a delayed host DOM becomes ready', () => {
    let current = snapshot(false);
    let refresh: (() => void) | undefined;
    const platform: PlatformAdapter = {
      id: 'chatgpt',
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
