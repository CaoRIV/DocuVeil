import type { AdapterSnapshot, Conversation, PlatformAdapter } from '../platformAdapter';
import { chatGptSelectors as selectors } from './selectors';

function element<T extends HTMLElement>(doc: Document, selector: string): T | null {
  return doc.querySelector<T>(selector);
}

export class ChatGptAdapter implements PlatformAdapter {
  constructor(
    private readonly doc: Document,
    private readonly win: Window,
  ) {}

  inspect(): AdapterSnapshot {
    const historyRoot = element<HTMLElement>(this.doc, selectors.historyRoot);
    const conversationRoot = element<HTMLElement>(this.doc, selectors.conversationRoot);
    const composer = element<HTMLElement>(this.doc, selectors.composer);
    const composerRoot = composer?.closest<HTMLElement>('form') ?? null;
    const sendButton = element<HTMLElement>(this.doc, selectors.sendButton);
    const newChatButton = element<HTMLElement>(this.doc, selectors.newChatButton);
    const attachmentButton = element<HTMLElement>(this.doc, selectors.attachmentButton);
    const links = [...this.doc.querySelectorAll<HTMLAnchorElement>(selectors.conversationLinks)];
    const navRoot = historyRoot?.closest<HTMLElement>('nav')
      ?? newChatButton?.closest<HTMLElement>('nav')
      ?? null;
    const conversations: Conversation[] = links.map((link) => {
      const href = link.getAttribute('href') ?? '';
      return {
        id: href.slice('/c/'.length),
        title: link.textContent?.trim() || 'Untitled conversation',
        href,
        active: link.getAttribute('aria-current') === 'page' || this.win.location.pathname === href,
      };
    });
    const activeTitle = conversations.find((item) => item.active)?.title ?? 'Untitled document';
    return {
      ready: Boolean(navRoot && conversationRoot && composerRoot && composer && newChatButton),
      navRoot,
      conversationRoot,
      composerRoot,
      composer,
      sendButton,
      newChatButton,
      attachmentButton,
      activeTitle,
      conversations,
    };
  }

  openConversation(href: string): void {
    const link = [...this.doc.querySelectorAll<HTMLAnchorElement>(selectors.conversationLinks)]
      .find((candidate) => candidate.getAttribute('href') === href);
    link?.click();
  }

  createConversation(): void {
    element<HTMLElement>(this.doc, selectors.newChatButton)?.click();
  }

  attachFile(): void {
    element<HTMLElement>(this.doc, selectors.attachmentButton)?.click();
  }

  observe(onChange: () => void): () => void {
    let frame = 0;
    const schedule = () => {
      if (frame) return;
      frame = this.win.requestAnimationFrame(() => {
        frame = 0;
        onChange();
      });
    };
    const isDocuVeilNode = (node: Node) => node instanceof Element && Boolean(
      node.closest('[data-docuveil-shell], [data-docuveil-compatibility]'),
    );
    const observer = new MutationObserver((records) => {
      const hasNativeMutation = records.some((record) =>
        [...record.addedNodes, ...record.removedNodes].some((node) => !isDocuVeilNode(node)),
      );
      if (hasNativeMutation) schedule();
    });
    const snapshot = this.inspect();
    const targets = [snapshot.navRoot, snapshot.conversationRoot]
      .filter((target): target is HTMLElement => target !== null);
    if (targets.length === 2) {
      observer.observe(this.doc.body, { childList: true });
      for (const target of targets) observer.observe(target, { childList: true, subtree: true });
    } else {
      observer.observe(this.doc.body, { childList: true, subtree: true });
    }
    this.win.addEventListener('popstate', schedule);
    return () => {
      observer.disconnect();
      this.win.removeEventListener('popstate', schedule);
      if (frame) this.win.cancelAnimationFrame(frame);
    };
  }
}
