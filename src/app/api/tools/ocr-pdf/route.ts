import { NextRequest } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()

    const backendUrl = process.env.BACKEND_URL || 'http://127.0.0.1:8000'
    const response = await fetch(`${backendUrl}/api/tools/ocr-pdf`, {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      const errorText = await response.text()
      return new Response(errorText, { status: response.status })
    }

    const contentType = response.headers.get('content-type') || ''
    if (contentType.includes('application/json')) {
      const json = await response.json()
      return new Response(JSON.stringify(json), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    } else {
      const text = await response.text()
      return new Response(text, {
        status: 200,
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Content-Disposition': response.headers.get('content-disposition') || 'attachment; filename="digitized_text.txt"',
        },
      })
    }
  } catch (error) {
    console.error('OCR PDF Route Error:', error)
    return new Response(JSON.stringify({ detail: 'Internal Server Error connecting to PDF OCR service' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
