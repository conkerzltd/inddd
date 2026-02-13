import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import "./index.css";

// Runtime RTL enforcer — ensures dir/lang are always set
const html = document.documentElement;
html.lang = "ar";
html.dir = "rtl";

createRoot(document.getElementById("root")!).render(
	<HelmetProvider>
		<App />
	</HelmetProvider>
);
