import React from 'react';
import ReactDOM from 'react-dom/client';
// stylesheet order matters and follows the cascade we want, least to most specific to the graph:
// bootstrap -> theme (tokens, app shell, bootstrap overrides) -> the app's own component CSS,
// which App pulls in transitively. So both CSS imports must precede the App import.
import 'bootstrap/dist/css/bootstrap.min.css';
import './css/theme.css';
import {App} from './App';

// Defer ResizeObserver callbacks to the next animation frame to avoid the benign
// "ResizeObserver loop completed with undelivered notifications" error, which
// CRA's dev overlay surfaces as a fatal uncaught error (triggered by reactflow's
// internal ResizeObserver usage).
const NativeResizeObserver = window.ResizeObserver;
window.ResizeObserver = class extends NativeResizeObserver {
    constructor(callback: ResizeObserverCallback) {
        super((entries, observer) => {
            window.requestAnimationFrame(() => callback(entries, observer));
        });
    }
};

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
    <App />
);
