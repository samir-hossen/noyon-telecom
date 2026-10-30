// Serve the last good app shell immediately while refreshing it in the
// background. Concurrent page requests share one refresh.
export function createShellCache(load, {
  ttlMs = 60_000,
  retryMs = 10_000,
  now = Date.now,
  onError = () => {},
} = {}) {
  let html = null;
  let refreshAt = 0;
  let pending = null;

  return async function getCachedShell() {
    if (now() < refreshAt) return html;
    if (!pending) {
      pending = Promise.resolve()
        .then(load)
        .then((next) => {
          html = next;
          refreshAt = now() + ttlMs;
          return html;
        })
        .catch((error) => {
          refreshAt = now() + retryMs;
          onError(error);
          return html;
        })
        .finally(() => { pending = null; });
    }
    return html ?? pending;
  };
}
