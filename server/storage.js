"use strict";

const fs = require("node:fs/promises");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const runtimeRoot = path.resolve(
  process.env.CANOPY_DATA_DIR || path.join(__dirname, "runtime"),
);
const queues = new Map();

const files = {
  plants: path.join(runtimeRoot, "plants.json"),
  users: path.join(runtimeRoot, "users.json"),
  orders: path.join(runtimeRoot, "orders.json"),
  feedback: path.join(runtimeRoot, "feedback.json"),
};

async function exists(file) {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}

async function writeJson(file, value) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.tmp`;
  await fs.writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await fs.rename(temporary, file);
}

async function initialize() {
  await fs.mkdir(runtimeRoot, { recursive: true });

  if (!(await exists(files.plants))) {
    const source = JSON.parse(
      await fs.readFile(path.join(projectRoot, "data/plants-detailed-v2.json"), "utf8"),
    );
    await writeJson(files.plants, source);
  }

  for (const key of ["users", "orders", "feedback"]) {
    if (!(await exists(files[key]))) await writeJson(files[key], []);
  }
}

async function read(key) {
  if (!files[key]) throw new Error(`Unknown storage key: ${key}`);
  return JSON.parse(await fs.readFile(files[key], "utf8"));
}

function update(key, updater) {
  const previous = queues.get(key) || Promise.resolve();
  const next = previous.then(async () => {
    const value = await read(key);
    const updated = await updater(value);
    await writeJson(files[key], updated);
    return updated;
  });
  queues.set(key, next.catch(() => undefined));
  return next;
}

module.exports = {
  projectRoot,
  runtimeRoot,
  files,
  initialize,
  read,
  update,
  writeJson,
};

