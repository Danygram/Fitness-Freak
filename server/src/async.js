// Wrap an async Express handler so a rejected promise is forwarded to the
// error-handling middleware (Express 4 does not do this automatically).
export function ah(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}
