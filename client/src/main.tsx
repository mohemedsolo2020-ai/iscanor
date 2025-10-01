import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { initializePopupBlocker } from "./lib/popup-blocker";

initializePopupBlocker();

createRoot(document.getElementById("root")!).render(<App />);
