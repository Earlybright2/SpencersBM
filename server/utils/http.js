/**
 * Shared Express helpers.
 */

/**
 * Wraps an async Express handler so rejections are turned into a clean 502 JSON
 * response instead of crashing the process (Express 4 doesn't catch async throws).
 */
export function asyncRoute(handler) {
  return (req, res, next) =>
    Promise.resolve(handler(req, res, next)).catch((err) => {
      console.error('[route error]', err);
      if (res.headersSent) return next(err);
      res.status(502).json({
        status: 'error',
        code: 'server_error',
        message: 'Something went wrong. Please try again in a moment.'
      });
    });
}
