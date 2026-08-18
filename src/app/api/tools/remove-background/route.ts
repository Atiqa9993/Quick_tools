import { NextRequest } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()

    const backendUrl = process.env.BACKEND_URL || 'http://127.0.0.1:8000'
    const response = await fetch(`${backendUrl}/api/tools/remove-background`, {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      const errorText = await response.text()
      return new Response(errorText, { status: response.status })
    }

    const data = await response.arrayBuffer()
    return new Response(data, {
      status: 200,
      headers: {
        'Content-Type': response.headers.get('content-type') || 'image/png',
        'Content-Disposition': response.headers.get('content-disposition') || 'attachment; filename="transparent.png"',
      },
    })
  } catch (error) {
    console.error('API Route Error:', error)
    return new Response(JSON.stringify({ detail: 'Internal Server Error connecting to background removal service' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
