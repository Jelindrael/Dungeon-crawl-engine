import { render } from 'preact';
import { registerSW } from 'virtual:pwa-register';
import { machtVerlieren } from './sim/macht';
import { App } from './ui/App';
import { spiel, ui } from './ui/store';
import './ui/styles.css';

render(<App />, document.getElementById('app')!);

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  registerSW({ immediate: true });
}

// Testzugang für automatisierte Prüfungen: nur mit ?debug in der Adresse
if (import.meta.env.DEV || new URLSearchParams(location.search).has('debug')) {
  (window as unknown as Record<string, unknown>).__morgenrot = { spiel, ui, machtVerlieren };
}
