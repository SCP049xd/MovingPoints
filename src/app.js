import { createExports } from './io/export-controller.js';
import { createObjectList } from './ui/object-list.js';
import { createRegistry } from './constructions/index.js';
import { createHistory } from './core/history.js';
import { createNumericEvaluation } from './core/numeric-evaluation.js';
import { observeDegreeNotation } from './ui/degree-math.js';
import { createCustomConstructions } from './ui/custom-constructions.js';
import A from './engine/algebra.js';
import { createStatementInput } from './ui/statement-input.js';
import { createStatementFields } from './ui/statement-fields.js';
import { createLiveMotion } from './animation/live-motion.js';
import { createAnalysis } from './ui/analysis.js';
import G from './engine/numeric-geometry.js';
import statementEngine from './engine/statements.js';
import { createShared } from './ui/shared.js';
import { createDocument } from './core/document.js';
import { createCalculation } from './core/calculation.js';
import { createDynamicCalculation } from './core/dynamic-calculation.js';
import { createDynamicStatements } from './core/dynamic-statements.js';
import { createTangentPairs } from './core/tangent-pairs.js';
import { createTools } from './ui/tools.js';
import { createCanvas } from './ui/canvas.js';
import { createInspector } from './ui/inspector.js';
import { createInteraction } from './ui/interaction.js';
import { createDialogs } from './ui/dialogs.js';
import { createWorksheet } from './ui/worksheet.js';
import { createSearch } from './animation/search.js';
import { createPanel } from './animation/panel.js';
import { createBindings } from './ui/bindings.js';
import { createGeogebra } from './io/geogebra.js';

/** Assemble independent engines and document-scoped controllers. No global state. */
export function createStudio({ document = globalThis.document, headless = false, extensions } = {}) {
  const registry = createRegistry(extensions);
  const app = {
    A, G, ST: { ...statementEngine }, registry, document,
    TOOLSET: registry.tools, defs: registry.toolDefinitions, KINDS: registry.kinds,
    pointTypes: registry.pointTypes, lineTypes: registry.lineTypes, curveTypes: registry.curveTypes,
  };
  const install = factory => Object.defineProperties(app, Object.getOwnPropertyDescriptors(factory(app)));
  // Core services precede controllers; factories defer cross-service calls until use.
  const model = [createDocument, createHistory, createCalculation, createNumericEvaluation,
    createDynamicCalculation, createDynamicStatements, createTangentPairs, createLiveMotion];
  const controllers = [createTools, createCanvas, createObjectList, createInspector,
    createAnalysis, createInteraction, createDialogs, createWorksheet, createSearch,
    createPanel, createBindings, createStatementInput, createStatementFields, createCustomConstructions];
  const io = [createExports, createGeogebra];
  for (const factory of [createShared, ...model, ...controllers, ...io]) install(factory);
  app.initCustomConstructions();
  app.fit = () => app.$('#fit').click();
  if (headless) {
    for (const key of ['redrawAll', 'render', 'showToast', 'updateHistoryBtns', 'updateAnimationAssistant', 'renderAnimationAssistant']) app[key] = () => {};
  } else {
    app.bind();
    app.bindGeoGebraImport();
    app.redrawAll();
  }
  if(!headless)observeDegreeNotation(document);
  return app;
}
