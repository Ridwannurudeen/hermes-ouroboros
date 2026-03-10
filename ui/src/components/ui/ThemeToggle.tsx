import { useState } from 'react'
import { Sun, Moon } from 'lucide-react'

export default function ThemeToggle() {
  const [dark, setDark] = useState(true)

  const toggle = () => {
    setDark(!dark)
    document.documentElement.classList.toggle('dark')
  }

  return (
    <button
      onClick={toggle}
      className="p-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
      title="Toggle theme"
    >
      {dark ? <Sun size={16} className="text-white/60" /> : <Moon size={16} className="text-white/60" />}
    </button>
  )
}
