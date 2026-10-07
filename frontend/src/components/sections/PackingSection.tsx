import type { TouristAttraction } from '../../types'

interface Props {
  packingList?: string[]
  attractions?: (string | TouristAttraction)[]
}

export default function PackingSection({ packingList = [], attractions = [] }: Props) {
  const items = packingList || []
  const listAttractions = attractions || []

  if (items.length === 0 && listAttractions.length === 0) {
    return null
  }

  return (
    <div className="card h-full flex flex-col overflow-y-auto min-w-0 break-words">
      {items.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xl font-bold mb-3">🎒 Packing List</h2>
          <div className="grid grid-cols-1 gap-1">
            {items.map((item, i) => (
              <label key={i} className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer group">
                <input type="checkbox" className="rounded border-gray-600 bg-gray-800 text-blue-500" />
                <span className="group-hover:text-gray-300 transition">{item}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {listAttractions.length > 0 && (
        <div>
          <h2 className="text-xl font-bold mb-3">📍 Tourist Attractions</h2>
          <div className="flex flex-wrap gap-2">
            {listAttractions.map((a, i) => {
              const name = typeof a === 'string' ? a : a.name
              const link = typeof a === 'string' ? null : a.maps_link
              
              if (link) {
                return (
                  <a key={i} href={link} target="_blank" rel="noopener noreferrer" className="badge bg-teal-900 text-teal-300 text-xs hover:bg-teal-800 transition">
                    📍 {name}
                  </a>
                )
              }
              return (
                <span key={i} className="badge bg-teal-900 text-teal-300 text-xs">📍 {name}</span>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
