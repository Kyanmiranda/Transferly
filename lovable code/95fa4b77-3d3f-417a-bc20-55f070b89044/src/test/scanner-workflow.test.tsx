import { QueryClient } from "@tanstack/react-query";
import { createMemoryHistory, createRouter, RouterProvider } from "@tanstack/react-router";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { routeTree } from "@/routeTree.gen";
import { Route as rootRoute } from "@/routes/__root";
import { extractFields } from "@/lib/document-extraction";

const scanner = vi.hoisted(() => vi.fn());
vi.mock("@/lib/document-scanner", async (original) => ({
  ...(await original<object>()),
  scanDocument: scanner,
}));
Object.assign(rootRoute.options, {
  shellComponent: ({ children }: { children: ReactNode }) => children,
});
afterEach(cleanup);

it("uses uploaded file contents and keeps review fields editable without demo substitution", async () => {
  scanner.mockImplementation(async (file: File) =>
    extractFields(
      file.name === "id.png"
        ? "First name: Alex\nLast name: Morgan"
        : "Account holder: Alex Morgan\nAccount number: 12345678\nAccount type: TFSA",
      file.name,
    ),
  );
  const router = createRouter({
    routeTree,
    context: { queryClient: new QueryClient() },
    history: createMemoryHistory({ initialEntries: ["/transfers/new"] }),
  });
  render(<RouterProvider router={router} />);
  const identification = await screen.findByLabelText("Client Identification");
  fireEvent.change(identification, {
    target: { files: [new File(["image"], "id.png", { type: "image/png" })] },
  });
  fireEvent.change(screen.getByLabelText("Account Statement"), {
    target: { files: [new File(["pdf"], "statement.pdf", { type: "application/pdf" })] },
  });
  fireEvent.click(screen.getByRole("button", { name: "Scan Documents" }));
  const firstName = await screen.findByDisplayValue("Alex");
  expect(scanner).toHaveBeenCalledTimes(2);
  expect(screen.queryByDisplayValue("Sarah")).toBeNull();
  expect(screen.getByLabelText("Date of Birth")).toHaveValue("");
  expect(screen.getByDisplayValue("12345678")).toBeInTheDocument();
  fireEvent.change(firstName, { target: { value: "Avery" } });
  expect(firstName).toHaveValue("Avery");
});
