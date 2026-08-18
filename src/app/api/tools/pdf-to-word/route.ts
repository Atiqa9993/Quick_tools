import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const backendUrl = process.env.BACKEND_URL || 'http://127.0.0.1:8000';
    const backendResponse = await fetch(`${backendUrl}/api/tools/pdf-to-word`, {
      method: 'POST',
      body: formData,
    });
    const data = await backendResponse.arrayBuffer();
    const headers = new Headers();
    const contentType = backendResponse.headers.get('content-type') || 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    headers.set('content-type', contentType);
    const disposition = backendResponse.headers.get('content-disposition');
    if (disposition) {
      headers.set('content-disposition', disposition);
    }
    return new NextResponse(data, {
      status: backendResponse.status,
      headers,
    });
  } catch (err) {
    console.error('Proxy pdf-to-word error:', err);
    return NextResponse.json({ error: 'Proxy error', details: (err as any).message }, { status: 500 });
  }
}
