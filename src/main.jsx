import { createRoot } from "react-dom/client";

import "./styles/global.css";
import "./styles/navbar.css";
import "./styles/hero.css";
import "./styles/sections.css";
import "./styles/responsive.css";

import App from "./App.jsx";

createRoot(document.getElementById("root")).render(<App />);
