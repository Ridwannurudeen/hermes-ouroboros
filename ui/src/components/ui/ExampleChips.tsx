interface ExampleChipsProps {
  examples: string[]
  onSelect: (example: string) => void
}

export default function ExampleChips({ examples, onSelect }: ExampleChipsProps) {
  if (!examples.length) return null
  return (
    <div className="flex flex-wrap gap-2 mt-3">
      {examples.map((ex) => (
        <button
          key={ex}
          onClick={() => onSelect(ex)}
          className="px-3 py-1.5 text-xs text-white/50 bg-white/5 border border-white/10 rounded-full hover:bg-white/10 hover:text-white/70 transition-all duration-200"
        >
          {ex.length > 50 ? ex.slice(0, 50) + '...' : ex}
        </button>
      ))}
    </div>
  )
}
