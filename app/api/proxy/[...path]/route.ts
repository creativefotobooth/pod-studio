import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';

export const maxDuration = 60;

const VPS_API_URL = (process.env.VPS_API_URL || '').replace(/\/+$/, '');
const AUTH_TOKEN = process.env.POD_STUDIO_AUTH_TOKEN || '';

const TIMEOUT_MS = 45_000;

async function proxyRequest(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  // Require valid session cookie
  const sessionCookie = request.cookies.get('pod_studio_session')?.value;
  if (!sessionCookie || !(await verifyToken(sessionCookie))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { path } = await params;
  const targetPath = '/' + path.join('/');
  const targetUrl = `${VPS_API_URL}${targetPath}${request.nextUrl.search}`;

  const method = request.method;

  // Build headers: add auth. For multipart/form-data, do NOT set Content-Type;
  // fetch will add the reconstructed boundary automatically.
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${AUTH_TOKEN}`,
  };

  const contentType = request.headers.get('content-type') || '';
  const isMultipart = contentType.toLowerCase().includes('multipart/form-data');
  if (contentType && !isMultipart) {
    headers['Content-Type'] = contentType;
  }

  let body: BodyInit | undefined;
  if (method !== 'GET' && method !== 'HEAD') {
    try {
      body = isMultipart ? await request.formData() : await request.text();
    } catch {
      body = undefined;
    }
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(targetUrl, {
      method,
      headers,
      body,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // Build response headers, filtering out transfer-encoding
    const responseHeaders = new Headers();
    response.headers.forEach((value, key) => {
      if (!['transfer-encoding', 'connection', 'keep-alive', 'content-encoding', 'content-length'].includes(key.toLowerCase())) {
        responseHeaders.set(key, value);
      }
    });

    const responseContentType = response.headers.get('content-type') || '';
    const isBinary = !responseContentType.includes('json') && !responseContentType.includes('text');

    const responseBody = isBinary
      ? await response.arrayBuffer()
      : await response.text();

    return new NextResponse(responseBody as BodyInit, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  } catch (err: unknown) {
    clearTimeout(timeoutId);

    const message = err instanceof Error ? err.message : 'Unknown error';
    const isTimeout = err instanceof DOMException && err.name === 'AbortError';

    return NextResponse.json(
      {
        error: isTimeout ? 'API timeout' : 'API unreachable',
        detail: message,
      },
      { status: isTimeout ? 504 : 503 }
    );
  }
}

export const GET = proxyRequest;
export const POST = proxyRequest;
export const PUT = proxyRequest;
export const DELETE = proxyRequest;
export const OPTIONS = proxyRequest;
