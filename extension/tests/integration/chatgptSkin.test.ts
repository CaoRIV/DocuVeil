import { describe, expect, it, vi } from 'vitest';
import supportedHtml from '../fixtures/chatgpt-supported.html?raw';
import { ChatGptAdapter } from '../../src/adapters/chatgpt/adapter';
import { SkinController } from '../../src/content/skinController';
import skinCss from '../../styles/docuveil.css?raw';

describe('ChatGPT skin integration', () => {
  it('mounts around native rich content and restores the page', () => {
    document.body.innerHTML = supportedHtml;
    const code = document.querySelector('code');
    const heading = document.querySelector('h2');
    const table = document.querySelector('table');
    const image = document.querySelector('img');
    const composer = document.querySelector('#prompt-textarea');
    const nativeKeydown = vi.fn();
    composer?.addEventListener('keydown', nativeKeydown);
    const controller = new SkinController(document, new ChatGptAdapter(document, window));
    controller.setEnabled(true);
    expect(document.documentElement.classList.contains('docuveil-enabled')).toBe(true);
    expect(document.querySelector('code')).toBe(code);
    expect(document.querySelector('h2')).toBe(heading);
    expect(document.querySelector('table')).toBe(table);
    expect(document.querySelector('img')).toBe(image);
    expect(document.querySelector('#prompt-textarea')).toBe(composer);
    expect(document.querySelector('[data-docuveil-native="conversation"]')).not.toBeNull();
    composer?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(nativeKeydown).toHaveBeenCalledOnce();
    controller.setEnabled(false);
    expect(document.querySelector('[data-docuveil-shell]')).toBeNull();
    expect(document.querySelector('code')).toBe(code);
    expect(document.querySelector('#prompt-textarea')).toBe(composer);
  });

  it('scopes all host-page styling behind the enabled root class', () => {
    expect(skinCss).toContain(':root.docuveil-enabled');
    expect(skinCss).toContain('.docuveil-enabled [data-docuveil-native="conversation"]');
    expect(skinCss).not.toMatch(/(^|\n)body\s*\{/);
  });
});
