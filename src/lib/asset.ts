/**
 * Resolve a site-absolute asset path against the deployment's base URL.
 *
 * The site is served from the domain root on Vercel but from a repository
 * subpath on GitHub Pages, so a hardcoded "/assets/..." fetch 404s on one of
 * them. Vite substitutes BASE_URL at build time and always leaves a trailing
 * slash on it, so joining is a matter of dropping the leading slash here.
 */
export const asset = (path: string) => {
  const base = import.meta.env.BASE_URL || '/'
  return base.replace(/\/$/, '/') + path.replace(/^\//, '')
}
