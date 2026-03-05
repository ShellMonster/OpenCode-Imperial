export function isAuthorized(request: Request, token?: string): boolean {
  if (!token) return true

  const url = new URL(request.url)
  const queryToken = url.searchParams.get("token")
  if (queryToken === token) return true

  const bearer = request.headers.get("authorization")
  if (bearer === `Bearer ${token}`) return true

  const headerToken = request.headers.get("x-imperial-token")
  if (headerToken === token) return true

  return false
}
