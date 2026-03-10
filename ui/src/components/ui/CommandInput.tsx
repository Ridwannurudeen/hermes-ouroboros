import { forwardRef } from 'react'
import { Search } from 'lucide-react'

interface CommandInputProps {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  placeholder?: string
  disabled?: boolean
}

const CommandInput = forwardRef<HTMLTextAreaElement, CommandInputProps>(
  ({ value, onChange, onSubmit, placeholder = 'Ask the council anything...', disabled }, ref) => {
    return (
      <div className="relative group">
        <div className="absolute inset-0 bg-gradient-to-r from-brand-500/20 via-violet-500/20 to-brand-500/20 rounded-2xl blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />
        <div className="relative bg-white/5 border border-white/10 rounded-2xl group-focus-within:border-brand-500/50 transition-all duration-300">
          <div className="flex items-start gap-3 p-4">
            <Search size={18} className="text-white/30 mt-1 flex-shrink-0" />
            <textarea
              ref={ref}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={(e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                  e.preventDefault()
                  onSubmit()
                }
              }}
              placeholder={placeholder}
              disabled={disabled}
              rows={2}
              className="flex-1 bg-transparent text-white placeholder-white/30 outline-none resize-none text-[15px] leading-relaxed"
            />
          </div>
        </div>
      </div>
    )
  },
)

CommandInput.displayName = 'CommandInput'
export default CommandInput
