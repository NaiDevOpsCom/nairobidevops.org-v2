#!/usr/bin/env node
import { runForDir } from "../../scripts/check-node-engine.js";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const targetDir = path.resolve(__dirname, "..");

try {
  await runForDir(targetDir);
} catch (error) {
  console.error("Node engine check failed:", error);
  process.exit(1);
}
