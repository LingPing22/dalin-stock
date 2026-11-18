import { useEffect, useState } from 'react'
import { LayoutDashboard, Scale, Package, Wallet, Settings, WifiOff, DatabaseBackup, TriangleAlert, RefreshCw, Lock, ShieldAlert } from 'lucide-react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { useAppState, hasDemo, clearDemo, hasSaveError, subscribe } from './lib/store.js'
import { useRoute, go } from './lib/router.js'
import { useSecurity, pinEnabled, lockNow } from './lib/security.js'
import { todayKey, dayKey, dateLong, daysBetween } from './lib/format.js'
import { Button, cx } from './components/ui.jsx'
import { useDialogs } from './components/Dialogs.jsx'
import DashboardPage from './pages/DashboardPage.jsx'
import SellPage from './pages/SellPage.jsx'
import LotsPage from './pages/LotsPage.jsx'
import ExpensesPage from './pages/ExpensesPage.jsx'
import SettingsPage from './pages/SettingsPage.jsx'

const TABS = [
  { page: 'dashboard', label: 'ພາບລວມ', icon: LayoutDashboard },
  { page: 'sell', label: 'ຂາຍ', icon: Scale },
  { page: 'lots', label: 'ລັອດສິນຄ້າ', icon: Package },
  { page: 'expenses', label: 'ຄ່າໃຊ້ຈ່າຍ', icon: Wallet },
  { page: 'settings', label: 'ຕັ້ງຄ່າ', icon: Settings },
]

const TITLES = {
  dashboard: 'ພາບລວມ ແລະ ຄວາມຄຸ້ມທຶນ',
  sell: 'ບັນທຶກການຂາຍດ່ວນ',
  lots: 'ລັອດສິນຄ້າ (ຮັບຂອງເຂົ້າ)',
  expenses: 'ຄ່າໃຊ້ຈ່າຍຍ່ອຍ',
  settings: 'ຕັ້ງຄ່າ ແລະ ສຳຮອງຂໍ້ມູນ',
}

