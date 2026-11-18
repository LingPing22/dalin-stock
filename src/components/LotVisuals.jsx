import { ChevronRight, TriangleAlert } from 'lucide-react'
import { qtyText, kip, money } from '../lib/format.js'
import { unitOf } from '../lib/units.js'
import { cx } from './ui.jsx'

/** Round "how much more to sell" up so the vendor never falls short. */
export function ceilQty(q, decimals) {
  if (!Number.isFinite(q)) return q
  return decimals ? Math.ceil(q * 100 - 1e-6) / 100 : Math.ceil(q - 1e-6)
}

/**
 * The lot "ruler": sold (red until the lot paid for itself, then green),
 * what's left (pink zone = still paying back, mint zone = pure profit),
 * waste striped at the end, and a flag at the break-even point.
 */
export function LotBar({ stats: s, size = 'lg', animateFlag }) {
  const b = s.batch
  const u = unitOf(b.unit)
  const total = Math.max(b.qtyIn, s.soldQty + s.lossQty, 0.0001)
  const pct = (q) => Math.max(0, Math.min(100, (q / total) * 100))

  const flagQty = s.recovered || s.canBreakEven ? s.breakEvenAt : null
  const redSold = flagQty == null ? s.soldQty : Math.min(flagQty, s.soldQty)
  const greenSold = Math.max(0, s.soldQty - redSold)
  const remStart = s.soldQty
  const remEnd = s.soldQty + s.sellable
  const pinkEnd = flagQty == null ? remEnd : Math.min(Math.max(flagQty, remStart), remEnd)

  const big = size === 'lg'
  const h = big ? 'h-9' : 'h-4'

  const segs = [
    { from: 0, w: redSold, cls: 'bg-loss' },
    { from: redSold, w: greenSold, cls: 'bg-gain' },
    { from: remStart, w: pinkEnd - remStart, cls: 'bg-[#f5d3cf]' },
    { from: pinkEnd, w: remEnd - pinkEnd, cls: 'bg-[#cfe9d7]' },
    { from: remEnd, w: s.lossQty, cls: 'waste-stripes' },
  ]

  return (
    <div className={cx('relative select-none', big ? 'pt-9' : 'pt-1')}>
      {flagQty != null && big && (
        <div
          className="absolute top-0 -translate-x-1/2 whitespace-nowrap text-sm font-bold"
          style={{ left: `clamp(3.5rem, ${pct(flagQty)}%, calc(100% - 3.5rem))` }}
        >
          <span className={cx('px-2 py-0.5 rounded-md', s.recovered ? 'bg-gain text-white' : 'bg-loss text-white')}>
            ຈຸດຄືນທຶນ {qtyText(ceilQty(flagQty, u.decimals), u.decimals)} {u.short}
          </span>
        </div>
      )}
      <div className={cx('relative w-full rounded-lg bg-line-soft overflow-hidden ring-1 ring-inset ring-line', h)}>
        {segs.map(
          (g, i) =>
            g.w > 0 && (
              <div key={i} className={cx('absolute inset-y-0', g.cls)} style={{ left: `${pct(g.from)}%`, width: `${pct(g.w)}%` }} />
            ),
        )}
      </div>
      {flagQty != null && (
        <div
          className={cx('absolute w-[3px] -translate-x-1/2 bg-ink rounded-full', big ? 'top-7 h-[3.4rem]' : 'top-0 h-6', animateFlag && 'anim-flag')}
          style={{ left: `${pct(flagQty)}%` }}
          aria-hidden
        />
      )}
      {big && (
        <div className="relative h-4 mt-1" aria-hidden>
          {Array.from({ length: 11 }, (_, i) => (
            <span
              key={i}
              className={cx('absolute top-0 w-px bg-ink-faint', i % 5 === 0 ? 'h-3.5' : 'h-2')}
              style={{ left: `${i * 10}%` }}
            />
          ))}
        </div>
      )}
    </div>
  )
}

