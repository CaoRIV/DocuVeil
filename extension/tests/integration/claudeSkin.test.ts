import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import supportedHtml from '../fixtures/claude-supported.html?raw';
import { ClaudeAdapter } from '../../src/adapters/claude/adapter';
import { SkinController } from '../../src/content/skinController';

const skinCss = readFileSync(resolve(process.cwd(), 'styles/docuveil.css'), 'utf8');

describe('Claude skin integration', () => {
  it('preserves Claude transcript and composer layout primitives', () => {
    const hostStyle = document.createElement('style');
    hostStyle.textContent = `
      [data-testid="transcript-list"] {
        position: relative;
        overflow: auto;
      }
      .claude-composer-stack,
      .claude-composer-row {
        display: flex;
      }
      .claude-composer-host {
        position: sticky;
        flex: 1 1 auto;
        margin: 11px;
        padding: 12px;
      }
      fieldset {
        margin: 7px;
      }
    `;
    const style = document.createElement('style');
    style.textContent = skinCss;
    document.head.append(hostStyle, style);
    document.body.innerHTML = supportedHtml;
    const transcript = document.querySelector<HTMLElement>('[data-testid="transcript-list"]')!;
    const host = document.querySelector<HTMLElement>('.claude-composer-host')!;
    const stack = document.querySelector<HTMLElement>('.claude-composer-stack')!;
    const row = document.querySelector<HTMLElement>('.claude-composer-row')!;
    const fieldset = document.querySelector<HTMLElement>('fieldset')!;
    const controller = new SkinController(document, new ClaudeAdapter(document, window));

    try {
      controller.setEnabled(true);
      expect(getComputedStyle(transcript).position).toBe('relative');
      expect(getComputedStyle(transcript).overflow).toBe('auto');
      expect(getComputedStyle(host).position).toBe('sticky');
      expect(getComputedStyle(host).flex).toBe('1 1 auto');
      expect(getComputedStyle(host).marginTop).toBe('11px');
      expect(getComputedStyle(host).paddingTop).toBe('12px');
      expect(getComputedStyle(stack).display).toBe('flex');
      expect(getComputedStyle(row).display).toBe('flex');
      expect(getComputedStyle(fieldset).marginTop).toBe('7px');
    } finally {
      controller.destroy();
      style.remove();
      hostStyle.remove();
    }
  });

  it('renders Claude transcript context without relying on article elements', () => {
    const hostStyle = document.createElement('style');
    hostStyle.textContent = `
      [data-testid="user-message"] span,
      .claude-response p {
        color: rgb(245, 245, 245);
        opacity: 0.25;
      }
    `;
    const style = document.createElement('style');
    style.textContent = skinCss;
    document.head.append(hostStyle, style);
    document.body.innerHTML = supportedHtml;
    const userText = document.querySelector<HTMLElement>('[data-testid="user-message"] span')!;
    const responseText = document.querySelector<HTMLElement>('.claude-response p')!;
    const controller = new SkinController(document, new ClaudeAdapter(document, window));

    try {
      expect(document.querySelector('article')).toBeNull();
      controller.setEnabled(true);
      expect(getComputedStyle(userText).color).toBe('rgb(32, 33, 36)');
      expect(getComputedStyle(userText).opacity).toBe('1');
      expect(getComputedStyle(responseText).color).toBe('rgb(32, 33, 36)');
      expect(getComputedStyle(responseText).opacity).toBe('1');
    } finally {
      controller.destroy();
      style.remove();
      hostStyle.remove();
    }
  });

  it('mounts without moving Claude-owned composer and Artifact nodes', () => {
    history.replaceState({}, '', '/chat/beta');
    document.body.innerHTML = supportedHtml;
    const composer = document.querySelector<HTMLElement>('[data-testid="chat-input"]')!;
    const artifact = document.querySelector<HTMLElement>('[role="region"][aria-label^="Artifact panel:"]')!;
    const originalComposerParent = composer.parentElement;
    const originalArtifactParent = artifact.parentElement;
    const nativeKeydown = vi.fn();
    const nativeSend = vi.fn();
    composer.addEventListener('keydown', nativeKeydown);
    document.querySelector('[data-testid="chat-input-send"]')?.addEventListener('click', nativeSend);
    const controller = new SkinController(document, new ClaudeAdapter(document, window));

    try {
      controller.setEnabled(true);
      expect(document.documentElement.dataset.docuveilPlatform).toBe('claude');
      expect(document.querySelectorAll('[data-docuveil-shell]')).toHaveLength(1);
      expect(composer.parentElement).toBe(originalComposerParent);
      expect(artifact.parentElement).toBe(originalArtifactParent);
      expect(artifact.getAttribute('data-docuveil-native')).toBe('auxiliary');

      composer.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      document.querySelector<HTMLElement>('[data-testid="chat-input-send"]')?.click();
      expect(nativeKeydown).toHaveBeenCalledOnce();
      expect(nativeSend).toHaveBeenCalledOnce();
    } finally {
      controller.destroy();
    }
  });

  it('makes the Claude editor readable while preserving the native Artifact surface', () => {
    const hostStyle = document.createElement('style');
    hostStyle.textContent = `
      .claude-native-editor {
        color: rgba(90, 90, 90, 0.45);
        opacity: 0.45;
      }
      .claude-native-artifact {
        position: fixed;
        z-index: 10;
        background-color: rgb(35, 35, 35);
      }
      .claude-native-artifact-surface {
        background-color: rgb(45, 45, 45);
        color: rgb(245, 245, 245);
      }
    `;
    const style = document.createElement('style');
    style.textContent = skinCss;
    document.head.append(hostStyle, style);
    document.body.innerHTML = supportedHtml;
    const editor = document.querySelector<HTMLElement>('[data-testid="chat-input"]')!;
    const artifact = document.querySelector<HTMLElement>('[role="region"][aria-label^="Artifact panel:"]')!;
    const artifactSurface = document.createElement('div');
    const artifactText = document.createElement('p');
    editor.classList.add('claude-native-editor');
    artifact.classList.add('claude-native-artifact');
    artifactSurface.classList.add('claude-native-artifact-surface');
    artifactText.textContent = 'Native Artifact content';
    artifactSurface.append(artifactText);
    artifact.append(artifactSurface);
    const controller = new SkinController(document, new ClaudeAdapter(document, window));

    try {
      controller.setEnabled(true);
      expect(getComputedStyle(editor).opacity).toBe('1');
      expect(getComputedStyle(editor).color).toBe('rgb(32, 33, 36)');
      expect(getComputedStyle(document.querySelector('[data-testid="chat-input-send"]')!).display)
        .not.toBe('none');
      expect(getComputedStyle(document.querySelector('[data-testid="chat-input-attach"]')!).display)
        .toBe('none');
      expect(getComputedStyle(artifact).backgroundColor).toBe('rgb(35, 35, 35)');
      expect(getComputedStyle(artifactSurface).backgroundColor).toBe('rgb(45, 45, 45)');
      expect(getComputedStyle(artifactText).color).toBe('rgb(245, 245, 245)');
      expect(Number.parseInt(getComputedStyle(artifact).zIndex, 10)).toBeGreaterThan(2147483640);
    } finally {
      controller.destroy();
      style.remove();
      hostStyle.remove();
    }
  });

  it('re-marks replaced Claude content without rebuilding the sidebar and restores on disable', async () => {
    history.replaceState({}, '', '/chat/beta');
    document.body.innerHTML = supportedHtml;
    const controller = new SkinController(document, new ClaudeAdapter(document, window));
    controller.setEnabled(true);

    try {
      const shell = document.querySelector('[data-docuveil-shell]');
      const historyItem = document.querySelector('[data-conversation-href="/chat/alpha"]');
      const newMain = document.createElement('main');
      newMain.innerHTML = `
        <div data-testid="chat-column-body">
          <article><p>Replacement response</p></article>
          <div data-testid="chat-column">
            <fieldset>
              <div data-testid="chat-input" contenteditable="true" role="textbox"></div>
              <button type="button" data-testid="chat-input-send">Send</button>
            </fieldset>
          </div>
        </div>
        <div role="region" aria-label="Artifact panel: Replacement"></div>
      `;
      const composer = newMain.querySelector<HTMLElement>('[data-testid="chat-input"]')!;
      const originalComposerParent = composer.parentElement;
      document.querySelector('main')!.replaceWith(newMain);

      await vi.waitFor(() => expect(newMain.getAttribute('data-docuveil-native')).toBe('conversation'));
      const artifact = newMain.querySelector<HTMLElement>('[role="region"][aria-label^="Artifact panel:"]')!;
      const text = newMain.querySelector('p')!.firstChild!;
      text.textContent += ' streamed';
      await new Promise((resolve) => requestAnimationFrame(resolve));

      expect(composer.parentElement).toBe(originalComposerParent);
      expect(composer.closest('fieldset')?.getAttribute('data-docuveil-native')).toBe('composer');
      expect(artifact.getAttribute('data-docuveil-native')).toBe('auxiliary');
      expect(document.querySelector('[data-docuveil-shell]')).toBe(shell);
      expect(document.querySelector('[data-conversation-href="/chat/alpha"]')).toBe(historyItem);

      controller.setEnabled(false);
      expect(document.documentElement.hasAttribute('data-docuveil-platform')).toBe(false);
      expect(document.querySelector('[data-docuveil-shell]')).toBeNull();
      expect(document.querySelector('[data-docuveil-native]')).toBeNull();
      expect(composer.parentElement).toBe(originalComposerParent);
    } finally {
      controller.destroy();
    }
  });
});
