# DocuVeil MVP Release Checklist

Record the date, browser version, operating system, and tester for each browser run.

## Chrome

- [ ] Load `dist/extension` without manifest errors.
- [ ] Enable and disable without reloading ChatGPT.
- [ ] Confirm the enabled view uses DocuVeil branding, hides visible ChatGPT branding, and resembles the approved document workspace.
- [ ] Preserve enabled state after reload, a new ChatGPT tab, and browser restart.
- [ ] Switch an existing conversation and create a new conversation.
- [ ] Send a text prompt with Enter and insert a line break with Shift+Enter.
- [ ] Observe a long streaming response without duplicate shell elements or visible jank.
- [ ] Verify headings, lists, tables, links, code blocks, images, and scroll behavior.
- [ ] Attach one image and one non-image file through ChatGPT's native flow.
- [ ] Disable DocuVeil and confirm the original page is restored without reload.
- [ ] In a disposable ChatGPT tab, run `document.querySelector('#prompt-textarea')?.remove()` in DevTools, enable DocuVeil, and confirm the native page remains visible with the compatibility notice; reload the tab afterward.

## Microsoft Edge

- [ ] Load `dist/extension` without manifest errors.
- [ ] Enable and disable without reloading ChatGPT.
- [ ] Confirm the enabled view uses DocuVeil branding, hides visible ChatGPT branding, and resembles the approved document workspace.
- [ ] Preserve enabled state after reload, a new ChatGPT tab, and browser restart.
- [ ] Switch an existing conversation and create a new conversation.
- [ ] Send a text prompt with Enter and insert a line break with Shift+Enter.
- [ ] Observe a long streaming response without duplicate shell elements or visible jank.
- [ ] Verify headings, lists, tables, links, code blocks, images, and scroll behavior.
- [ ] Attach one image and one non-image file through ChatGPT's native flow.
- [ ] Disable DocuVeil and confirm the original page is restored without reload.
- [ ] In a disposable ChatGPT tab, run `document.querySelector('#prompt-textarea')?.remove()` in DevTools, enable DocuVeil, and confirm the native page remains visible with the compatibility notice; reload the tab afterward.