export default function App() {
  const state = useAppState()
  const route = useRoute()
  const online = useOnline()
  const sec = useSecurity()
  const staff = sec.role === 'staff'
  const locking = pinEnabled(sec)
  // staff can only use the sale screen
  const page = staff ? 'sell' : route.page
  const params = route.params
  const tabs = staff ? TABS.filter((t) => t.page === 'sell') : TABS

  const Page = { dashboard: DashboardPage, sell: SellPage, lots: LotsPage, expenses: ExpensesPage, settings: SettingsPage }[page]

  return (
    <div className="min-h-dvh pb-28">
      <header className="bg-brand text-white">
        <div className="max-w-6xl mx-auto px-4 pt-[max(0.5rem,env(safe-area-inset-top))] pb-2 md:py-2.5 flex items-center gap-3">
          <div className="flex-1 min-w-0 md:flex md:items-baseline md:gap-4">
            <h1 className="text-[1.25rem] md:text-[1.4rem] font-bold leading-tight truncate md:order-2">{TITLES[page]}</h1>
            <div className="text-[0.85rem] md:text-base text-white/75 truncate md:order-1 md:font-semibold md:text-white">{state.settings.shopName}</div>
          </div>
          {!online && (
            <span className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-sm font-semibold" title="ບໍ່ມີເນັດ — ຂໍ້ມູນຍັງບັນທຶກໃນເຄື່ອງ">
              <WifiOff size={18} /> ອອບລາຍ
            </span>
          )}
          <span className="hidden md:block text-white/80 text-right whitespace-nowrap">{dateLong(todayKey())}</span>
          {locking && (
            <>
              <span className="rounded-full bg-white/15 px-3 py-1 text-sm font-semibold whitespace-nowrap">{staff ? 'ພະນັກງານ' : 'ເຈົ້າຂອງ'}</span>
              <button
                type="button"
                onClick={lockNow}
                aria-label="ລັອກແອັບດຽວນີ້"
                title="ລັອກແອັບດຽວນີ້"
                className="w-12 h-12 -mr-2 rounded-xl flex items-center justify-center active:bg-white/15"
              >
                <Lock size={24} />
              </button>
            </>
          )}
        </div>
      </header>

      <Banners slim={page === 'sell'} staff={staff} locking={locking} />

      <main className={cx('max-w-6xl mx-auto px-4', page === 'sell' ? 'pt-3' : 'pt-5')}>
        <Page params={params} />
      </main>

      <nav className="fixed bottom-0 inset-x-0 z-30 bg-card border-t border-line safe-bottom" aria-label="ເມນູຫຼັກ">
        <div className={cx('max-w-3xl mx-auto grid', staff ? 'grid-cols-2' : 'grid-cols-5')}>
          {tabs.map((t) => {
            const active = t.page === page
            const Icon = t.icon
            return (
              <button
                key={t.page}
                type="button"
                onClick={() => go(t.page)}
                aria-current={active ? 'page' : undefined}
                className={cx(
                  'relative flex flex-col items-center justify-center gap-0.5 min-h-[4.5rem] pt-1 font-semibold',
                  active ? 'text-brand' : 'text-ink-faint active:bg-line-soft',
                )}
              >
                {active && <span className="absolute top-0 inset-x-4 h-1 rounded-b bg-brand" aria-hidden />}
                <Icon size={t.page === 'sell' ? 30 : 26} strokeWidth={active ? 2.4 : 2} />
                <span className="text-[0.85rem] leading-tight">{t.label}</span>
              </button>
            )
          })}
          {staff && (
            <button
              type="button"
              onClick={lockNow}
              className="flex flex-col items-center justify-center gap-0.5 min-h-[4.5rem] pt-1 font-semibold text-ink-faint active:bg-line-soft"
            >
              <Lock size={26} />
              <span className="text-[0.85rem] leading-tight">ລັອກ / ປ່ຽນຄົນ</span>
            </button>
          )}
        </div>
      </nav>
    </div>
  )
}

