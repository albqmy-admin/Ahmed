import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("تعذر العثور على عنصر التطبيق.");

createRoot(rootElement).render(<App />);
