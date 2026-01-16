import { describe, expect, it, vi } from "vitest";
import { getStoredTheme } from "../theme";

describe("getStoredTheme", () => {
  it("returns null when localStorage access throws", () => {
    const localStorageMock = {
      getItem: vi.fn(() => {
        throw new Error("boom");
      }),
    };

    Object.defineProperty(window, "localStorage", {
      value: localStorageMock,
      writable: true,
    });

    expect(getStoredTheme()).toBeNull();
  });
});
