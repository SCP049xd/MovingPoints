import { constructionMath } from '../engine/field-contract.js';

/**
 * A construction is a serializable graph node with one definition. That definition
 * drives naming, parent validation, tools and all exact coefficient fields.
 * @typedef {import('./types.js').ConstructionDefinition} ConstructionDefinition
 */
export function createConstructionRegistry() {
  const entries = new Map();
  const tools = [];
  const toolDefinitions = Object.create(null);
  const kinds = Object.create(null);
  const pointTypes = new Set();
  const lineTypes = new Set();
  const curveTypes = new Set();

  /** @param {ConstructionDefinition} definition */
  function register(definition) {
    const { id, label, category, inputs = [], evaluate, tool } = definition;
    if (!/^[A-Za-z][\w-]*$/.test(id) || entries.has(id)) {
      throw new Error(`Nieprawidłowy lub powtórzony typ konstrukcji: ${id}`);
    }
    if (!label || !['point', 'line', 'circle', 'conic', 'cubic', 'pair', 'action'].includes(category)) {
      throw new Error(`Nieprawidłowy opis konstrukcji: ${id}`);
    }
    if (!Array.isArray(inputs) || inputs.some(input => !['point', 'line', 'circle', 'curve', 'cubic', 'locus', 'pair'].includes(input))) {
      throw new Error(`Nieprawidłowe zależności konstrukcji: ${id}`);
    }
    if (definition.anchorParent !== undefined && (!Number.isInteger(definition.anchorParent) || definition.anchorParent < 0 || definition.anchorParent >= inputs.length)) throw new Error(`Nieprawidłowy punkt bazowy krzywej: ${id}`);
    if (evaluate !== undefined && typeof evaluate !== 'function') {
      throw new Error(`Brak funkcji obliczającej konstrukcję: ${id}`);
    }
    if (tool && toolDefinitions[tool.id || id]) throw new Error(`Powtórzone narzędzie: ${tool.id || id}`);
    const entry = Object.freeze({ ...definition, inputs: Object.freeze([...inputs]) });
    entries.set(id, entry);
    if (category !== 'action') kinds[id] = label;
    if (category === 'point') pointTypes.add(id);
    if (category === 'line') lineTypes.add(id);
    if (category === 'circle' || category === 'conic') curveTypes.add(id);
    if (tool) {
      const item = Object.freeze({ id, label, ...tool, constructionId: id, inputs: Object.freeze([...(tool.inputs || inputs)]) });
      tools.push(item);
      toolDefinitions[item.id] = item;
    }
    return entry;
  }

  function category(node) {
    const entry = entries.get(node?.type);
    if (!entry || entry.category === 'action') throw new Error(`Nieznana konstrukcja: ${node?.type}`);
    return entry.category;
  }

  function accepts(node, required) {
    const actual = category(node);
    return required === 'locus' ? ['line', 'circle', 'conic'].includes(actual)
      : required === 'curve' ? ['circle', 'conic'].includes(actual) : actual === required;
  }

  function validate(node, parents) {
    const definition = entries.get(node.type);
    if (!definition || definition.category === 'action') throw new Error(`Nieznana konstrukcja: ${node.type}`);
    if ((definition.variadic ? parents.length < definition.inputs.length : definition.inputs.length !== parents.length) || parents.some((parent, i) => !parent || !accepts(parent, definition.inputs[i] || definition.variadic))) {
      throw new Error(`Nieprawidłowe obiekty bazowe: ${definition.label}`);
    }
    definition.validate?.(node.meta || {});
    definition.validateParents?.(node.meta||{},parents);
  }

  function compute(node, parents, vectors, math) {
    const definition = entries.get(node.type);
    if (!definition?.evaluate) return null;
    return definition.evaluate({ math: constructionMath(math), vectors, parents, node, category });
  }

  return {
    fromGeoGebra(command, parents) {
      return [...entries.values()].find(entry => entry.geogebra?.includes(command)
        && entry.inputs.length === parents.length && parents.every((parent,i) => accepts(parent,entry.inputs[i])))?.id;
    },
    unregisterAction(id){
      if(entries.get(id)?.category!=='action')throw Error('Można usunąć tylko definicję narzędzia.');
      entries.delete(id);
      for(let i=tools.length-1;i>=0;i--)if(tools[i].constructionId===id){delete toolDefinitions[tools[i].id];tools.splice(i,1);}
    },
    register, get: id => entries.get(id), all: () => [...entries.values()],
    category, accepts, validate, compute,
    tools, toolDefinitions, kinds, pointTypes, lineTypes, curveTypes,
  };
}
