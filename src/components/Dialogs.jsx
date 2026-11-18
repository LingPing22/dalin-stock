import { createContext, useCallback, useContext, useRef, useState } from 'react'
import { CircleCheck, TriangleAlert, PartyPopper } from 'lucide-react'
import { Button, Sheet, TextInput, cx } from './ui.jsx'

const Ctx = createContext(null)

export function useDialogs() {
  return useContext(Ctx)
}

/**
 * confirm({ title, message, confirmText, danger, requireText, actions })
 *   → resolves true / false, or the chosen action's `value` when `actions` is given.
 * toast(text, { tone: 'ok'|'warn'|'party', action: { label, onClick }, ms })
 */
export function DialogProvider({ children }) {
  const [dlg, setDlg] = useState(null)
  const [typed, setTyped] = useState('')
  const [toasts, setToasts] = useState([])
  const resolver = useRef(null)

  const confirm = useCallback((opts) => {
    setTyped('')
    setDlg(opts)
    return new Promise((res) => {
      resolver.current = res
    })
  }, [])

  const close = (val) => {
    resolver.current?.(val)
    resolver.current = null
    setDlg(null)
  }

  const toast = useCallback((text, opts = {}) => {
    const id = Math.random().toString(36).slice(2)
    setToasts([{ id, text, ...opts }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), opts.ms || 4500)
  }, [])

  const dismiss = (id) => setToasts((t) => t.filter((x) => x.id !== id))
  const textOk = !dlg?.requireText || typed.trim() === dlg.requireText

  return (
    <Ctx.Provider value={{ confirm, toast }}>
      {children}

      <Sheet
        open={!!dlg}
        onClose={() => close(dlg?.actions ? null : false)}
        title={dlg?.title || ''}
        footer={
          dlg &&
          (dlg.actions ? (
            <div className="flex flex-col gap-2">
              {dlg.actions.map((a) => (
                <Button key={a.label} variant={a.variant || 'secondary'} onClick={() => close(a.value)} className="w-full">
                  {a.label}
                </Button>
              ))}
              <Button variant="ghost" onClick={() => close(null)} className="w-full">
                ຍົກເລີກ
              </Button>
            </div>
          ) : (
            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => close(false)} className="flex-1">
                {dlg.cancelText || 'ຍົກເລີກ'}
              </Button>
              <Button variant={dlg.danger ? 'danger' : 'primary'} disabled={!textOk} onClick={() => close(true)} className="flex-1">
                {dlg.confirmText || 'ຕົກລົງ'}
              </Button>
            </div>
          ))
        }
      >
        {dlg && (
          <div className="text-lg leading-relaxed">
            {typeof dlg.message === 'string' ? <p>{dlg.message}</p> : dlg.message}
            {dlg.requireText && (
              <div className="mt-4">
                <p className="text-base text-ink-soft mb-2">
                  ພິມຄຳວ່າ <b className="text-loss">{dlg.requireText}</b> ເພື່ອຢືນຢັນ
                </p>
                <TextInput value={typed} onChange={(e) => setTyped(e.target.value)} autoFocus />
              </div>
            )}
          </div>
        )}
      </Sheet>

      <div className="fixed inset-x-0 top-[max(0.5rem,env(safe-area-inset-top))] z-50 flex flex-col items-center gap-2 px-3 pointer-events-none" aria-live="polite">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cx(
              'anim-pop pointer-events-auto flex items-center gap-3 max-w-xl w-full rounded-2xl px-4 py-3 shadow-xl text-white',
              t.tone === 'warn' ? 'bg-[#7a3a12]' : t.tone === 'party' ? 'bg-gain' : 'bg-ink',
            )}
          >
            {t.tone === 'warn' ? <TriangleAlert size={26} /> : t.tone === 'party' ? <PartyPopper size={26} /> : <CircleCheck size={26} />}
            <span className="flex-1 text-lg font-semibold leading-snug">{t.text}</span>
            {t.action && (
              <button
                type="button"
                className="min-h-[2.75rem] px-4 rounded-xl bg-white/15 font-semibold active:bg-white/25"
                onClick={() => {
                  t.action.onClick()
                  dismiss(t.id)
                }}
              >
                {t.action.label}
              </button>
            )}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  )
}
