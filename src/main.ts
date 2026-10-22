import './styles.css';
import { App } from './app/App';
import { watchForUpdates } from './app/updates';
import { isTouchDevice } from './core/constants';
import { initLayout } from './ui/layout';

// Interfaz táctil (también se activa con el primer toque en dispositivos híbridos)
if (isTouchDevice()) document.documentElement.classList.add('touch');

// Interfaz de escritorio o móvil (según la entrada y la pantalla, o lo elegido en ajustes)
initLayout();

const app = new App();

// Versión nueva publicada: se aplica sola al abrir o se avisa (ver app/updates.ts)
watchForUpdates(app);
