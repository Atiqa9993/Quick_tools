import { NextRequest } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const backendUrl = process.env.BACKEND_URL || 'http://127.0.0.1:8000'

    const response = await fetch(`${backendUrl}/api/tools/split-pdf`, {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      const errorText = await response.text()
      let detail = 'Failed to split PDF.'
      try {
        const parsed = JSON.parse(errorText)
        if (parsed.detail) detail = parsed.detail
      } catch {}
      return new Response(JSON.stringify({ detail }), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const pdfBytes = await response.arrayBuffer()
    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': response.headers.get('content-type') || 'application/octet-stream',
        'Content-Disposition': response.headers.get('content-disposition') || 'attachment; filename="split_pdf"',
      },
    })
  } catch (error) {
    console.error('Split PDF Route Error:', error)
    return new Response(JSON.stringify({ detail: 'Internal Server Error connecting to PDF split service.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
