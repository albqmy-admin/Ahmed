import { createRoot, hydrateRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import "./portal.css";

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("تعذر العثور على عنصر التطبيق.");

if (rootElement.hasChildNodes()) {
  hydrateRoot(rootElement, <App />);
} else {
  createRoot(rootElement).render(<App />);
}
