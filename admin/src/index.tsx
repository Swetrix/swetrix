#!/usr/bin/env node
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import { config } from "dotenv";

// Suppress dotenv log messages
process.env.DOTENV_CONFIG_QUIET = "true";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env from backend directory if not already loaded (quiet mode)
const backendEnvPath = path.resolve(__dirname, "../../backend/.env");
if (fs.existsSync(backendEnvPath)) {
  config({ path: backendEnvPath, override: false, quiet: true });
}

// Also try local .env
const localEnvPath = path.resolve(__dirname, "../.env");
if (fs.existsSync(localEnvPath)) {
  config({ path: localEnvPath, override: false, quiet: true });
}

import "reflect-metadata";

const { React, render, App } = await (async () => {
  const React = (await import("react")).default;
  const { render } = await import("ink");
  const { App } = await import("./components/App.js");
  return { React, render, App };
})();

render(<App />);
