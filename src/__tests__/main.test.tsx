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
    document.body.innerHTML = '<div id="root"></div>';

    vi.resetModules();

    await import("../main");

    expect(createRootMock).toHaveBeenCalledWith(
      document.getElementById("root"),
    );
    expect(renderMock).toHaveBeenCalled();
  });
});
