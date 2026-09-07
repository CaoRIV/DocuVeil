import type { PlatformId } from '../shared/platform';

export type Conversation = {
  id: string;
  title: string;
  href: string;
  active: boolean;
};

export type AdapterSnapshot = {
  ready: boolean;
  navRoot: HTMLElement | null;
  conversationRoot: HTMLElement | null;
  composerRoot: HTMLElement | null;
  composer: HTMLElement | null;
  sendButton: HTMLElement | null;
  newChatButton: HTMLElement | null;
  attachmentButton: HTMLElement | null;
  auxiliaryRoots: HTMLElement[];
  activeTitle: string;
  conversations: Conversation[];
};

export interface PlatformAdapter {
  readonly id: PlatformId;
  inspect(): AdapterSnapshot;
  openConversation(href: string): void;
  createConversation(): void;
  attachFile(): void;
  observe(onChange: () => void): () => void;
}
