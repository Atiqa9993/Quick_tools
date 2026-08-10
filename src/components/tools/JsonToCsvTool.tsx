'use client'
import { useState, useMemo } from 'react'
import * as XLSX from 'xlsx'

// Helper to flatten nested JSON objects and arrays
function flattenObject(ob: any): any {
  let toReturn: any = {}
  for (let i in ob) {
    if (!ob.hasOwnProperty(i)) continue
    
    if (typeof ob[i] === 'object' && ob[i] !== null && !Array.isArray(ob[i])) {
      let flatObject = flattenObject(ob[i])
      for (let x in flatObject) {
        if (!flatObject.hasOwnProperty(x)) continue
        // Using leaf key name directly as requested (e.g. email instead of contact.email)
        toReturn[x] = flatObject[x]
      }
    } else if (Array.isArray(ob[i])) {
      toReturn[i] = ob[i].join(', ')
    } else {
      toReturn[i] = ob[i]
    }
  }
  return toReturn
}

export default function JsonToCsvTool({ loggedIn }: { loggedIn: boolean }) {
  const [jsonText, setJsonText] = useState('')
  const [error, setError] = useState('')
  const [parsedData, setParsedData] = useState<any[] | null>(null)
  const [previewTab, setPreviewTab] = useState<'csv' | 'excel'>('csv')

  const handleParse = () => {
    setError('')
    setParsedData(null)
    
    const trimmed = jsonText.trim()
    if (!trimmed) {
      setError("Please enter some JSON text.")
      return
    }

    try {
      let data = JSON.parse(trimmed)
      
      // Ensure it's an array for table format
      if (!Array.isArray(data)) {
        if (typeof data === 'object' && data !== null) {
          data = [data]
        } else {
          throw new Error("JSON must be an object or an array of objects.")
        }
      }

      if (data.length === 0) {
         throw new Error("JSON array is empty.")
      }
      
      // Flatten the data so nested fields are handled properly
      const flattenedData = data.map((item: any) => flattenObject(item))
      setParsedData(flattenedData)
    } catch (err: any) {
      // Catch syntax errors specifically as requested
      setError(err instanceof SyntaxError ? "Invalid JSON entered. Please check your formatting." : err.message)
    }
  }

  const downloadCSV = () => {
    if (!parsedData) return
    const worksheet = XLSX.utils.json_to_sheet(parsedData)
    const csv = XLSX.utils.sheet_to_csv(worksheet)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = 'converted_data.csv'
    link.click()
  }

  const downloadExcel = () => {
    if (!parsedData) return
    const worksheet = XLSX.utils.json_to_sheet(parsedData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, "Data")
    XLSX.writeFile(workbook, "converted_data.xlsx")
  }

  const clearAll = () => {
    setJsonText('')
    setError('')
    setParsedData(null)
  }

  // Generate preview data (max 50 rows)
  const previewData = useMemo(() => {
    if (!parsedData) return { csvStr: '', headers: [], rows: [] }
    const previewSubset = parsedData.slice(0, 50)
    
    const worksheet = XLSX.utils.json_to_sheet(previewSubset)
    const csvStr = XLSX.utils.sheet_to_csv(worksheet)
    
    // Get unique headers for Excel preview table
    const headersSet = new Set<string>()
    previewSubset.forEach(row => {
      Object.keys(row).forEach(k => headersSet.add(k))
    })
    const headers = Array.from(headersSet)
    
    return { csvStr, headers, rows: previewSubset }
  }, [parsedData])

  return (
    <div className="space-y-6">
      {/* Input */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2.5 bg-surface-container border-b border-outline-variant">
          <span className="text-xs font-bold text-on-surface-variant flex items-center gap-2">
            <span className="material-symbols-outlined text-primary" style={{ fontSize: 16 }}>data_object</span>
            Paste JSON Data
          </span>
          {jsonText.length > 0 && (
            <button
              onClick={clearAll}
              className="inline-flex items-center gap-1 text-xs font-bold text-on-surface-variant hover:text-error transition-colors px-2 py-1 rounded-lg hover:bg-error-container"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>close</span>
              Clear
            </button>
          )}
        </div>
        <textarea
          value={jsonText}
          onChange={(e) => { setJsonText(e.target.value); setError(''); setParsedData(null); }}
          placeholder={'[\n  {\n    "id": 1024,\n    "name": "Alex Mercer",\n    "contact": {\n      "email": "alex@example.com"\n    }\n  }\n]'}
          className="w-full min-h-[240px] bg-transparent text-on-surface text-sm leading-relaxed p-5 outline-none resize-y placeholder:text-on-surface-variant/50 font-mono"
          autoFocus
        />
      </div>

      {error && (
        <div className="flex items-center gap-3 bg-error-container text-on-error-container text-sm px-4 py-3 rounded-xl border border-error/20">
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>error</span>
          <p className="font-medium">{error}</p>
        </div>
      )}

      {/* Action Buttons */}
      {!parsedData && (
        <button
          onClick={handleParse}
          className="w-full flex items-center justify-center gap-2 font-bold py-4 rounded-xl transition-colors shadow-sm text-sm tracking-wide bg-primary text-on-primary hover:bg-primary-container hover:text-on-primary-container"
        >
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>published_with_changes</span>
          Convert JSON Data
        </button>
      )}

      {/* Results */}
      {parsedData && (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl shadow-sm overflow-hidden">
          <div className="p-6 border-b border-outline-variant space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined" style={{ fontSize: 22 }}>check_circle</span>
                </div>
                <div>
                  <p className="text-sm font-bold text-on-surface">Valid JSON Parsed Successfully!</p>
                  <p className="text-xs text-on-surface-variant mt-0.5">Found {parsedData.length} records. Ready to download.</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                onClick={downloadCSV}
                className="flex items-center justify-center gap-2 font-bold py-3.5 px-4 rounded-xl transition-colors border-2 border-primary text-primary hover:bg-primary/5 text-sm"
              >
                <span className="material-symbols-outlined" style={{ fontSize: 20 }}>table_chart</span>
                Download CSV
              </button>
              <button
                onClick={downloadExcel}
                className="flex items-center justify-center gap-2 font-bold py-3.5 px-4 rounded-xl transition-colors bg-[#107c41] text-white hover:bg-[#185c37] shadow-sm text-sm"
              >
                <span className="material-symbols-outlined" style={{ fontSize: 20 }}>grid_on</span>
                Download Excel (.xlsx)
              </button>
            </div>
          </div>
          
          {/* Preview Section */}
          <div className="bg-surface-container">
            <div className="flex items-center gap-4 px-6 py-3 border-b border-outline-variant">
              <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Preview (Top 50 rows)</span>
              <div className="flex bg-surface-container-lowest rounded-lg p-1 border border-outline-variant">
                <button
                  onClick={() => setPreviewTab('csv')}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${previewTab === 'csv' ? 'bg-primary text-on-primary shadow-sm' : 'text-on-surface-variant hover:bg-surface-variant'}`}
                >
                  CSV Format
                </button>
                <button
                  onClick={() => setPreviewTab('excel')}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${previewTab === 'excel' ? 'bg-[#107c41] text-white shadow-sm' : 'text-on-surface-variant hover:bg-surface-variant'}`}
                >
                  Excel Table
                </button>
              </div>
            </div>
            
            <div className="p-0 max-h-[400px] overflow-auto">
              {previewTab === 'csv' ? (
                <textarea 
                  readOnly 
                  value={previewData.csvStr}
                  className="w-full h-full min-h-[300px] p-6 text-sm font-mono bg-transparent text-on-surface resize-none outline-none"
                />
              ) : (
                <div className="w-full inline-block min-w-full align-middle">
                  <table className="min-w-full divide-y divide-outline-variant">
                    <thead className="bg-surface-container-lowest sticky top-0">
                      <tr>
                        {previewData.headers.map((h, i) => (
                          <th key={i} scope="col" className="px-4 py-3 text-left text-xs font-bold text-on-surface-variant uppercase tracking-wider border-b border-r border-outline-variant last:border-r-0 whitespace-nowrap bg-surface-container-lowest">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-transparent divide-y divide-outline-variant">
                      {previewData.rows.map((row, i) => (
                        <tr key={i} className="hover:bg-surface-container-lowest/50">
                          {previewData.headers.map((h, j) => (
                            <td key={j} className="px-4 py-2.5 text-sm text-on-surface whitespace-nowrap border-r border-outline-variant last:border-r-0">
                              {row[h] !== undefined && row[h] !== null ? String(row[h]) : ''}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
