import type { AdapterSnapshot, PlatformAdapter } from '../adapters/platformAdapter';
import { createShell, type ShellView } from '../shell/createShell';

const ROOT_CLASS = 'docuveil-enabled';

export class SkinController {
  private enabled = false;
  private shell: ShellView | null = null;
  private stopObserving: (() => void) | null = null;
  private marked: HTMLElement[] = [];
  private notice: HTMLElement | null = null;
  private composerPath: HTMLElement[] = [];
  private surfaces: HTMLElement[] = [];

  constructor(
    private readonly doc: Document,
    private readonly adapter: PlatformAdapter,
  ) {}

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      this.stop();
      return;
    }
    if (!this.stopObserving) {
      this.stopObserving = this.adapter.observe(() => this.refresh());
    }
    this.mountOrRefresh();
  }

  refresh(): void {
    if (this.enabled) this.mountOrRefresh();
  }

  destroy(): void {
    this.enabled = false;
    this.stop();
  }

  private mountOrRefresh(): void {
    const snapshot = this.adapter.inspect();
    if (!snapshot.ready) {
      this.clearPresentation();
      this.showCompatibilityNotice();
      return;
    }
    this.notice?.remove();
    this.notice = null;
    this.styleComposerPath(snapshot);
    this.styleSurfaces(snapshot);
    for (const node of this.marked) node.removeAttribute('data-docuveil-native');
    this.applyMarkers(snapshot);
    if (this.shell) {
      this.shell.update(snapshot);
      return;
    }
    this.shell = createShell(this.doc, snapshot, {
      openConversation: (href) => this.adapter.openConversation(href),
      createConversation: () => this.adapter.createConversation(),
      attachFile: () => this.adapter.attachFile(),
    });
    this.doc.documentElement.classList.add(ROOT_CLASS);
  }

  private styleComposerPath(snapshot: AdapterSnapshot): void {
    this.restoreComposer();
    const page = snapshot.conversationRoot;
    const form = snapshot.composerRoot;
    if (!page || !form || form === page || form.contains(page)) return;
    // Never reparent React-owned DOM: a later native render must retain ownership.
    for (let node = form.parentElement;
      node && node !== page && node !== this.doc.body && !node.contains(page);
      node = node.parentElement) {
      node.setAttribute('data-docuveil-composer-path', '');
      this.composerPath.push(node);
    }
  }

  private restoreComposer(): void {
    for (const node of this.composerPath) node.removeAttribute('data-docuveil-composer-path');
    this.composerPath = [];
  }

  private styleSurfaces(snapshot: AdapterSnapshot): void {
    const next = new Set<HTMLElement>();
    for (const target of [snapshot.conversationRoot, snapshot.composerRoot]) {
      for (let node = target?.parentElement; node && node !== this.doc.body; node = node.parentElement) {
        next.add(node);
      }
    }
    for (const node of this.surfaces) {
      if (!next.has(node)) node.removeAttribute('data-docuveil-surface');
    }
    for (const node of next) {
      if (!node.hasAttribute('data-docuveil-surface')) node.setAttribute('data-docuveil-surface', '');
    }
    this.surfaces = [...next];
  }

  private applyMarkers(snapshot: AdapterSnapshot): void {
    const pairs: Array<[HTMLElement | null, string]> = [
      [snapshot.navRoot, 'navigation'],
      [snapshot.conversationRoot, 'conversation'],
      [snapshot.composerRoot, 'composer'],
    ];
    this.marked = pairs.flatMap(([node, value]) => {
      if (!node) return [];
      node.setAttribute('data-docuveil-native', value);
      return [node];
    });
  }

  private showCompatibilityNotice(): void {
    if (this.notice) return;
    this.notice = this.doc.createElement('div');
    this.notice.setAttribute('data-docuveil-compatibility', 'true');
    this.notice.setAttribute('role', 'status');
    this.notice.textContent = 'DocuVeil: this ChatGPT interface is not supported yet. Native ChatGPT remains available.';
    this.doc.body.append(this.notice);
  }

  private stop(): void {
    this.stopObserving?.();
    this.stopObserving = null;
    this.clearPresentation();
  }

  private clearPresentation(): void {
    for (const node of this.surfaces) node.removeAttribute('data-docuveil-surface');
    this.surfaces = [];
    this.restoreComposer();
    this.shell?.destroy();
    this.shell = null;
    this.notice?.remove();
    this.notice = null;
    for (const node of this.marked) node.removeAttribute('data-docuveil-native');
    this.marked = [];
    this.doc.documentElement.classList.remove(ROOT_CLASS);
  }
}
