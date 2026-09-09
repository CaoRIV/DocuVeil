(() => {
  const selectors = {
    main: 'main',
    composer: '[data-testid="chat-input"]',
    transcript: '[data-testid="transcript-list"]',
    footer: '[data-testid="chat-footer-spark"]',
    sidebar: '[data-testid="sidebar"]',
    documentSidebar: '.docuveil-sidebar',
  };
  const properties = [
    'display', 'position', 'box-sizing', 'width', 'min-width', 'max-width',
    'height', 'min-height', 'max-height', 'padding', 'margin', 'inset',
    'flex', 'flex-direction', 'align-items', 'align-self', 'justify-content',
    'grid-template-columns', 'gap', 'overflow-x', 'overflow-y', 'transform',
    'translate', 'contain', 'background-color', 'z-index',
  ];
  const nodes = [];
  const indexes = new Map();
  function describe(element) {
    if (indexes.has(element)) return indexes.get(element);
    const index = nodes.length;
    indexes.set(element, index);
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    nodes.push({
      index,
      tag: element.tagName,
      id: element.id,
      className: typeof element.className === 'string' ? element.className : '',
      testId: element.getAttribute('data-testid'),
      docuveilNative: element.getAttribute('data-docuveil-native'),
      rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
      clientWidth: element.clientWidth,
      clientHeight: element.clientHeight,
      scrollWidth: element.scrollWidth,
      scrollHeight: element.scrollHeight,
      scrollTop: element.scrollTop,
      css: Object.fromEntries(properties.map(property => [property, style.getPropertyValue(property)])),
    });
    return index;
  }
  const paths = {};
  for (const [name, selector] of Object.entries(selectors)) {
    paths[name] = [];
    for (let element = document.querySelector(selector); element; element = element.parentElement) {
      paths[name].push(describe(element));
    }
  }
  const report = {
    capturedAt: new Date().toISOString(),
    viewport: { width: innerWidth, height: innerHeight, devicePixelRatio },
    rootFontSize: getComputedStyle(document.documentElement).fontSize,
    enabled: document.documentElement.classList.contains('docuveil-enabled'),
    platform: document.documentElement.dataset.docuveilPlatform || null,
    paths,
    nodes,
  };
  const url = URL.createObjectURL(new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'claude-layout-diagnostic.json';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
  console.log('Downloaded claude-layout-diagnostic.json. No conversation text, cookies or credentials collected.');
})();
