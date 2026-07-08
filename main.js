// Delta Gold - App Bootstrap
// Minimal entry point: all UI lives in ui/ modules

import { initDashboard } from './ui/dashboard.js';

const root = document.getElementById('app');
if (root) {
  initDashboard(root);
}
