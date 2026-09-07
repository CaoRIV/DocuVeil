# DocuVeil Claude Support Design

**Date:** 2026-09-07  
**Status:** Approved in conversation  
**Scope:** Claude Free/Pro web app on desktop Chrome and Edge

## 1. Goal

Add Claude as the second supported DocuVeil platform with feature parity to the current ChatGPT integration:

- document-style conversation layout;
- recent conversations in the Document tabs sidebar;
- native new-chat and conversation navigation;
- inline native composer and stable streaming responses;
- independent enable/disable state;
- native Claude Artifact panel preserved;
- fail-open behavior when Claude's DOM is unsupported.

Gemini is not implemented in this change. The design should leave one simple registry entry point for it later.

## 2. Architecture

Keep the existing shared `SkinController`, shell, and snapshot contract. Add:

- `PlatformId`: initially `chatgpt | claude`;
- a small hostname detector and adapter factory;
- `ClaudeAdapter` and Claude-only selectors;
- platform-scoped styling for the minimum layout differences;
- enabled state stored separately for each platform.

The content entry point detects the current hostname, creates the matching adapter, and starts the existing controller. Unsupported hosts do nothing.

The manifest adds only `https://claude.ai/*` alongside the existing ChatGPT host. No popup, scripting permission, remote code, or broad host permission is added.

## 3. Per-platform state

Replace the single `enabled` value with a small map:

```ts
enabledByPlatform: {
  chatgpt: boolean;
  claude: boolean;
}
```

The toolbar action identifies the active tab's platform before toggling. Clicking the action on an unsupported website does not change any state.

For existing users, the legacy `enabled` value migrates to `enabledByPlatform.chatgpt`. Claude defaults to disabled. The migration is idempotent and retains no conversation data.

## 4. Claude adapter

Claude-specific DOM knowledge stays under `extension/src/adapters/claude/`. The adapter implements the existing operations:

- inspect the navigation, conversation surface, composer, send/stop control, new-chat control, active title, and recent-chat links;
- open an existing chat through Claude's native link behavior;
- create a chat through Claude's native control;
- observe relevant DOM changes and SPA navigation;
- clean up every observer and event listener.

Selectors prefer stable attributes in this order: `data-testid`, semantic role, accessible label, and route-shaped `href`. Generated CSS class names are not accepted as primary selectors.

Recent standalone chats are in scope. Projects, organization navigation, Team/Enterprise layouts, search results, and chat management menus are not.

Before implementation, collect a read-only DOM lineage from a real Claude Free/Pro session for:

- recent-chat link and navigation root;
- new-chat control;
- main conversation root;
- composer and its form;
- send/stop control;
- Artifact panel root.

No prompt or response text is required in the diagnostic output.

## 5. Presentation and Artifacts

Claude uses the existing DocuVeil header, toolbar, document page, sidebar, and typography. The controller marks native Claude nodes; it does not move or recreate React-owned composer or message nodes.

Shared CSS continues to target DocuVeil markers. Claude-only adjustments are scoped beneath `data-docuveil-platform="claude"`. Rules must not globally force opacity, visibility, positioning, or backgrounds across the host page.

`AdapterSnapshot` adds an `auxiliaryRoots` array. The Claude adapter places an open Artifact panel in that array so the controller can exclude it from surface flattening while keeping it native and interactive. The array is empty when no Artifact is open, and missing Artifact UI does not prevent document mode from mounting.

DocuVeil adds no custom upload button. Native message submission and response rendering remain owned by Claude.

## 6. Failure behavior

Conversation, composer, navigation, and new-chat targets are required. If any required target is unavailable, DocuVeil removes its shell and markers, leaves Claude usable, and shows a Claude-specific compatibility notice.

Recent-chat lists may be empty. Optional send/stop and Artifact targets may be absent without failing the whole adapter.

Mutation handling remains batched and ignores changes produced by the DocuVeil shell. Disabling DocuVeil restores the native page without a reload.

## 7. Testing and rollout

Automated coverage includes:

- hostname detection and adapter selection;
- per-platform storage, legacy migration, and unsupported-host behavior;
- Claude fixtures for an existing chat, new chat, streaming replacement, empty history, missing required nodes, and an open Artifact panel;
- native navigation and new-chat delegation;
- mount, refresh, disable, cleanup, and fail-open behavior;
- manifest and production-build validation.

Live testing uses a Claude Free/Pro personal account on desktop Chrome or Edge. DOM defects found during smoke testing become focused fixture regressions before being fixed.

Rollout checkpoints:

1. Platform detection, storage migration, and manifest changes.
2. Claude DOM diagnostic and fixtures.
3. Claude adapter behavior.
4. Claude presentation and Artifact preservation.
5. Full automated checks and live browser smoke test.

Gemini work starts only after the Claude checklist passes.

## 8. Acceptance criteria

Claude support is complete when:

1. ChatGPT and Claude can be enabled independently.
2. Existing and new Claude chats render in the DocuVeil document layout.
3. Recent chats, active title, new chat, and chat switching use native Claude behavior.
4. Prompt entry, submission, streaming responses, and rich content remain usable.
5. Opening an Artifact preserves its native panel and interactions.
6. Reload, SPA navigation, enable, and disable do not duplicate UI or break native DOM ownership.
7. Unsupported Claude DOM fails open to the native interface.
8. Tests, type-checking, lint, production build, and manual Chrome/Edge smoke checks pass.

## 9. Explicit non-goals

- Claude Projects or Team/Enterprise-specific layouts.
- Gemini implementation.
- Popup or settings screen.
- Optional runtime host permissions.
- Custom file upload, model selection, tool controls, or Artifact renderer.
- Changes to DocuVeil's privacy model.
