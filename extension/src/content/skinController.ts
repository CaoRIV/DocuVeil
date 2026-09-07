import type { AdapterSnapshot, PlatformAdapter } from '../adapters/platformAdapter';
import { createShell, type ShellView } from '../shell/createShell';

const ROOT_CLASS = 'docuveil-enabled';

export class SkinController {
  private enabled = false;
  private shell: ShellView | null = null;
  private stopObserving: (() => void) | null = null;
  private marked: HTMLElement[] = [];
  private notice: HTMLElement | null = null;

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
    if (this.shell) {
      this.shell.update(snapshot);
      return;
    }
    this.applyMarkers(snapshot);
    this.shell = createShell(this.doc, snapshot, {
      openConversation: (href) => this.adapter.openConversation(href),
      createConversation: () => this.adapter.createConversation(),
      attachFile: () => this.adapter.attachFile(),
    });
    this.doc.documentElement.classList.add(ROOT_CLASS);
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
    this.shell?.destroy();
    this.shell = null;
    this.notice?.remove();
    this.notice = null;
    for (const node of this.marked) node.removeAttribute('data-docuveil-native');
    this.marked = [];
    this.doc.documentElement.classList.remove(ROOT_CLASS);
  }
}
