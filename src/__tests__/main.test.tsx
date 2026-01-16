import { describe, expect, it, vi } from "vitest";

const renderMock = vi.fn();
const createRootMock = vi.fn(() => ({ render: renderMock }));

vi.mock("react-dom/client", () => ({
  createRoot: createRootMock,
}));

vi.mock("../App", () => ({
  default: () => null,
}));

describe("main", () => {
  it("renders the app into the root element", async () => {
    const root = document.createElement("div");
    root.id = "root";
    document.body.appendChild(root);

    vi.resetModules();

    await import("../main");

    expect(createRootMock).toHaveBeenCalledWith(
      document.getElementById("root"),
    );
    expect(renderMock).toHaveBeenCalled();
  });
});
