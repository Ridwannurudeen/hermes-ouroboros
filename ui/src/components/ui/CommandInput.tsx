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
        {/* Glow backdrop — no filter:blur, just a gradient with opacity */}
        <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500/20 via-violet-500/20 to-cyan-500/20 rounded-[22px] opacity-0 group-focus-within:opacity-100 transition-opacity duration-700" />

        <div className="relative rounded-[20px] border border-white/[0.06] bg-white/[0.02] group-focus-within:border-cyan-500/25 group-focus-within:bg-white/[0.03] transition-all duration-500 shadow-[0_2px_20px_rgba(0,0,0,0.2)]">
          <div className="flex items-start gap-3.5 p-5">
            <Search size={17} className="text-white/15 mt-1.5 flex-shrink-0 group-focus-within:text-cyan-400/50 transition-colors duration-500" />
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
              className="flex-1 bg-transparent text-white/90 placeholder-white/15 outline-none resize-none text-[15px] leading-relaxed"
            />
          </div>
          <div className="px-5 pb-3 flex items-center justify-between">
            <span className="text-[10px] text-white/10 font-mono">Ctrl+Enter to submit</span>
            <div className="flex items-center gap-1.5">
              <div className="w-1 h-1 rounded-full bg-cyan-500/30" />
              <span className="text-[9px] text-white/10 font-mono">AI Council</span>
            </div>
          </div>
        </div>
      </div>
    )
  },
)

CommandInput.displayName = 'CommandInput'
export default CommandInput
