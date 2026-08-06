/** Safe client-facing errors — full detail stays in server logs */

export function isProduction() {
  return process.env.NODE_ENV === 'production';
}

export function sendError(res, err, status = 500, fallback = 'Request failed') {
  console.error(err);
  const message =
    status >= 500 && isProduction()
      ? fallback
      : err?.message || fallback;
  return res.status(status).json({ error: message });
}

export function publicErrorMessage(err, fallback = 'Request failed') {
  if (isProduction()) return fallback;
  return err?.message || fallback;
}
