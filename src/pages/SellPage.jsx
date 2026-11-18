import { useEffect, useMemo, useState } from 'react'
import { Pencil, Trash2, PackagePlus } from 'lucide-react'
import { useAppState, addMove, deleteMove, restoreMove, getState } from '../lib/store.js'
import { useRole, pinEnabled } from '../lib/security.js'
import { lotStats, saleAmount, daySummary } from '../lib/calc.js'
import { unitOf, LOSS_REASONS, lossLabel } from '../lib/units.js'
import { money, kip, qtyText, parseNum, r3, timeText, todayKey } from '../lib/format.js'
import { go } from '../lib/router.js'
import { Button, IconButton, Segmented, Sheet, MoneyInput, Empty, cx } from '../components/ui.jsx'
import { Numpad } from '../components/Numpad.jsx'
import { useDialogs } from '../components/Dialogs.jsx'

const LAST_LOT_KEY = 'dalin-stock:last-lot'

export default function SellPage({ params }) {
  const state = useAppState()
  const role = useRole()
  const staff = role === 'staff'
  const { toast, confirm } = useDialogs()
  const openLots = useMemo(
    () => state.batches.filter((b) => !b.closed).sort((a, b) => a.receivedAt.localeCompare(b.receivedAt) || a.createdAt - b.createdAt),
    [state.batches],
  )
  const statsById = useMemo(
    () => new Map(openLots.map((b) => [b.id, lotStats(b, state.moves, state.expenses)])),
    [openLots, state.moves, state.expenses],
  )

  const [lotId, setLotId] = useState(() => params.lot || safeGet(LAST_LOT_KEY))
  const [mode, setMode] = useState('sale')
  const [entryMode, setEntryMode] = useState('qty')
  const [entry, setEntry] = useState('')
  const [priceOverride, setPriceOverride] = useState(null)
  const [reason, setReason] = useState('spoil')
  const [priceSheet, setPriceSheet] = useState(false)
  const [priceDraft, setPriceDraft] = useState(0)

  useEffect(() => {
    if (params.lot) setLotId(params.lot)
  }, [params.lot])

  const lot = openLots.find((b) => b.id === lotId) || openLots[0]
  const s = lot ? statsById.get(lot.id) : null
  const u = lot ? unitOf(lot.unit) : null
  const rounding = state.settings.rounding || 0

  // reset entry when switching lot / mode
  useEffect(() => {
    setEntry('')
    setPriceOverride(null)
    if (u && !u.decimals) setEntryMode('qty')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lot?.id, mode])

  const pick = (id) => {
    setLotId(id)
    safeSet(LAST_LOT_KEY, id)
  }

  if (!lot) {
    return (
      <Empty icon={<PackagePlus size={48} />} title="ຍັງບໍ່ມີລັອດທີ່ກຳລັງຂາຍ">
        {staff ? (
          <p className="text-ink-soft">ໃຫ້ເຈົ້າຂອງຮ້ານບັນທຶກການຮັບຂອງເຂົ້າກ່ອນ</p>
        ) : (
          <>
            <p className="text-ink-soft mb-5">ບັນທຶກການຮັບຂອງເຂົ້າກ່ອນ ແລ້ວຈຶ່ງມາຂາຍໄດ້</p>
            <Button onClick={() => go('lots', { new: 1 })}>
              <PackagePlus size={24} /> ຮັບຂອງເຂົ້າລັອດໃໝ່
            </Button>
          </>
        )}
      </Empty>
    )
  }

  const price = priceOverride ?? lot.sellPrice
  const isSale = mode === 'sale'
  const byMoney = isSale && entryMode === 'money' && u.decimals
  let qty
  let amount
  if (byMoney) {
    amount = Math.round(parseNum(entry))
    qty = price > 0 ? r3(amount / price) : 0
  } else {
    qty = parseNum(entry)
    amount = isSale ? saleAmount(qty, price, rounding) : 0
  }
  const lossValue = Math.round(qty * s.avg)
  const rawAmount = Math.round(qty * price)
  const rounded = isSale && !byMoney && rounding > 0 && rawAmount !== amount
  const switchEntry = (m) => {
    if (m === entryMode) return
    setEntryMode(m)
    setEntry('')
  }

  const save = async () => {
    if (!(qty > 0)) {
      toast(byMoney ? 'ໃສ່ຈຳນວນເງິນກ່ອນ' : 'ໃສ່ຈຳນວນ ຫຼື ນ້ຳໜັກກ່ອນ', { tone: 'warn' })
      return
    }
    if (qty > s.sellable + 1e-9) {
      const ok = await confirm({
        title: 'ເກີນຂອງທີ່ເຫຼືອໃນລັອດ',
        message: `ລັອດນີ້ເຫຼືອ ${qtyText(s.sellable, u.decimals)} ${u.short} ແຕ່ຈະບັນທຶກ ${qtyText(qty, u.decimals)} ${u.short}. ຖ້າຊັ່ງໄດ້ຫຼາຍກວ່າທີ່ຮັບມາແທ້ ກໍ່ບັນທຶກໄດ້ເລີຍ.`,
        confirmText: 'ບັນທຶກຢູ່',
      })
      if (!ok) return
    }
    const wasRecovered = s.recovered
    const by = pinEnabled() ? role : undefined
    const m = addMove(
      isSale
        ? { batchId: lot.id, kind: 'sale', qty, unitPrice: price, amount, by }
        : { batchId: lot.id, kind: 'loss', qty, reason, by },
    )
    const st = getState()
    const after = lotStats(st.batches.find((b) => b.id === lot.id), st.moves, st.expenses)
    const undo = { label: 'ຍົກເລີກ', onClick: () => deleteMove(m.id) }
    const outNote = after.soldOut ? ' — ລັອດນີ້ໝົດແລ້ວ' : ''
    if (isSale && !staff && !wasRecovered && after.recovered) {
      toast(`${lot.productName} ຄືນທຶນແລ້ວ! ຂາຍຕໍ່ຈາກນີ້ແມ່ນກຳໄລລ້ວນໆ${outNote}`, { tone: 'party', ms: 7000, action: undo })
    } else if (isSale) {
      toast(`ບັນທຶກການຂາຍແລ້ວ ${qtyText(qty, u.decimals)} ${u.short} = ${kip(amount)}${outNote}`, { action: undo, ms: 6000 })
    } else {
      toast(`ບັນທຶກ${lossLabel(reason)}ແລ້ວ ${qtyText(qty, u.decimals)} ${u.short}${outNote}`, { action: undo, ms: 6000 })
    }
    setEntry('')
    setPriceOverride(null)
  }

  const side = (byMoney ? [10000, 20000, 50000, 100000] : u.chips).map((c) => ({
    value: c,
    label: byMoney ? `${c / 1000} ພັນ` : qtyText(c, u.decimals),
  }))
  const extraKey = byMoney ? '000' : u.decimals ? '.' : null
  const canMoney = isSale && u.decimals

  return (
    <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-6 lg:items-start">
      {/* ───── Lots (+ today on iPad landscape) ───── */}
      <div className="min-w-0">
        <h2 className="hidden lg:block text-[1.3rem] font-bold mb-2">ເລືອກລັອດທີ່ກຳລັງຂາຍ</h2>
        <div
          className="flex lg:grid lg:grid-cols-2 gap-2.5 lg:gap-3 overflow-x-auto no-scrollbar -mx-4 px-4 lg:mx-0 lg:px-0 pb-1 mb-3 lg:mb-5"
          role="radiogroup"
          aria-label="ເລືອກລັອດທີ່ກຳລັງຂາຍ"
        >
          {openLots.map((b) => {
            const st = statsById.get(b.id)
            const bu = unitOf(b.unit)
            const active = b.id === lot.id
            return (
              <button
                key={b.id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => pick(b.id)}
                className={cx(
                  'shrink-0 w-[10.5rem] lg:w-auto text-left rounded-2xl border-2 px-3 py-2 lg:px-4 lg:py-3 transition-colors',
                  active ? 'border-brand bg-brand-soft ring-2 ring-brand' : 'border-line bg-card active:bg-line-soft',
                )}
              >
                <div className="flex items-start gap-2">
                  {!staff && <span className={cx('mt-2 w-3 h-3 rounded-full shrink-0', st.recovered ? 'bg-gain' : 'bg-loss')} aria-hidden />}
                  <span className="font-bold lg:text-lg leading-snug truncate lg:whitespace-normal lg:line-clamp-2">{b.productName}</span>
                </div>
                <div className="num hidden lg:block text-ink-soft mt-1">
                  {money(b.sellPrice)} ກີບ/{bu.short}
                </div>
                <div className={cx('num font-semibold', st.sellable > 0 ? 'text-brand' : 'text-loss')}>
                  ເຫຼືອ {qtyText(st.sellable, bu.decimals)} {bu.short}
                </div>
              </button>
            )
          })}
        </div>
        <div className="hidden lg:block">
          <TodayLog state={state} staff={staff} />
        </div>
      </div>

      {/* ───── Entry ───── */}
      <div className="lg:sticky lg:top-3">
        <Segmented
          className="mb-2.5"
          value={mode}
          onChange={setMode}
          options={[
            { value: 'sale', label: 'ຂາຍ' },
            { value: 'loss', label: 'ຂອງເສຍ / ແຖມ / ຫາຍ', activeClass: 'border-waste-bar bg-waste-bar text-ink' },
          ]}
        />

        {/* Read-out styled like a market price-computing scale */}
        <div className={cx('rounded-2xl bg-lcd text-lcd-text p-2.5 md:p-3 mb-2.5', !isSale && 'ring-4 ring-waste-bar')}>
          <div className="grid grid-cols-[1fr_1fr_1.35fr] gap-2">
            <Window
              label={u.decimals ? 'ນ້ຳໜັກ ກກ.' : `ຈຳນວນ ${u.short}`}
              value={byMoney ? qtyText(qty, u.decimals) : entry || '0'}
              active={!byMoney}
              onClick={canMoney ? () => switchEntry('qty') : undefined}
            />
            {isSale ? (
              <Window
                label={`ລາຄາ/${u.short}`}
                icon={<Pencil size={13} />}
                value={money(price)}
                highlight={priceOverride != null}
                onClick={() => {
                  setPriceDraft(price)
                  setPriceSheet(true)
                }}
              />
            ) : (
              <Window
                label={staff ? `ເຫຼືອໃນລັອດ` : `ທຶນ/${u.short}`}
                value={staff ? qtyText(s.sellable, u.decimals) : money(s.avg)}
              />
            )}
            <Window
              label={isSale ? 'ລວມ (ກີບ)' : staff ? 'ເຫຼືອຫຼັງບັນທຶກ' : 'ທຶນທີ່ເສຍ'}
              value={isSale ? money(amount) : staff ? qtyText(Math.max(0, r3(s.sellable - qty)), u.decimals) : money(lossValue)}
              big
              active={byMoney}
              onClick={canMoney ? () => switchEntry('money') : undefined}
            />
          </div>
          <p className="text-[0.85rem] text-lcd-dim mt-1.5 px-1 leading-snug truncate">
            {!isSale
              ? `${lot.productName}: ຕັດອອກຈາກສະຕັອກ ບໍ່ນັບເປັນລາຍຮັບ`
              : rounded
                ? `ປັດເສດຈາກ ${money(rawAmount)} ກີບ`
                : byMoney
                  ? 'ພິມຈຳນວນເງິນທີ່ລູກຄ້າເອົາ — ລະບົບຄິດນ້ຳໜັກໃຫ້'
                  : canMoney
                    ? 'ລູກຄ້າບອກເປັນເງິນ? ແຕະຊ່ອງ “ລວມ”'
                    : lot.productName}
          </p>
        </div>

        {!isSale && (
          <div className="flex gap-2 overflow-x-auto no-scrollbar mb-2.5">
            {LOSS_REASONS.map((r) => (
              <button
                key={r.key}
                type="button"
                aria-pressed={reason === r.key}
                onClick={() => setReason(r.key)}
                className={cx(
                  'shrink-0 min-h-[2.75rem] px-3 rounded-xl border-2 font-semibold',
                  reason === r.key ? 'border-waste-bar bg-waste-soft' : 'border-line bg-card',
                )}
              >
                {r.label}
              </button>
            ))}
          </div>
        )}

        <Numpad value={entry} onChange={setEntry} extraKey={extraKey} side={side} />

        <Button
          variant={isSale ? 'sale' : 'waste'}
          className="w-full mt-2.5 min-h-[clamp(3.5rem,7.5dvh,4.25rem)] rounded-2xl text-[1.3rem]"
          onClick={save}
          disabled={!(qty > 0)}
        >
          {isSale ? (
            <>
              ບັນທຶກການຂາຍ <span className="num">{qty > 0 ? kip(amount) : ''}</span>
            </>
          ) : (
            'ບັນທຶກຂອງເສຍ / ແຖມ / ຫາຍ'
          )}
        </Button>
      </div>

      <div className="lg:hidden mt-8">
        <TodayLog state={state} staff={staff} />
      </div>

      <Sheet
        open={priceSheet}
        onClose={() => setPriceSheet(false)}
        title="ລາຄາສະເພາະການຂາຍເທື່ອນີ້"
        footer={
          <div className="flex gap-3">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => {
                setPriceOverride(null)
                setPriceSheet(false)
              }}
            >
              ໃຊ້ລາຄາຕັ້ງ
            </Button>
            <Button
              className="flex-1"
              onClick={() => {
                setPriceOverride(priceDraft > 0 ? priceDraft : null)
                setPriceSheet(false)
              }}
            >
              ໃຊ້ລາຄານີ້
            </Button>
          </div>
        }
      >
        <p className="text-ink-soft mb-3">
          ລາຄາຕັ້ງຂອງລັອດ: <b className="num">{money(lot.sellPrice)} ກີບ/{u.short}</b>. ປ່ຽນລາຄາຖາວອນໄດ້ໃນໜ້າ ລັອດສິນຄ້າ.
        </p>
        <MoneyInput value={priceDraft} onChange={setPriceDraft} autoFocus />
      </Sheet>
    </div>
  )
}

