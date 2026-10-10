/** Minimal event/DOM adapter for controller tests; it does not perform layout. */
export function createDOM() {
  const elements = new Map();
  function element(key) {
    if (elements.has(key)) return elements.get(key);
    const classes = new Set(), attributes = new Map(), listeners = new Map();
    const node = {
      value: '', innerHTML: '', textContent: '', options: [], children: [], dataset: {}, style: {}, hidden: false,
      classList: {
        toggle(name, enabled = !classes.has(name)) { if (enabled) classes.add(name); else classes.delete(name); },
        add(name) { classes.add(name); }, remove(name) { classes.delete(name); }, contains: name => classes.has(name),
      },
      setAttribute(name, value) { attributes.set(name, value); }, getAttribute: name => attributes.get(name) || '',
      querySelector: element, querySelectorAll: () => [],
      addEventListener(name, listener) { if (!listeners.has(name)) listeners.set(name, []); listeners.get(name).push(listener); },
      dispatch(name, event) { for (const listener of listeners.get(name) || []) listener(event); },
      appendChild(child) { this.children.push(child); },
      getBoundingClientRect: () => ({ x: 0, y: 0, width: 1000, height: 680 }),
      contains: () => false, focus() {}, select() {}, click() { this.onclick?.({}); },
    };
    elements.set(key, node);
    return node;
  }
  const document = {
    querySelector: element, querySelectorAll: () => [],
    createElement: () => element(Symbol()), createElementNS: () => element(Symbol()),
    addEventListener() {}, body: element('body'),
  };
  return { document, element, elements };
}