function Banners({ slim, staff, locking }) {
  const state = useAppState()
  const { confirm, toast } = useDialogs()
  const [saveErr, setSaveErr] = useState(hasSaveError())
  useEffect(() => subscribe(() => setSaveErr(hasSaveError())), [])

  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisterError() {
      /* no service worker (e.g. preview without HTTPS) — app still works */
    },
  })

  const demo = hasDemo()
  const hasRealData = state.batches.some((b) => !b.demo)
  const last = state.meta.lastBackupAt
  const daysSinceBackup = last ? daysBetween(dayKey(new Date(last)), todayKey()) : null
  const needPin = !staff && !demo && hasRealData && !locking
  const needBackup = !staff && !demo && hasRealData && (daysSinceBackup == null ? daysBetween(dayKey(new Date(state.meta.createdAt)), todayKey()) >= 3 : daysSinceBackup >= 7)

  const doClearDemo = async () => {
    const ok = await confirm({
      title: 'ລ້າງຂໍ້ມູນຕົວຢ່າງ?',
      message: 'ລັອດ, ການຂາຍ ແລະ ຄ່າໃຊ້ຈ່າຍທີ່ເປັນຕົວຢ່າງຈະຖືກລຶບ. ຂໍ້ມູນທີ່ທ່ານບັນທຶກເອງຈະຍັງຢູ່.',
      confirmText: 'ລ້າງ ແລະ ເລີ່ມໃຊ້ຈິງ',
    })
    if (ok) {
      clearDemo()
      go('lots')
      toast('ພ້ອມໃຊ້ຈິງແລ້ວ — ກົດ “ຮັບຂອງເຂົ້າ” ເພື່ອບັນທຶກລັອດທຳອິດ')
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4">
      {import.meta.env.VITE_PREVIEW && !slim && (
        <Bar tone="info" text="ໜ້າທົດລອງ: ປຸ່ມສຳຮອງ/ດາວໂຫຼດໄຟລ໌ ແລະ ການຕິດຕັ້ງແອັບ ໃຊ້ໄດ້ໃນເວີຊັນ GitHub Pages" />
      )}
      {needRefresh && (
        <Bar tone="info" icon={<RefreshCw size={24} />} text="ມີເວີຊັນໃໝ່ຂອງແອັບ">
          <Button size="sm" onClick={() => updateServiceWorker(true)}>
            ອັບເດດດຽວນີ້
          </Button>
        </Bar>
      )}
      {saveErr && (
        <Bar tone="danger" icon={<TriangleAlert size={24} />} text="ບັນທຶກລົງເຄື່ອງບໍ່ສຳເລັດ — ພື້ນທີ່ອາດເຕັມ. ກະລຸນາສຳຮອງຂໍ້ມູນດ່ວນ">
          <Button size="sm" variant="danger" onClick={() => go('settings')}>
            ສຳຮອງ
          </Button>
        </Bar>
      )}
      {demo &&
        !staff &&
        (slim ? (
          <div className="mt-2 flex items-center gap-3 rounded-xl bg-waste-soft px-3 py-1.5">
            <span className="flex-1 text-[0.95rem] font-semibold truncate">ກຳລັງໃຊ້ຂໍ້ມູນຕົວຢ່າງ</span>
            <button type="button" className="text-loss font-bold min-h-[2.5rem] px-2 whitespace-nowrap" onClick={doClearDemo}>
              ລ້າງ ເພື່ອໃຊ້ຈິງ
            </button>
          </div>
        ) : (
          <Bar tone="demo" text="ນີ້ແມ່ນຂໍ້ມູນຕົວຢ່າງ — ລອງກົດຂາຍ, ຮັບຂອງ ແລະ ເບິ່ງພາບລວມໄດ້ເລີຍ">
            <Button size="sm" variant="danger" onClick={doClearDemo}>
              ລ້າງຂໍ້ມູນຕົວຢ່າງ ເພື່ອເລີ່ມໃຊ້ຈິງ
            </Button>
          </Bar>
        ))}
      {needPin && !slim && (
        <Bar tone="danger" icon={<ShieldAlert size={24} />} text="ຍັງບໍ່ໄດ້ຕັ້ງ PIN — ໃຜຈັບ iPad ກໍ່ເຫັນຕົ້ນທຶນ ແລະ ກຳໄລໄດ້">
          <Button size="sm" onClick={() => go('settings')}>
            ຕັ້ງ PIN
          </Button>
        </Bar>
      )}
      {needBackup && !slim && (
        <Bar
          tone="warn"
          icon={<DatabaseBackup size={24} />}
          text={daysSinceBackup == null ? 'ຍັງບໍ່ເຄີຍສຳຮອງຂໍ້ມູນ' : `ບໍ່ໄດ້ສຳຮອງຂໍ້ມູນ ${daysSinceBackup} ມື້ແລ້ວ`}
        >
          <Button size="sm" onClick={() => go('settings')}>
            ສຳຮອງດຽວນີ້
          </Button>
        </Bar>
      )}
    </div>
  )
}

function Bar({ tone, icon, text, children }) {
  const cls = {
    info: 'bg-brand-soft border-brand',
    danger: 'bg-loss-soft border-loss',
    demo: 'bg-waste-soft border-waste-bar',
    warn: 'bg-waste-soft border-waste-bar',
  }[tone]
  return (
    <div className={cx('mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl border-l-[6px] px-4 py-2.5', cls)}>
      {icon}
      <span className="flex-1 min-w-[12rem] font-semibold leading-snug">{text}</span>
      {children}
    </div>
  )
}

function useOnline() {
  const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine)
  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])
  return online
}
