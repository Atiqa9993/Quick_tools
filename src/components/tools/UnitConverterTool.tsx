'use client'
import { useState, useEffect } from 'react'

const CONVERSIONS = {
  length: {
    name: 'Length',
    icon: 'straighten',
    units: [
      { id: 'meter', name: 'Meter', toBase: 1 },
      { id: 'kilometer', name: 'Kilometer', toBase: 1000 },
      { id: 'centimeter', name: 'Centimeter', toBase: 0.01 },
      { id: 'millimeter', name: 'Millimeter', toBase: 0.001 },
      { id: 'mile', name: 'Mile', toBase: 1609.344 },
      { id: 'yard', name: 'Yard', toBase: 0.9144 },
      { id: 'foot', name: 'Foot', toBase: 0.3048 },
      { id: 'inch', name: 'Inch', toBase: 0.0254 },
    ]
  },
  weight: {
    name: 'Weight',
    icon: 'scale',
    units: [
      { id: 'kilogram', name: 'Kilogram', toBase: 1 },
      { id: 'gram', name: 'Gram', toBase: 0.001 },
      { id: 'milligram', name: 'Milligram', toBase: 0.000001 },
      { id: 'metric_ton', name: 'Metric Ton', toBase: 1000 },
      { id: 'pound', name: 'Pound', toBase: 0.45359237 },
      { id: 'ounce', name: 'Ounce', toBase: 0.028349523125 },
    ]
  },
  area: {
    name: 'Area',
    icon: 'aspect_ratio',
    units: [
      { id: 'sq_meter', name: 'Square Meter', toBase: 1 },
      { id: 'sq_km', name: 'Square Kilometer', toBase: 1000000 },
      { id: 'sq_mile', name: 'Square Mile', toBase: 2589988.11 },
      { id: 'sq_yard', name: 'Square Yard', toBase: 0.83612736 },
      { id: 'sq_foot', name: 'Square Foot', toBase: 0.09290304 },
      { id: 'sq_inch', name: 'Square Inch', toBase: 0.00064516 },
      { id: 'hectare', name: 'Hectare', toBase: 10000 },
      { id: 'acre', name: 'Acre', toBase: 4046.85642 },
    ]
  },
  volume: {
    name: 'Volume',
    icon: 'water_drop',
    units: [
      { id: 'liter', name: 'Liter', toBase: 1 },
      { id: 'milliliter', name: 'Milliliter', toBase: 0.001 },
      { id: 'cubic_meter', name: 'Cubic Meter', toBase: 1000 },
      { id: 'gallon_us', name: 'Gallon (US)', toBase: 3.78541178 },
      { id: 'quart_us', name: 'Quart (US)', toBase: 0.946352946 },
      { id: 'pint_us', name: 'Pint (US)', toBase: 0.473176473 },
      { id: 'cup_us', name: 'Cup (US)', toBase: 0.24 },
      { id: 'fluid_ounce_us', name: 'Fluid Ounce (US)', toBase: 0.02957353 },
    ]
  }
}

type CategoryKey = keyof typeof CONVERSIONS

