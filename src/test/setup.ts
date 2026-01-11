// Extend expect() with jest-dom matchers (toBeInTheDocument, toHaveValue, etc.)
import "@testing-library/jest-dom/vitest";

const originalEmitWarning = process.emitWarning;
process.emitWarning = ((...args: Parameters<typeof process.emitWarning>) => {
  const [warning] = args;
  const message =
    typeof warning === "string" ? warning : (warning?.message ?? "");
  if (message.includes("--localstorage-file")) {
    return;
  }
  return originalEmitWarning(...args);
}) as typeof process.emitWarning;
