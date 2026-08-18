import { NextRequest } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    
    // Forward the formData containing files directly to the FastAPI backend
    const backendUrl = process.env.BACKEND_URL || 'http://127.0.0.1:8000'
    const response = await fetch(`${backendUrl}/api/tools/merge-pdf`, {
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
        'Content-Type': response.headers.get('content-type') || 'application/pdf',
        'Content-Disposition': response.headers.get('content-disposition') || 'attachment; filename="merged_document.pdf"',
      },
    })
  } catch (error) {
    console.error('API Route Error:', error)
    return new Response(JSON.stringify({ detail: 'Internal Server Error connecting to backend' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
