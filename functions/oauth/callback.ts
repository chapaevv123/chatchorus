export async function onRequest(context: { request: Request; env: { BACKEND: { fetch(request: Request): Promise<Response> } } }): Promise<Response> {
  return context.env.BACKEND.fetch(context.request);
}
