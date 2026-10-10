import { createConstructionRegistry } from './registry.js';
import { registerRadius } from './radius-expression.js';
import { registerAdvanced } from './advanced.js';
import { registerTriangleCurves } from './triangle-curves.js';
import { registerMixtilinear } from './mixtilinear.js';
import { registerIncircle } from './incircle.js';
import { registerBuiltins } from './builtins.js';
import { registerExtensions } from '../extensions/index.js';

export function createRegistry(extensions = registerExtensions) {
  const registry = createConstructionRegistry();
  registerBuiltins(registry);
  registerAdvanced(registry);
  registerRadius(registry);
  registerTriangleCurves(registry);
  registerMixtilinear(registry);
  registerIncircle(registry);
  extensions(registry);
  return registry;
}
