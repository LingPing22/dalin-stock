import { useEffect, useState } from 'react'
import { Delete, Lock } from 'lucide-react'
import { useAppState } from '../lib/store.js'
import { tryUnlock, lockoutRemaining, MAX_FAILS } from '../lib/security.js'
import { cx } from './ui.jsx'

export default function LockScreen() {
  const state = useAppState()
  const [pin, setPin] = useState('')
  const [msg, setMsg] = useState('')
  const [shake, setShake] = useState(false)
  const [checking, setChecking] = useState(false)
  const [wait, setWait] = useState(lockoutRemaining())
  const [help, setHelp] = useState(false)

  // countdown while locked out
  useEffect(() => {
    if (wait <= 0) return
    const t = setInterval(() => {
      const w = lockoutRemaining()
      setWait(w)
      if (w <= 0) setMsg('')
    }, 500)
    return () => clearInterval(t)
  }, [wait > 0]) // eslint-disable-line react-hooks/exhaustive-deps

  const submit = (value = pin) => {
    if (checking || wait > 0 || value.length < 4) return
    setChecking(true)
    // let the screen paint "checking" before the (≈0.1 s) hash runs
    setTimeout(() => {
      const r = tryUnlock(value)
      setChecking(false)
      if (r.ok) return
      setPin('')
      setShake(true)
      setTimeout(() => setShake(false), 450)
      if (r.lockedMs) {
        setWait(r.lockedMs)
        setMsg(`ໃສ່ PIN ຜິດ ${MAX_FAILS} ເທື່ອ — ລັອກໄວ້ຊົ່ວຄາວ`)
      } else {
        setMsg(`PIN ບໍ່ຖືກ — ລອງໄດ້ອີກ ${r.left} ເທື່ອ`)
      }
    }, 30)
  }

  const press = (k) => {
    if (checking || wait > 0) return
    if (k === 'back') return setPin((p) => p.slice(0, -1))
    if (k === 'ok') return submit()
    if (pin.length >= 6) return
    const next = pin + k
    setPin(next)
    if (next.length === 6) submit(next)
  }

  // physical keyboard
  useEffect(() => {
    const onKey = (e) => {
      if (/^\d$/.test(e.key)) press(e.key)
      else if (e.key === 'Backspace') press('back')
      else if (e.key === 'Enter') press('ok')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const secs = Math.ceil(wait / 1000)
  const disabled = checking || wait > 0
  const slots = Math.max(4, pin.length)

  return (
    <div className="min-h-dvh bg-brand text-white flex flex-col items-center justify-center px-6 py-[max(1.5rem,env(safe-area-inset-top))]">
      <div className="w-full max-w-sm flex flex-col items-center">
        <div className="w-16 h-16 rounded-2xl bg-white/12 flex items-center justify-center mb-3" aria-hidden>
          <Lock size={32} />
        </div>
        <p className="text-white/75 text-lg">{state?.settings?.shopName || 'Dalin Stock'}</p>
        <h1 className="text-[1.6rem] font-bold mb-5">ໃສ່ PIN ເພື່ອເຂົ້າໃຊ້</h1>

        <div className={cx('flex gap-3 h-6 mb-3', shake && 'anim-shake')} aria-label={`ໃສ່ແລ້ວ ${pin.length} ຕົວ`} role="status">
          {Array.from({ length: slots }, (_, i) => (
            <span key={i} className={cx('w-5 h-5 rounded-full border-2 border-white', i < pin.length ? 'bg-white' : 'bg-transparent')} />
          ))}
        </div>

        <p className={cx('min-h-[3.2rem] text-center font-semibold leading-snug', wait > 0 ? 'text-[#ffd58a]' : 'text-[#ffc2bb]')} aria-live="polite">
          {checking ? <span className="text-white/80">ກຳລັງກວດ…</span> : msg}
          {wait > 0 && (
            <span className="block num text-2xl">
              ລໍຖ້າ {Math.floor(secs / 60)}:{String(secs % 60).padStart(2, '0')}
            </span>
          )}
        </p>

        <div className="grid grid-cols-3 gap-3 w-full mt-2">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'back', '0', 'ok'].map((k) => (
            <button
              key={k}
              type="button"
              disabled={disabled || (k === 'ok' && pin.length < 4)}
              onClick={() => press(k)}
              aria-label={k === 'back' ? 'ລຶບ 1 ຕົວ' : k === 'ok' ? 'ເຂົ້າ' : k}
              className={cx(
                'num min-h-[4.4rem] rounded-2xl text-[1.9rem] font-semibold select-none transition-colors disabled:opacity-40',
                k === 'ok' ? 'bg-white text-brand text-xl active:bg-white/80' : 'bg-white/10 active:bg-white/25',
              )}
            >
              {k === 'back' ? <Delete className="mx-auto" size={30} /> : k === 'ok' ? 'ເຂົ້າ' : k}
            </button>
          ))}
        </div>

        <button type="button" className="mt-6 min-h-[2.75rem] text-white/80 underline underline-offset-4" onClick={() => setHelp((h) => !h)}>
          ລືມ PIN?
        </button>
        {help && (
          <div className="mt-2 rounded-2xl bg-white/10 px-4 py-3 text-[0.98rem] leading-relaxed">
            <p className="mb-2">ພະນັກງານລືມ PIN: ໃຫ້ເຈົ້າຂອງເຂົ້າ ຕັ້ງຄ່າ → ລັອກແອັບ ແລ້ວຕັ້ງ PIN ພະນັກງານໃໝ່.</p>
            <p>
              ເຈົ້າຂອງລືມ PIN: ບໍ່ມີທາງເປີດຄືນໂດຍບໍ່ມີ PIN. ໃຫ້ລຶບແອັບອອກຈາກໜ້າຈໍ (ຂໍ້ມູນໃນເຄື່ອງຈະຖືກລຶບ), ເພີ່ມແອັບໃໝ່ ແລ້ວ{' '}
              <b>ກູ້ຄືນຈາກໄຟລ໌ສຳຮອງ</b> — ໄຟລ໌ສຳຮອງບໍ່ມີ PIN ຕິດໄປ ຈຶ່ງຕັ້ງ PIN ໃໝ່ໄດ້.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
