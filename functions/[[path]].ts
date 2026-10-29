export async function onRequest(context: { request: Request; env: { BACKEND: { fetch(request: Request): Promise<Response> } }; next(): Promise<Response> }): Promise<Response> {
  const pathname = new URL(context.request.url).pathname;
  if (pathname.startsWith('/api/') || pathname === '/oauth/callback') {
    return context.env.BACKEND.fetch(context.request);
  }
  return context.next();
}
