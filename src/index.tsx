import React from 'react';
import ReactDOM from 'react-dom/client';
import {App} from './App';
import 'bootstrap/dist/css/bootstrap.min.css';

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
