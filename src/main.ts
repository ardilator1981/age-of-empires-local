import './styles.css';
import { App } from './app/App';
import { isTouchDevice } from './core/constants';
import { initLayout } from './ui/layout';

// Interfaz táctil (también se activa con el primer toque en dispositivos híbridos)
if (isTouchDevice()) document.documentElement.classList.add('touch');

// Interfaz de escritorio o móvil (según la entrada y la pantalla, o lo elegido en ajustes)
initLayout();

new App();
