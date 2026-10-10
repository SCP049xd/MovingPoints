/** Graph traversal independent of rendering and geometry evaluation. */
export function descendantsOf(nodes, id) {
  const children = new Map();
  for (const node of nodes) for (const parent of node.parents) {
    if (!children.has(parent)) children.set(parent, []);
    children.get(parent).push(node.id);
  }
  const found = new Set([id]), queue = [id];
  for (let i = 0; i < queue.length; i++) for (const child of children.get(queue[i]) || []) {
    if (!found.has(child)) { found.add(child); queue.push(child); }
  }
  found.delete(id);
  return found;
}
