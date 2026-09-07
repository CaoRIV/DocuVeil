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
  const brand = doc.createElement('strong');
  brand.textContent = 'DocuVeil';
  const title = doc.createElement('span');
  title.className = 'docuveil-title';
  topbar.append(brand, title);

  const toolbar = doc.createElement('div');
  toolbar.className = 'docuveil-toolbar';
  toolbar.setAttribute('aria-hidden', 'true');
  for (const label of ['File', 'Edit', 'View', 'B', 'I', 'U']) {
    const item = doc.createElement('span');
    item.textContent = label;
    item.setAttribute('data-decorative', 'true');
    item.setAttribute('aria-hidden', 'true');
    toolbar.append(item);
  }

  const sidebar = doc.createElement('aside');
  sidebar.className = 'docuveil-sidebar';
  const sidebarHeading = doc.createElement('h2');
  sidebarHeading.textContent = 'Documents';
  const newButton = button(doc, '+ New', 'data-docuveil-new', actions.createConversation);
  const list = doc.createElement('div');
  list.className = 'docuveil-document-list';
  sidebar.append(sidebarHeading, newButton, list);

  const attach = button(doc, '+', 'data-docuveil-attach', actions.attachFile);
  attach.setAttribute('aria-label', 'Attach a file using ChatGPT');
  root.append(topbar, toolbar, sidebar, attach);

  const update = (snapshot: AdapterSnapshot) => {
    title.textContent = snapshot.activeTitle;
    attach.hidden = snapshot.attachmentButton === null;
    list.replaceChildren(...snapshot.conversations.map((conversation) => {
      const item = button(doc, conversation.title, 'data-docuveil-document', () => {
        actions.openConversation(conversation.href);
      });
      item.setAttribute('data-conversation-href', conversation.href);
      if (conversation.active) item.setAttribute('aria-current', 'page');
      return item;
    }));
  };

  update(initial);
  doc.body.append(root);
  return { root, update, destroy: () => root.remove() };
}