// Shrink digits on narrow phones so 1,755,000 still fits the window.
function fitSize(len, big) {
  if (big) return len <= 7 ? 'text-[1.75rem] md:text-[2.4rem]' : len <= 9 ? 'text-[1.45rem] md:text-[2.2rem]' : 'text-[1.2rem] md:text-[1.9rem]'
  return len <= 5 ? 'text-[1.4rem] md:text-[1.75rem]' : len <= 7 ? 'text-[1.2rem] md:text-[1.75rem]' : 'text-[1rem] md:text-[1.5rem]'
}

function Window({ label, value, big, active, highlight, icon, onClick }) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={cx(
        'min-w-0 text-left rounded-xl bg-white/5 px-2 md:px-2.5 py-1.5 flex flex-col justify-between min-h-[4.1rem] md:min-h-[4.9rem]',
        active && 'ring-2 ring-lcd-text/80 bg-white/10',
        onClick && 'active:bg-white/15',
      )}
    >
      <div className="text-[0.8rem] md:text-sm text-lcd-dim flex items-center gap-1 truncate">
        {label}
        {icon}
      </div>
      <div
        className={cx(
          'num font-bold leading-tight truncate',
          fitSize(String(value).length, big),
          highlight && 'text-[#ffd58a]',
        )}
      >
        {value}
      </div>
    </Tag>
  )
}

