'use client'
import { useState, useEffect } from 'react'

const POPULAR_CURRENCIES = [
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'GBP', name: 'British Pound', symbol: '£' },
  { code: 'PKR', name: 'Pakistani Rupee', symbol: 'Rs' },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
  { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ' },
  { code: 'SAR', name: 'Saudi Riyal', symbol: '﷼' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥' }
]

export default function CurrencyConverterTool({ loggedIn }: { loggedIn: boolean }) {
  const [rates, setRates] = useState<Record<string, number> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  
  const [amount, setAmount] = useState<string>('1')
  const [fromCurrency, setFromCurrency] = useState('USD')
  const [toCurrency, setToCurrency] = useState('PKR')

  useEffect(() => {
    async function fetchRates() {
      try {
        setLoading(true)
        // Using a reliable free public API for exchange rates
        const res = await fetch('https://open.er-api.com/v6/latest/USD')
        if (!res.ok) throw new Error('Failed to fetch rates')
        const data = await res.json()
        setRates(data.rates)
      } catch (err) {
        setError('Unable to fetch live currency rates. Please check your connection or try again later.')
      } finally {
        setLoading(false)
      }
    }
    fetchRates()
  }, [])

  const handleSwap = () => {
    setFromCurrency(toCurrency)
    setToCurrency(fromCurrency)
  }

  // Calculate result
  let result = 0
  let singleUnitRate = 0
  
  if (rates && rates[fromCurrency] && rates[toCurrency]) {
    const numAmount = Number(amount)
    if (!isNaN(numAmount)) {
      // Rates are based on USD. 
      // To convert X FROM to TO: (X / rate_FROM) * rate_TO
      const usdAmount = numAmount / rates[fromCurrency]
      result = usdAmount * rates[toCurrency]
    }
    singleUnitRate = (1 / rates[fromCurrency]) * rates[toCurrency]
  }

  // Combine popular currencies with the rest fetched from API
  const allCurrencyCodes = rates ? Object.keys(rates).sort() : POPULAR_CURRENCIES.map(c => c.code)

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 4
    }).format(val)
  }

  return (
    <div className="space-y-6">
      
      {error && (
        <div className="flex items-center gap-3 bg-error-container text-on-error-container text-sm px-4 py-3 rounded-xl border border-error/20">
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>wifi_off</span>
          <p className="font-medium">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-12 text-center shadow-sm">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-on-surface-variant text-sm font-bold animate-pulse">Fetching live market rates...</p>
        </div>
      ) : (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl shadow-sm p-6 relative">
          
          <div className="flex flex-col sm:flex-row items-center gap-4">
            
            {/* AMOUNT AND FROM CURRENCY */}
            <div className="flex-1 w-full space-y-3">
              <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Amount</label>
              <div className="flex bg-surface-container rounded-xl border border-outline-variant focus-within:border-primary focus-within:ring-1 focus-within:ring-primary overflow-hidden transition-all">
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-transparent px-4 py-4 text-2xl font-bold text-on-surface outline-none"
                />
                <div className="border-l border-outline-variant bg-surface-container-lowest shrink-0">
                  <select
                    value={fromCurrency}
                    onChange={(e) => setFromCurrency(e.target.value)}
                    className="h-full px-4 py-4 bg-transparent text-sm font-bold text-on-surface outline-none cursor-pointer appearance-none pr-8 relative"
                    style={{ backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23131313%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right .7em top 50%', backgroundSize: '.65em auto' }}
                  >
                    <optgroup label="Popular">
                      {POPULAR_CURRENCIES.map(c => (
                        <option key={`pop-from-${c.code}`} value={c.code}>{c.code} - {c.name}</option>
                      ))}
                    </optgroup>
                    <optgroup label="All Currencies">
                      {allCurrencyCodes.map(code => (
                        <option key={`all-from-${code}`} value={code}>{code}</option>
                      ))}
                    </optgroup>
                  </select>
                </div>
              </div>
            </div>

            {/* SWAP BUTTON */}
            <div className="shrink-0 pt-4 sm:pt-7">
              <button
                onClick={handleSwap}
                className="w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center hover:bg-primary/20 transition-colors border border-primary/20"
                title="Swap Currencies"
              >
                <span className="material-symbols-outlined font-bold">sync_alt</span>
              </button>
            </div>

            {/* CONVERTED TO SECTION */}
            <div className="flex-1 w-full space-y-3">
              <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Converted To</label>
              <div className="flex bg-surface-container-highest rounded-xl border border-transparent overflow-hidden opacity-90 cursor-default">
                <input
                  type="text"
                  readOnly
                  value={formatCurrency(result)}
                  placeholder="0.00"
                  className="w-full bg-transparent px-4 py-4 text-2xl font-bold text-emerald-600 outline-none cursor-not-allowed select-all"
                />
                <div className="border-l border-outline-variant bg-surface-container shrink-0">
                  <select
                    value={toCurrency}
                    onChange={(e) => setToCurrency(e.target.value)}
                    className="h-full px-4 py-4 bg-transparent text-sm font-bold text-on-surface outline-none cursor-pointer appearance-none pr-8"
                    style={{ backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23131313%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right .7em top 50%', backgroundSize: '.65em auto' }}
                  >
                    <optgroup label="Popular">
                      {POPULAR_CURRENCIES.map(c => (
                        <option key={`pop-to-${c.code}`} value={c.code}>{c.code} - {c.name}</option>
                      ))}
                    </optgroup>
                    <optgroup label="All Currencies">
                      {allCurrencyCodes.map(code => (
                        <option key={`all-to-${code}`} value={code}>{code}</option>
                      ))}
                    </optgroup>
                  </select>
                </div>
              </div>
            </div>

          </div>
          
          {/* Helper info / Base Rate */}
          {amount && !isNaN(Number(amount)) && !error && (
            <div className="mt-8 pt-5 border-t border-outline-variant flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-sm">
                <span className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>monitoring</span>
                </span>
                <p className="font-medium text-on-surface-variant">
                  Mid-market exchange rate
                </p>
              </div>
              
              <div className="text-right">
                <p className="text-sm font-bold text-on-surface">
                  1 {fromCurrency} = {formatCurrency(singleUnitRate)} {toCurrency}
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
