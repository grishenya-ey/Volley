import { StrictMode } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, HashRouter } from "react-router-dom";
import App from "./App";
import ErrorBoundary from "./components/ErrorBoundary";

const isElectronProduction = window.location.protocol === 'file:';
const Router = isElectronProduction ? HashRouter : BrowserRouter;

if (isElectronProduction && !window.location.hash) {
  const currentPath = window.location.pathname;
  if (currentPath.includes('index.html') || currentPath.includes('dist')) {
    window.location.hash = '#/';
  }
}

const rootEl = document.getElementById("root");
if (!rootEl) throw new Error("Root element #root not found");

const root = ReactDOM.createRoot(rootEl);
root.render(
  <StrictMode>
    <ErrorBoundary>
      <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <App />
      </Router>
    </ErrorBoundary>
  </StrictMode>
);
