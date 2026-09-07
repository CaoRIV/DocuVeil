import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import supportedHtml from '../fixtures/chatgpt-supported.html?raw';
import { ChatGptAdapter } from '../../src/adapters/chatgpt/adapter';
import { SkinController } from '../../src/content/skinController';

const skinCss = readFileSync(resolve(process.cwd(), 'styles/docuveil.css'), 'utf8');

describe('ChatGPT skin integration', () => {
  it('clears nested dark theme surfaces while preserving hidden overlays and restores on disable', () => {
    const style = document.createElement('style');
    style.textContent = '.dark-surface { background-color: rgb(33,33,33); background-image: linear-gradient(black, black); backdrop-filter: blur(8px); } .hidden-overlay { opacity: 0; }' + skinCss;
    document.head.append(style);
    document.body.innerHTML = '<div class="dark-surface" id="host">' + supportedHtml + '</div>';
    const main = document.querySelector('main')!;
    const layer = document.createElement('div');
    layer.className = 'dark-surface';
    const message = document.createElement('div');
    message.className = 'markdown dark-surface';
    message.innerHTML = '<p>Readable response</p>';
    layer.append(message);
    main.append(layer);
    const overlay = document.createElement('div');
    overlay.className = 'hidden-overlay dark-surface';
    layer.append(overlay);
    const controller = new SkinController(document, new ChatGptAdapter(document, window));
    try {
      controller.setEnabled(true);
      for (const element of [document.querySelector('#host')!, layer, message]) {
        expect(getComputedStyle(element).backgroundColor).toBe('rgba(0, 0, 0, 0)');
        expect(getComputedStyle(element).backgroundImage).toBe('none');
      }
      expect(getComputedStyle(message.querySelector('p')!).color).toBe('rgb(32, 33, 36)');
      expect(getComputedStyle(overlay).opacity).toBe('0');
      controller.setEnabled(false);
      expect(getComputedStyle(layer).backgroundColor).toBe('rgb(33, 33, 33)');
      expect(document.querySelector('[data-docuveil-surface]')).toBeNull();
    } finally {
      controller.destroy();
      style.remove();
    }
  });

  it('survives native page replacement and text streaming without rebuilding history', async () => {
    document.body.innerHTML = '<div id="native-root">' + supportedHtml + '</div>';
    const controller = new SkinController(document, new ChatGptAdapter(document, window));
    controller.setEnabled(true);
    try {
      const historyItem = document.querySelector('[data-conversation-href="/c/alpha"]');
      const oldMain = document.querySelector('main')!;
      const newMain = document.createElement('main');
      newMain.innerHTML = '<article><p>Response</p></article><section><form><div><div id="prompt-textarea" contenteditable="true"></div></div><button type="submit">Send</button></form></section>';
      document.querySelector('form')!.remove();
      oldMain.replaceWith(newMain);
      await vi.waitFor(() => expect(newMain.getAttribute('data-docuveil-native')).toBe('conversation'));
      const form = newMain.querySelector('form')!;
      const parent = form.parentElement;
      const text = newMain.querySelector('p')!.firstChild!;
      for (let i = 0; i < 8; i++) text.textContent += ' word';
      await new Promise((resolve) => requestAnimationFrame(resolve));
      expect(form.parentElement).toBe(parent);
      expect(form.getAttribute('data-docuveil-native')).toBe('composer');
      expect(document.querySelector('[data-conversation-href="/c/alpha"]')).toBe(historyItem);
      expect(document.querySelectorAll('[data-docuveil-shell]')).toHaveLength(1);
      controller.setEnabled(false);
      expect(newMain.hasAttribute('data-docuveil-native')).toBe(false);
      expect(form.parentElement).toBe(parent);
    } finally {
      controller.destroy();
    }
  });

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
      expect(document.querySelector('[data-docuveil-attach]')).toBeNull();
      expect(getComputedStyle(document.querySelector('#composer-plus-btn')!).display).toBe('none');
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
