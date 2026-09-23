interface CurrencyInputProps {
  label: string
  value: number
  onChange: (value: number) => void
  currency?: string
  required?: boolean
}

export default function CurrencyInput({ label, value, onChange, currency = 'MYR', required }: CurrencyInputProps) {
  return (
    <div>
      <label className="label">{label}</label>
      <div className="relative">
        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-400">
          {currency === 'MYR' ? 'RM' : currency}
        </span>
        <input
          type="number"
          step="0.01"
          min="0"
          required={required}
          className="input pl-12"
          value={Number.isNaN(value) ? '' : value}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        />
      </div>
    </div>
  )
}
