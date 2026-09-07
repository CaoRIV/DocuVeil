import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import supportedHtml from '../fixtures/chatgpt-supported.html?raw';
import { ChatGptAdapter } from '../../src/adapters/chatgpt/adapter';
import { SkinController } from '../../src/content/skinController';

const skinCss = readFileSync(resolve(process.cwd(), 'styles/docuveil.css'), 'utf8');

describe('ChatGPT skin integration', () => {
  it('keeps the desktop history visible and native hidden overlays transparent', () => {
    const style = document.createElement('style');
    style.textContent = '.native-overlay { opacity: 0; background: black; }' + skinCss;
    document.head.append(style);
    document.body.innerHTML = supportedHtml;
    const overlay = document.createElement('div');
    overlay.className = 'native-overlay';
    document.querySelector('form')!.append(overlay);
    const controller = new SkinController(document, new ChatGptAdapter(document, window));
    try {
      controller.setEnabled(true);
      expect(getComputedStyle(document.querySelector('.docuveil-sidebar')!).display).not.toBe('none');
      expect(getComputedStyle(overlay).opacity).toBe('0');
      expect(getComputedStyle(document.querySelector('[data-docuveil-attach]')!).display).toBe('none');
    } finally {
      controller.destroy();
      style.remove();
    }
  });

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

  it('renders nested conversation text at full opacity with dark ink', async () => {
    const hostStyle = document.createElement('style');
    hostStyle.textContent = '.host-faded { color: rgba(90, 90, 90, 0.45); opacity: 0.45; }';
    const style = document.createElement('style');
    style.textContent = skinCss;
    document.head.append(hostStyle, style);
    document.body.innerHTML = supportedHtml;
    const fadedText = document.createElement('p');
    fadedText.className = 'host-faded';
    fadedText.textContent = 'Readable response';
    document.querySelector('article')?.append(fadedText);
    const controller = new SkinController(document, new ChatGptAdapter(document, window));

    controller.setEnabled(true);

    expect(getComputedStyle(fadedText).opacity).toBe('1');
    expect(getComputedStyle(fadedText).color).toBe('rgb(32, 33, 36)');
    await Promise.resolve();
    controller.destroy();
    await Promise.resolve();
    style.remove();
    hostStyle.remove();
  });

  it('contains native composer wrapper layers inside the editor bar', async () => {
    const hostStyle = document.createElement('style');
    hostStyle.textContent = `
      .host-composer-layer {
        width: 100vw;
        min-width: 70rem;
        min-height: 11rem;
        background: #212121;
      }
    `;
    const style = document.createElement('style');
    style.textContent = skinCss;
    document.head.append(hostStyle, style);
    document.body.innerHTML = supportedHtml;
    const composer = document.querySelector<HTMLElement>('#prompt-textarea')!;
    const form = composer.closest('form')!;
    const layers: HTMLElement[] = [];
    for (let layer = composer.parentElement; layer && layer !== form; layer = layer.parentElement) {
      layer.classList.add('host-composer-layer');
      layers.push(layer);
    }
    const controller = new SkinController(document, new ChatGptAdapter(document, window));

    controller.setEnabled(true);

    expect(layers.length).toBeGreaterThan(0);
    for (const layer of layers) {
      const computed = getComputedStyle(layer);
      expect(computed.width).toBe('100%');
      expect(Number.parseFloat(computed.minWidth)).toBe(0);
      expect(Number.parseFloat(computed.minHeight)).toBe(0);
      expect(computed.backgroundColor).toBe('rgba(0, 0, 0, 0)');
    }
    await Promise.resolve();
    controller.destroy();
    await Promise.resolve();
    style.remove();
    hostStyle.remove();
  });
});
