import type { AdapterSnapshot, Conversation, PlatformAdapter } from '../platformAdapter';
import { claudeSelectors as selectors } from './selectors';

function element<T extends HTMLElement>(doc: Document, selector: string): T | null {
  return doc.querySelector<T>(selector);
}

export class ClaudeAdapter implements PlatformAdapter {
  readonly id = 'claude';

  constructor(
    private readonly doc: Document,
    private readonly win: Window,
  ) {}

  inspect(): AdapterSnapshot {
    const navRoot = element<HTMLElement>(this.doc, selectors.navigationRoot);
    const conversationRoot = element<HTMLElement>(this.doc, selectors.conversationRoot);
    const composer = element<HTMLElement>(this.doc, selectors.composer);
    // Current personal chats use a sticky direct child of chat-column rather
    // than a fieldset. Keep the whole native input surface, including its footer.
    const column = composer?.closest<HTMLElement>('[data-testid="chat-column"]');
    const composerRoot = composer?.closest<HTMLElement>('fieldset')
      ?? ([...(column?.children ?? [])].find((child) =>
        child.contains(composer ?? null) && !child.querySelector('[data-testid="transcript-list"]'),
      ) as HTMLElement | undefined)
      ?? null;
    const sendButton = element<HTMLElement>(this.doc, selectors.sendButton);
    const newChatButton = element<HTMLElement>(this.doc, selectors.newChatButton);
    const links = [...this.doc.querySelectorAll<HTMLAnchorElement>(selectors.conversationLinks)];
    const conversations: Conversation[] = links.map((link) => {
      const href = link.getAttribute('href') ?? '';
      return {
        id: href.slice('/chat/'.length),
        title: link.textContent?.trim() || 'Untitled conversation',
        href,
        active: this.win.location.pathname === href,
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
      attachmentButton: null,
      auxiliaryRoots: [...this.doc.querySelectorAll<HTMLElement>(selectors.artifactRoot)],
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

  attachFile(): void {}

  observe(onChange: () => void): () => void {
    let frame = 0;
    const schedule = () => {
      if (frame) return;
      frame = this.win.requestAnimationFrame(() => {
        frame = 0;
        onChange();
      });
    };
    const isDocuVeilNode = (node: Node) => Boolean(
      (node.nodeType === 1 ? node as Element : node.parentElement)
        ?.closest('[data-docuveil-shell], [data-docuveil-compatibility]'),
    );
    const observer = new MutationObserver((records) => {
      const hasNativeMutation = records.some((record) => {
        if (isDocuVeilNode(record.target)) return false;
        if (record.type !== 'childList') return true;
        return [...record.addedNodes, ...record.removedNodes].some((node) => !isDocuVeilNode(node));
      });
      if (hasNativeMutation) schedule();
    });
    observer.observe(this.doc.body, {
      childList: true, subtree: true, characterData: true, attributes: true,
      attributeFilter: ['aria-label', 'aria-current', 'aria-busy', 'disabled', 'data-testid'],
    });
    this.win.addEventListener('popstate', schedule);
    return () => {
      observer.disconnect();
      this.win.removeEventListener('popstate', schedule);
      if (frame) this.win.cancelAnimationFrame(frame);
    };
  }
}