function TodayLog({ state, staff }) {
  const { confirm, toast } = useDialogs()
  const today = todayKey()
  const sum = daySummary(state, today)
  const byId = new Map(state.batches.map((b) => [b.id, b]))
  const rows = state.moves.filter((m) => m.day === today).sort((a, b) => b.at - a.at)

  const remove = async (m, b) => {
    const u = unitOf(b.unit)
    const ok = await confirm({
      title: 'ລຶບລາຍການນີ້?',
      message: `${timeText(m.at)} ${b.productName} ${qtyText(m.qty, u.decimals)} ${u.short}${m.kind === 'sale' ? ` = ${kip(m.amount)}` : ''}`,
      confirmText: 'ລຶບ',
      danger: true,
    })
    if (ok) {
      deleteMove(m.id)
      toast('ລຶບລາຍການແລ້ວ', { action: { label: 'ເອົາຄືນ', onClick: () => restoreMove(m) } })
    }
  }

  return (
    <section>
      <div className="flex items-baseline justify-between gap-3 mb-2">
        <h2 className="text-[1.3rem] font-bold">ລາຍການມື້ນີ້</h2>
        <div className="text-right">
          <span className="text-ink-soft mr-2">ເງິນຮັບ</span>
          <span className="num text-2xl font-bold">{kip(sum.cash)}</span>
        </div>
      </div>
      {rows.length === 0 ? (
        <p className="text-ink-soft py-6 text-center rounded-2xl border-2 border-dashed border-line">ມື້ນີ້ຍັງບໍ່ມີລາຍການ</p>
      ) : (
        <ul className="rounded-2xl bg-card border border-line divide-y divide-line-soft">
          {rows.map((m) => {
            const b = byId.get(m.batchId)
            if (!b) return null
            const u = unitOf(b.unit)
            const special = m.kind === 'sale' && m.unitPrice !== b.sellPrice
            return (
              <li key={m.id} className="flex items-center gap-3 pl-4 pr-1 py-2">
                <span className="num text-ink-faint w-12 shrink-0">{timeText(m.at)}</span>
                <span className="flex-1 min-w-0">
                  <span className="block font-semibold truncate">{b.productName}</span>
                  <span className="num text-sm text-ink-soft">
                    {qtyText(m.qty, u.decimals)} {u.short}
                    {m.kind === 'sale' ? ` × ${money(m.unitPrice)}` : ''}
                    {special && <span className="text-waste"> (ລາຄາພິເສດ)</span>}
                    {!staff && m.by === 'staff' && <span className="ml-1 rounded bg-brand-soft text-brand px-1.5 text-xs font-semibold">ພະນັກງານ</span>}
                  </span>
                </span>
                {m.kind === 'sale' ? (
                  <span className="num text-lg font-bold whitespace-nowrap">{money(m.amount)}</span>
                ) : (
                  <span className="text-sm font-semibold text-waste bg-waste-soft rounded-lg px-2 py-0.5 whitespace-nowrap">{lossLabel(m.reason)}</span>
                )}
                {staff ? (
                  <span className="w-3" />
                ) : (
                  <IconButton label="ລຶບລາຍການ" onClick={() => remove(m, b)}>
                    <Trash2 size={22} />
                  </IconButton>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

function safeGet(k) {
  try {
    return localStorage.getItem(k)
  } catch {
    return null
  }
}
function safeSet(k, v) {
  try {
    localStorage.setItem(k, v)
  } catch {
    /* ignore */
  }
}
