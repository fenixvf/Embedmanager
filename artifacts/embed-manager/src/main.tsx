import { createRoot } from "react-dom/client";
import { setBaseUrl } from "@workspace/api-client-react";
import App from "./App";
import "./index.css";

// In production (Render), the API lives on a different domain.
// Set VITE_API_URL in the Render static site env vars to point to the API service.
// Example: https://embed-manager-api.onrender.com
const apiUrl = import.meta.env.VITE_API_URL;
if (apiUrl) {
  setBaseUrl(apiUrl);
}

createRoot(document.getElementById("root")!).render(<App />);