export default function UnitConverterTool({ loggedIn }: { loggedIn: boolean }) {
  const [category, setCategory] = useState<CategoryKey>('length')
  
  const [fromUnit, setFromUnit] = useState(CONVERSIONS['length'].units[0].id)
  const [toUnit, setToUnit] = useState(CONVERSIONS['length'].units[1].id)
  
  const [fromValue, setFromValue] = useState<string>('1')
  const [toValue, setToValue] = useState<string>('')

  // Handle category change
  useEffect(() => {
    const defaultUnits = CONVERSIONS[category].units
    setFromUnit(defaultUnits[0].id)
    setToUnit(defaultUnits[1].id)
  }, [category])

  // Calculate conversion
  useEffect(() => {
    if (!fromValue || isNaN(Number(fromValue))) {
      setToValue('')
      return
    }

    const units = CONVERSIONS[category].units
    const fromDef = units.find(u => u.id === fromUnit)
    const toDef = units.find(u => u.id === toUnit)

    if (fromDef && toDef) {
      const baseValue = Number(fromValue) * fromDef.toBase
      let result = baseValue / toDef.toBase
      
      // Format nicely to avoid crazy decimals
      if (result % 1 !== 0) {
        result = Number(result.toFixed(6))
      }
      
      setToValue(result.toString())
    }
  }, [fromValue, fromUnit, toUnit, category])

  const handleSwap = () => {
    const currentFrom = fromUnit
    setFromUnit(toUnit)
    setToUnit(currentFrom)
  }

  const handleFromChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFromValue(e.target.value)
  }

  return (
    <div className="space-y-6">
      {/* Category Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {(Object.entries(CONVERSIONS) as [CategoryKey, typeof CONVERSIONS[CategoryKey]][]).map(([key, cat]) => {
          const isActive = category === key
          return (
            <button
              key={key}
              onClick={() => setCategory(key)}
              className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 font-bold text-sm transition-all ${
                isActive
                  ? 'border-primary bg-primary/5 text-primary shadow-sm'
                  : 'border-outline-variant/60 text-on-surface-variant hover:border-primary/40 hover:bg-surface-container'
              }`}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>{cat.icon}</span>
              {cat.name}
            </button>
          )
        })}
      </div>

      {/* Converter Box */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl shadow-sm p-6 relative">
        <div className="flex flex-col sm:flex-row items-center gap-4">
          
          {/* FROM SECTION */}
          <div className="flex-1 w-full space-y-3">
            <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">From</label>
            <div className="flex bg-surface-container rounded-xl border border-outline-variant focus-within:border-primary focus-within:ring-1 focus-within:ring-primary overflow-hidden transition-all">
              <input
                type="number"
                value={fromValue}
                onChange={handleFromChange}
                placeholder="0"
                className="w-full bg-transparent px-4 py-3.5 text-lg font-bold text-on-surface outline-none"
              />
              <div className="border-l border-outline-variant bg-surface-container-lowest shrink-0">
                <select
                  value={fromUnit}
                  onChange={(e) => setFromUnit(e.target.value)}
                  className="h-full px-4 py-3.5 bg-transparent text-sm font-bold text-on-surface outline-none cursor-pointer appearance-none pr-8 relative"
                  style={{ backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23131313%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right .7em top 50%', backgroundSize: '.65em auto' }}
                >
                  {CONVERSIONS[category].units.map(u => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* SWAP BUTTON */}
          <div className="shrink-0 pt-4 sm:pt-7">
            <button
              onClick={handleSwap}
              className="w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center hover:bg-primary/20 transition-colors border border-primary/20"
              title="Swap Units"
            >
              <span className="material-symbols-outlined font-bold">sync_alt</span>
            </button>
          </div>

          {/* TO SECTION */}
          <div className="flex-1 w-full space-y-3">
            <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">To</label>
            <div className="flex bg-surface-container-highest rounded-xl border border-transparent overflow-hidden opacity-90 cursor-default">
              <input
                type="text"
                readOnly
                value={toValue}
                placeholder="0"
                className="w-full bg-transparent px-4 py-3.5 text-lg font-bold text-on-surface outline-none cursor-not-allowed select-all"
              />
              <div className="border-l border-outline-variant bg-surface-container shrink-0">
                <select
                  value={toUnit}
                  onChange={(e) => setToUnit(e.target.value)}
                  className="h-full px-4 py-3.5 bg-transparent text-sm font-bold text-on-surface outline-none cursor-pointer appearance-none pr-8"
                  style={{ backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23131313%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right .7em top 50%', backgroundSize: '.65em auto' }}
                >
                  {CONVERSIONS[category].units.map(u => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

        </div>
        
        {/* Helper info */}
        {fromValue && toValue && !isNaN(Number(fromValue)) && (
          <div className="mt-6 pt-5 border-t border-outline-variant text-center">
            <p className="text-sm font-medium text-on-surface-variant">
              <span className="text-on-surface font-bold">{fromValue}</span> {CONVERSIONS[category].units.find(u => u.id === fromUnit)?.name} = <span className="text-primary font-bold">{toValue}</span> {CONVERSIONS[category].units.find(u => u.id === toUnit)?.name}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
