import { parseProject, serializeProject } from '../io/project.js';

/** Serialized snapshots exclude computed vectors and transient panel state. */
export function createHistory(app) {
  const { state, animDraft } = app;
  const saveState = () => serializeProject(state);
  const validateProject = json => parseProject(json, app.registry, app.ST);
  function snapshot() {
    if (animDraft.preview) {
      app.discardAnimationPreview({ redraw: false });
    }
    state.history.push(saveState());
    if (state.history.length > 55) {
      state.history.shift();
    }
    state.future = [];
    app.updateHistoryBtns();
  }
  function restore(json) {
    const project = validateProject(json);
    Object.assign(state, project, { special: null, pending: [] });
    animDraft.preview = null;
    animDraft.results = [];
    animDraft.busy = false;
    animDraft.progress = 0;
    animDraft.key = '';
    animDraft.sourceSignature = null;
    animDraft.searchId++;
    app.recompute();
    app.redrawAll();
    app.updateAnimationAssistant();
  }
  function undo() {
    if (animDraft.preview) {
      app.discardAnimationPreview();
      app.showToast('Podgląd anulowany. Oryginalny rysunek pozostał bez zmian.');
      return;
    }
    if (!state.history.length) {
      return;
    }
    state.future.push(saveState());
    restore(state.history.pop());
    app.updateHistoryBtns();
  }
  function redo() {
    if (animDraft.preview) {
      app.showToast('Najpierw zatwierdź animację albo wróć do rysunku.', true);
      return;
    }
    if (!state.future.length) {
      return;
    }
    state.history.push(saveState());
    restore(state.future.pop());
    app.updateHistoryBtns();
  }
  return { saveState, validateProject, snapshot, restore, undo, redo };
}
