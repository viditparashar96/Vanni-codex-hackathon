import { NextRequest, NextResponse } from "next/server";

/**
 * Same-origin proxy → platform API (PRD §5).
 * Forwards /api/* to the backend once NEXT_PUBLIC_API_URL is set,
 * so cookies stay first-party. Returns 503 while the backend is offline.
 */
const API_URL = process.env.NEXT_PUBLIC_API_URL;

async function proxy(req: NextRequest) {
  if (!API_URL) {
    return NextResponse.json(
      { error: "backend_offline", message: "Set NEXT_PUBLIC_API_URL to enable the API proxy." },
      { status: 503 },
    );
  }
  const url = new URL(req.url);
  const target = `${API_URL}${url.pathname}${url.search}`;
  const res = await fetch(target, {
    method: req.method,
    headers: req.headers,
    body: req.method === "GET" || req.method === "HEAD" ? undefined : await req.blob(),
    redirect: "manual",
  });
  return new NextResponse(res.body, { status: res.status, headers: res.headers });
}

export {
  proxy as GET,
  proxy as POST,
  proxy as PUT,
  proxy as PATCH,
  proxy as DELETE,
};
