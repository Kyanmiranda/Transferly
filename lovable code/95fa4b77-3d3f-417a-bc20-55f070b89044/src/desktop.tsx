import { createRoot } from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import { Route } from "./routes/__root";
import { getRouter } from "./router";
import "./styles.css";

// The packaged app supplies its own static HTML document instead of Start's SSR shell.
Object.assign(Route.options, {
  shellComponent: ({ children }: { children: React.ReactNode }) => children,
});
createRoot(document.getElementById("root")!).render(<RouterProvider router={getRouter()} />);
