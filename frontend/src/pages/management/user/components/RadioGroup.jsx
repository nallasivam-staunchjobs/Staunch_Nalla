export function RadioGroup({ name, value, onChange, children }) {
  return <div className="space-y-2">{children}</div>
}

export function RadioGroupItem({ value, label, name, checked, onChange }) {
  return (
    <label className="flex items-center space-x-2">
      <input
        type="radio"
        value={value}
        name={name}
        checked={checked}
        onChange={onChange}
        className="accent-blue-600"
      />
      <span>{label}</span>
    </label>
  )
}