/** "ຮັບມາ 20 → ຂາຍແລ້ວ 13 → ເສຍ 1 → ເຫຼືອ 6" */
export function LotCounts({ stats: s, compact }) {
  const u = unitOf(s.batch.unit)
  const q = (v) => qtyText(v, u.decimals)
  const items = [
    { label: 'ຮັບມາ', v: q(s.batch.qtyIn), cls: 'text-ink' },
    { label: 'ຂາຍແລ້ວ', v: q(s.soldQty), cls: s.recovered ? 'text-gain' : 'text-loss' },
    ...(s.lossQty > 0 ? [{ label: 'ເສຍ/ແຖມ/ຫາຍ', v: q(s.lossQty), cls: 'text-waste' }] : []),
    { label: s.oversold ? 'ຂາຍເກີນ' : 'ເຫຼືອ', v: q(s.oversold || s.remaining), cls: s.oversold ? 'text-loss' : 'text-brand' },
  ]
  return (
    <div className="flex items-stretch flex-wrap gap-y-2">
      {items.map((it, i) => (
        <div key={it.label} className="flex items-center">
          {i > 0 && <ChevronRight className="text-ink-faint mx-1 shrink-0" size={compact ? 18 : 22} aria-hidden />}
          <div className="leading-tight">
            <div className="text-sm text-ink-soft">{it.label}</div>
            <div className={cx('num font-bold', compact ? 'text-xl' : 'text-[1.7rem]', it.cls)}>
              {it.v}
              <span className="text-sm font-semibold text-ink-faint ml-1">{u.short}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

/** The plain-words break-even message, red or green. */
export function BreakEvenNote({ stats: s }) {
  const u = unitOf(s.batch.unit)
  if (s.recovered) {
    return (
      <div className="rounded-2xl bg-gain-soft border-l-[6px] border-gain px-4 py-3">
        <p className="text-xl font-bold text-gain">ຄືນທຶນແລ້ວເດີ!</p>
        <p className="text-[1.05rem] leading-relaxed">
          ຄືນທຶນຕອນຂາຍໄດ້ <b className="num">{qtyText(ceilQty(s.breakEvenAt, u.decimals), u.decimals)} {u.short}</b>. ຕອນນີ້ກຳໄລແລ້ວ{' '}
          <b className="num text-gain">{kip(s.balance)}</b>
          {s.sellable > 0 && (
            <>
              {' '}
              — ທີ່ເຫຼືອ <b className="num">{qtyText(s.sellable, u.decimals)} {u.short}</b> ຂາຍຕໍ່ແມ່ນກຳໄລລ້ວນໆ{' '}
              <b className="num text-gain">+{money(s.remainingValue)}</b> ກີບ
            </>
          )}
        </p>
      </div>
    )
  }
  if (!s.canBreakEven) {
    return (
      <div className="rounded-2xl bg-loss-soft border-l-[6px] border-loss px-4 py-3">
        <p className="text-xl font-bold text-loss flex items-center gap-2">
          <TriangleAlert size={24} /> ຂາຍໝົດກໍ່ຍັງບໍ່ຄືນທຶນ
        </p>
        <p className="text-[1.05rem] leading-relaxed">
          ຖ້າຂາຍທີ່ເຫຼືອໝົດໃນລາຄາ {money(s.batch.sellPrice)} ກີບ/{u.short} ຈະຍັງຂາດທຶນ <b className="num text-loss">{kip(-s.projectedProfit)}</b>. ລອງຂຶ້ນລາຄາ ຫຼື ລະວັງຂອງເສຍ.
        </p>
      </div>
    )
  }
  return (
    <div className="rounded-2xl bg-loss-soft border-l-[6px] border-loss px-4 py-3">
      <p className="text-xl font-bold text-loss">ຍັງບໍ່ຄືນທຶນ</p>
      <p className="text-[1.05rem] leading-relaxed">
        ຍັງຂາດອີກ <b className="num text-loss">{kip(s.shortfall)}</b> — ຂາຍອີກປະມານ{' '}
        <b className="num">
          {qtyText(ceilQty(s.qtyToBreakEven, u.decimals), u.decimals)} {u.short}
        </b>{' '}
        ກໍ່ຄືນທຶນ. ຫຼັງຈາກນັ້ນແມ່ນກຳໄລລ້ວນໆ.
      </p>
    </div>
  )
}

/** Projected money if everything left is sold at the set price. */
export function Projection({ stats: s }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="rounded-xl bg-card border border-line px-4 py-3">
        <div className="text-sm text-ink-soft leading-snug">ຖ້າຂາຍໝົດ ຈະໄດ້ເງິນລວມ</div>
        <div className="num text-[1.45rem] font-bold">{money(s.projectedRevenue)}</div>
      </div>
      <div className="rounded-xl bg-card border border-line px-4 py-3">
        <div className="text-sm text-ink-soft leading-snug">ກຳໄລສຸດທິ ຖ້າຂາຍໝົດ</div>
        <div className={cx('num text-[1.45rem] font-bold', s.projectedProfit >= 0 ? 'text-gain' : 'text-loss')}>
          {s.projectedProfit >= 0 ? '+' : '−'}
          {money(Math.abs(s.projectedProfit))}
        </div>
      </div>
    </div>
  )
}

export function StatusPill({ stats: s }) {
  if (s.batch.closed) return <span className="rounded-full bg-line-soft text-ink-soft px-3 py-0.5 text-sm font-semibold">ປິດລັອດແລ້ວ</span>
  return s.recovered ? (
    <span className="rounded-full bg-gain text-white px-3 py-0.5 text-sm font-semibold">ຄືນທຶນແລ້ວ</span>
  ) : (
    <span className="rounded-full bg-loss text-white px-3 py-0.5 text-sm font-semibold">ຍັງບໍ່ຄືນທຶນ</span>
  )
}
