import { createStudio } from './app.js';

const studio = createStudio();
// Compatibility API for existing integrations; engines themselves have no globals.
window.MMPStudio = studio;
