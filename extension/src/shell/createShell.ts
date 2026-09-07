import type { AdapterSnapshot } from '../adapters/platformAdapter';

export type ShellActions = {
  openConversation(href: string): void;
  createConversation(): void;
  attachFile(): void;
};

export type ShellView = {
  root: HTMLElement;
  update(snapshot: AdapterSnapshot): void;
  destroy(): void;
};

function button(doc: Document, label: string, attribute: string, onClick: () => void): HTMLButtonElement {
  const control = doc.createElement('button');
  control.type = 'button';
  control.textContent = label;
  control.setAttribute(attribute, 'true');
  control.addEventListener('click', onClick);
  return control;
}

function decorativeItem(doc: Document, label: string, className = ''): HTMLSpanElement {
  const item = doc.createElement('span');
  item.textContent = label;
  item.className = className;
  item.setAttribute('data-decorative', 'true');
  item.setAttribute('aria-hidden', 'true');
  return item;
}

export function createShell(
  doc: Document,
  initial: AdapterSnapshot,
  actions: ShellActions,
): ShellView {
  const root = doc.createElement('section');
  root.setAttribute('data-docuveil-shell', 'true');
  root.setAttribute('aria-label', 'DocuVeil document workspace');

  const topbar = doc.createElement('header');
  topbar.className = 'docuveil-topbar';

  const identity = doc.createElement('div');
  identity.className = 'docuveil-identity';
  identity.setAttribute('data-docuveil-brand', 'true');
  const mark = decorativeItem(doc, 'D', 'docuveil-app-mark');
  const documentMeta = doc.createElement('div');
  documentMeta.className = 'docuveil-document-meta';
  const titleRow = doc.createElement('div');
  titleRow.className = 'docuveil-title-row';
  const brand = doc.createElement('strong');
  brand.textContent = 'DocuVeil';
  const title = doc.createElement('span');
  title.className = 'docuveil-title';
  titleRow.append(brand, title, decorativeItem(doc, '☆', 'docuveil-star'));

  const menubar = doc.createElement('div');
  menubar.className = 'docuveil-menubar';
  menubar.setAttribute('aria-hidden', 'true');
  for (const label of ['File', 'Edit', 'View', 'Insert', 'Format', 'Tools', 'Extensions', 'Help']) {
    menubar.append(decorativeItem(doc, label));
  }
  documentMeta.append(titleRow, menubar);
  identity.append(mark, documentMeta);

  const windowActions = doc.createElement('div');
  windowActions.className = 'docuveil-window-actions';
  windowActions.setAttribute('aria-hidden', 'true');
  windowActions.append(
    decorativeItem(doc, '▤', 'docuveil-window-icon'),
    decorativeItem(doc, '◫', 'docuveil-window-icon'),
    decorativeItem(doc, 'Share', 'docuveil-share'),
    decorativeItem(doc, 'Upgrade', 'docuveil-upgrade'),
    decorativeItem(doc, 'DV', 'docuveil-avatar'),
  );
  topbar.append(identity, windowActions);

  const toolbarBackdrop = doc.createElement('div');
  toolbarBackdrop.className = 'docuveil-toolbar-backdrop';
  toolbarBackdrop.setAttribute('aria-hidden', 'true');

  const toolbar = doc.createElement('div');
  toolbar.className = 'docuveil-toolbar';
  toolbar.setAttribute('aria-hidden', 'true');
  for (const group of [
    ['⌕', '↶', '↷', '▣', 'A✓'],
    ['100%', 'Normal text', 'Arial'],
    ['−', '11', '+'],
    ['B', 'I', 'U', 'A', '✎', '↗'],
    ['▧', '▤', '☷', '↕', '✓', '≣', '⇤', '⇥'],
  ]) {
    const groupElement = doc.createElement('span');
    groupElement.className = 'docuveil-toolbar-group';
    for (const label of group) groupElement.append(decorativeItem(doc, label));
    toolbar.append(groupElement);
  }

  const sidebar = doc.createElement('aside');
  sidebar.className = 'docuveil-sidebar';
  sidebar.append(decorativeItem(doc, '←', 'docuveil-back'));
  const sidebarHeader = doc.createElement('div');
  sidebarHeader.className = 'docuveil-sidebar-header';
  const sidebarHeading = doc.createElement('h2');
  sidebarHeading.textContent = 'Document tabs';
  const newButton = button(doc, '+', 'data-docuveil-new', actions.createConversation);
  newButton.setAttribute('aria-label', 'Create a new conversation');
  sidebarHeader.append(sidebarHeading, newButton);
  const list = doc.createElement('div');
  list.className = 'docuveil-document-list';
  sidebar.append(sidebarHeader, list);

  root.append(topbar, toolbarBackdrop, toolbar, sidebar);

  let conversationKey = '';
  const update = (snapshot: AdapterSnapshot) => {
    if (title.textContent !== snapshot.activeTitle) title.textContent = snapshot.activeTitle;
    const nextKey = JSON.stringify(snapshot.conversations);
    if (nextKey === conversationKey) return;
    conversationKey = nextKey;
    list.replaceChildren(...snapshot.conversations.map((conversation) => {
      const item = button(doc, '', 'data-docuveil-document', () => {
        actions.openConversation(conversation.href);
      });
      item.append(
        decorativeItem(doc, '▤', 'docuveil-tab-icon'),
        Object.assign(doc.createElement('span'), {
          className: 'docuveil-tab-title',
          textContent: conversation.title,
        }),
      );
      item.setAttribute('data-conversation-href', conversation.href);
      if (conversation.active) item.setAttribute('aria-current', 'page');
      return item;
    }));
  };

  update(initial);
  doc.body.append(root);
  return { root, update, destroy: () => root.remove() };
}
