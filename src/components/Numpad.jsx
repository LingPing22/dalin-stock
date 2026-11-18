import { Delete } from 'lucide-react'
import { cx } from './ui.jsx'

/**
 * Big on-screen keypad with a 4th column of quick amounts.
 * `extraKey` is '.' for weights, '000' for money, or null (→ "ລ້າງ") for whole pieces.
 * `side` = [{ label, value }] — tapping one replaces the current entry.
 */
export function Numpad({ value, onChange, extraKey = '.', side = [], maxLen = 10 }) {
  const press = (k) => {
    if (k === 'back') return onChange(value.slice(0, -1))
    if (k === 'clear') return onChange('')
    if (k === '.') {
      if (value.includes('.')) return
      return onChange(value ? value + '.' : '0.')
    }
    let next = value + k
    if (next.replace('.', '').length > maxLen) return
    const dot = next.indexOf('.')
    if (dot >= 0 && next.length - dot - 1 > 3) return // max 3 decimals (1 g)
    if (/^0\d/.test(next)) next = next.replace(/^0+(?=\d)/, '')
    onChange(next)
  }
  const keys = ['7', '8', '9', '4', '5', '6', '1', '2', '3', extraKey || 'clear', '0', 'back']
  const keyH = 'min-h-[clamp(3.1rem,6.6dvh,3.9rem)]'
  return (
    <div className="grid grid-cols-[3fr_1fr] gap-2">
      <div className="grid grid-cols-3 gap-2">
        {keys.map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => press(k)}
            aria-label={k === 'back' ? 'ລຶບ 1 ຕົວ' : k === 'clear' ? 'ລ້າງ' : k}
            className={cx(
              'num rounded-xl text-[1.75rem] font-semibold border-2 select-none',
              keyH,
              k === 'back' || k === 'clear' ? 'bg-line-soft border-line text-ink-soft active:bg-line' : 'bg-card border-line active:bg-brand-soft',
            )}
          >
            {k === 'back' ? <Delete className="mx-auto" size={30} /> : k === 'clear' ? <span className="text-lg">ລ້າງ</span> : k}
          </button>
        ))}
      </div>
      <div className="grid grid-rows-4 gap-2">
        {side.map((s) => (
          <button
            key={s.label}
            type="button"
            onClick={() => onChange(String(s.value))}
            className={cx('num rounded-xl bg-brand-soft text-brand font-bold text-[1.15rem] leading-tight px-1 active:bg-[#d2dfee]', keyH)}
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>
  )
}
