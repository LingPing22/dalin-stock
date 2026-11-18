import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { money, parseNum } from '../lib/format.js'

const cx = (...a) => a.filter(Boolean).join(' ')
export { cx }

const VARIANTS = {
  primary: 'bg-brand text-white active:bg-brand-dark disabled:bg-ink-faint',
  sale: 'bg-brand text-white active:bg-brand-dark disabled:bg-ink-faint/60',
  waste: 'bg-waste-bar text-ink active:bg-[#c98420] disabled:bg-ink-faint/40',
  danger: 'bg-loss text-white active:bg-[#a52a22]',
  secondary: 'bg-card text-ink border-2 border-line active:bg-line-soft',
  soft: 'bg-brand-soft text-brand active:bg-[#d2dfee]',
  ghost: 'bg-transparent text-ink-soft active:bg-line-soft',
}
const SIZES = {
  xl: 'min-h-[4.25rem] px-6 text-[1.35rem] rounded-2xl',
  lg: 'min-h-[3.5rem] px-5 text-lg rounded-xl',
  md: 'min-h-[3rem] px-4 text-base rounded-xl',
  sm: 'min-h-[2.5rem] px-3 text-[0.95rem] rounded-lg',
}

export function Button({ variant = 'primary', size = 'lg', className, children, ...props }) {
  return (
    <button
      type="button"
      className={cx(
        'inline-flex items-center justify-center gap-2 font-semibold select-none transition-colors disabled:cursor-not-allowed',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}

export function IconButton({ label, className, children, ...props }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cx('inline-flex items-center justify-center rounded-xl w-12 h-12 text-ink-soft active:bg-line-soft', className)}
      {...props}
    >
      {children}
    </button>
  )
}

/** Modal sheet: slides from the bottom on phones, centred on iPad. */
export function Sheet({ open, onClose, title, children, footer, wide }) {
  const ref = useRef(null)
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose?.()
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    ref.current?.focus()
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-40 flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-ink/45" onClick={onClose} />
      <div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cx(
          'anim-pop relative bg-paper w-full max-h-[94dvh] flex flex-col rounded-t-3xl md:rounded-3xl shadow-2xl outline-none',
          wide ? 'md:max-w-3xl' : 'md:max-w-xl',
        )}
      >
        <div className="flex items-center gap-3 pl-5 pr-2 pt-3 pb-2 border-b border-line">
          <h2 className="flex-1 text-xl font-bold leading-snug">{title}</h2>
          <IconButton label="ປິດ" onClick={onClose}>
            <X size={28} />
          </IconButton>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="px-5 pt-3 pb-4 border-t border-line safe-bottom bg-card md:rounded-b-3xl">{footer}</div>}
      </div>
    </div>
  )
}

export function Field({ label, hint, children, className }) {
  return (
    <label className={cx('block', className)}>
      <span className="block text-[0.95rem] font-semibold text-ink-soft mb-1">{label}</span>
      {children}
      {hint && <span className="block text-sm text-ink-faint mt-1">{hint}</span>}
    </label>
  )
}

const inputCls =
  'w-full min-h-[3.25rem] rounded-xl border-2 border-line bg-card px-4 text-lg outline-none focus:border-brand placeholder:text-ink-faint'

export function TextInput({ className, ...props }) {
  return <input type="text" className={cx(inputCls, className)} {...props} />
}

export function DateInput({ className, ...props }) {
  return <input type="date" className={cx(inputCls, 'num', className)} {...props} />
}

export function Select({ className, children, ...props }) {
  return (
    <select className={cx(inputCls, 'pr-3', className)} {...props}>
      {children}
    </select>
  )
}

/** Money input that shows thousand separators while typing. value = number */
export function MoneyInput({ value, onChange, suffix = 'ກີບ', className, ...props }) {
  const text = value ? money(value) : ''
  return (
    <div className={cx('relative', className)}>
      <input
        type="text"
        inputMode="numeric"
        autoComplete="off"
        className={cx(inputCls, 'num pr-16 text-xl font-semibold')}
        value={text}
        onChange={(e) => onChange(Math.round(parseNum(e.target.value)))}
        {...props}
      />
      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-ink-faint pointer-events-none">{suffix}</span>
    </div>
  )
}

/** Quantity input; keeps the raw text so "2." can be typed. */
export function QtyInput({ value, onChange, suffix, decimals = true, className, ...props }) {
  const [text, setText] = useState(value ? String(value) : '')
  useEffect(() => {
    if (parseNum(text) !== value) setText(value ? String(value) : '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])
  return (
    <div className={cx('relative', className)}>
      <input
        type="text"
        inputMode={decimals ? 'decimal' : 'numeric'}
        autoComplete="off"
        className={cx(inputCls, 'num pr-16 text-xl font-semibold')}
        value={text}
        onChange={(e) => {
          let t = e.target.value.replace(/[^\d.]/g, '')
          if (!decimals) t = t.replace(/\./g, '')
          const parts = t.split('.')
          if (parts.length > 2) t = parts[0] + '.' + parts.slice(1).join('')
          setText(t)
          onChange(parseNum(t))
        }}
        {...props}
      />
      {suffix && <span className="absolute right-4 top-1/2 -translate-y-1/2 text-ink-faint pointer-events-none">{suffix}</span>}
    </div>
  )
}

/** Row of big toggle buttons. */
export function Segmented({ options, value, onChange, className, size = 'md' }) {
  return (
    <div className={cx('flex flex-wrap gap-2', className)} role="radiogroup">
      {options.map((o) => {
        const active = o.value === value
        return (
          <button
            key={String(o.value)}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={cx(
              'rounded-xl border-2 font-semibold transition-colors',
              size === 'lg' ? 'min-h-[3.5rem] px-5 text-lg' : 'min-h-[3rem] px-4',
              active ? o.activeClass || 'border-brand bg-brand text-white' : 'border-line bg-card text-ink active:bg-line-soft',
            )}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

export function Section({ title, action, children, className }) {
  return (
    <section className={cx('mb-8', className)}>
      {(title || action) && (
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 mb-3">
          {title && <h2 className="text-[1.3rem] font-bold leading-tight">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  )
}

/** "label ........ value" line used in the summaries. */
export function Line({ label, value, sign, strong, tone, sub }) {
  const toneCls = tone === 'gain' ? 'text-gain' : tone === 'loss' ? 'text-loss' : tone === 'waste' ? 'text-waste' : ''
  return (
    <div className={cx('flex items-baseline gap-3 py-2', strong && 'pt-3')}>
      <span className={cx('flex-1', strong ? 'text-lg font-bold' : 'text-ink-soft')}>
        {label}
        {sub && <span className="block text-sm text-ink-faint">{sub}</span>}
      </span>
      <span className={cx('num whitespace-nowrap', strong ? 'text-2xl font-bold' : 'text-lg font-semibold', toneCls)}>
        {sign && <span className="mr-1 text-ink-faint">{sign}</span>}
        {value}
      </span>
    </div>
  )
}

export function Empty({ icon, title, children }) {
  return (
    <div className="rounded-2xl border-2 border-dashed border-line px-6 py-10 text-center">
      {icon && <div className="flex justify-center text-ink-faint mb-3">{icon}</div>}
      <p className="text-lg font-semibold mb-2">{title}</p>
      {children}
    </div>
  )
}
