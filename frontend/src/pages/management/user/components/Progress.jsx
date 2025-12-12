export function Progress({ value = 0, max = 100 }) {
  return (
    <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
      <div
        className="bg-blue-600 h-full"
        style={{ width: `${(value / max) * 100}%` }}
      ></div>
    </div>
  )
}
