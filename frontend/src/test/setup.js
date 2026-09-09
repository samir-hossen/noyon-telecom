import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';

// Node 22+ ships its own `localStorage`/`sessionStorage` globals, which are
// `undefined` unless the process was started with `--localstorage-file`.
// Vitest's jsdom environment refuses to overwrite globals that Node already
// defines, so jsdom's working Storage never lands on `globalThis` and any
// test (or component) touching `localStorage` sees `undefined` instead.
// The app itself guards every storage access with try/catch, so this only
// ever bit the tests — but it made them fail on Node 22+ while passing on
// older Node. Installing a real in-memory Storage here keeps the suite
// behaving the same way a browser does, on every Node version.
function createStorage() {
  const data = new Map();
  return {
    get length() {
      return data.size;
    },
    key: (i) => Array.from(data.keys())[i] ?? null,
    getItem: (k) => (data.has(String(k)) ? data.get(String(k)) : null),
    setItem: (k, v) => void data.set(String(k), String(v)),
    removeItem: (k) => void data.delete(String(k)),
    clear: () => data.clear(),
  };
}

for (const name of ['localStorage', 'sessionStorage']) {
  if (globalThis[name] == null) {
    const storage = createStorage();
    Object.defineProperty(globalThis, name, {
      value: storage,
      configurable: true,
      writable: true,
    });
    if (globalThis.window && globalThis.window !== globalThis) {
      Object.defineProperty(globalThis.window, name, {
        value: storage,
        configurable: true,
        writable: true,
      });
    }
  }
}

// Storage is shared process-wide within a test file, so a key one test writes
// would otherwise leak into the next one and change what it renders.
afterEach(() => {
  globalThis.localStorage?.clear();
  globalThis.sessionStorage?.clear();
});
