import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Scale, PackagePlus } from 'lucide-react'
import { useAppState } from '../lib/store.js'
import { lotStats, daySummary, recentDays, openLotsOutlook } from '../lib/calc.js'
import { unitOf } from '../lib/units.js'
import { money, kip, qtyText, todayKey, addDays, dateLong, dateRelative, dateShort } from '../lib/format.js'
import { go } from '../lib/router.js'
import { Button, IconButton, Section, Segmented, Select, Line, DateInput, Empty, cx } from '../components/ui.jsx'
import { LotBar, LotCounts, BreakEvenNote, Projection } from '../components/LotVisuals.jsx'
import { LotSummary } from '../components/LotDetail.jsx'

export default function DashboardPage() {
  const state = useAppState()
  const today = todayKey()
  const stats = useMemo(() => state.batches.map((b) => lotStats(b, state.moves, state.expenses)), [state])
  const open = stats
    .filter((s) => !s.batch.closed)
    .sort((a, b) => Number(a.recovered) - Number(b.recovered) || a.batch.receivedAt.localeCompare(b.batch.receivedAt))
  const outlook = openLotsOutlook(stats)
  const t = daySummary(state, today)

  return (
    <div>
      {/* ───── Today ───── */}
      <section className="mb-8 rounded-3xl bg-card border border-line p-5 md:p-6">
        <div className="text-ink-soft">{dateLong(today)}</div>
        <div className="flex flex-wrap items-end gap-x-10 gap-y-4 mt-1">
          <div>
            <div className="text-lg font-semibold">ເງິນສົດຮັບມື້ນີ້</div>
            <div className="num text-[3rem] md:text-[3.6rem] font-bold leading-none tracking-tight">{money(t.cash)}</div>
            <div className="text-ink-faint">ກີບ, {t.saleCount} ລາຍການຂາຍ</div>
          </div>
          <div className="flex gap-8">
            <div>
              <div className="text-ink-soft">ກຳໄລສຸດທິມື້ນີ້</div>
              <div className={cx('num text-[2rem] font-bold leading-tight', t.net >= 0 ? 'text-gain' : 'text-loss')}>
                {t.net >= 0 ? '+' : '−'}
                {money(Math.abs(t.net))}
              </div>
            </div>
            <div>
              <div className="text-ink-soft">ຄ່າໃຊ້ຈ່າຍມື້ນີ້</div>
              <div className="num text-[2rem] font-bold leading-tight">{money(t.expenses)}</div>
            </div>
          </div>
        </div>
      </section>

      {/* ───── Open lots ───── */}
      <Section
        title="ລັອດທີ່ກຳລັງຂາຍ"
        action={
          open.length > 0 && (
            <span className="text-ink-soft">
              <b className="text-loss">{outlook.notRecovered}</b> ຍັງບໍ່ຄືນທຶນ, <b className="text-gain">{open.length - outlook.notRecovered}</b> ຄືນທຶນແລ້ວ
            </span>
          )
        }
      >
        {open.length === 0 ? (
          <Empty icon={<PackagePlus size={44} />} title="ຍັງບໍ່ມີລັອດທີ່ກຳລັງຂາຍ">
            <Button className="mt-2" onClick={() => go('lots', { new: 1 })}>
              <PackagePlus size={24} /> ຮັບຂອງເຂົ້າລັອດໃໝ່
            </Button>
          </Empty>
        ) : (
          <div className="grid xl:grid-cols-2 gap-4">
            {open.map((s) => (
              <LotPanel key={s.batch.id} s={s} />
            ))}
          </div>
        )}
      </Section>

      {open.length > 0 && (
        <Section title="ຖ້າຂາຍຂອງທີ່ເຫຼືອໝົດທຸກລັອດ">
          <div className="rounded-2xl bg-card border border-line px-4 py-2 divide-y divide-line-soft">
            <Line label="ເງິນທີ່ຈະໄດ້ຮັບເພີ່ມ (ຕາມລາຄາຕັ້ງ)" value={kip(outlook.remainingValue)} />
            <Line label="ທຶນທີ່ຍັງຈົມຢູ່ໃນສະຕັອກ" value={kip(outlook.stockValueAtCost)} />
            <Line
              strong
              label="ກຳໄລສຸດທິລວມທີ່ຄາດໄວ້"
              sub="ທຸກລັອດທີ່ກຳລັງຂາຍ ຫັກທຶນ ແລະ ຄ່າໃຊ້ຈ່າຍລັອດແລ້ວ"
              value={`${outlook.projectedProfit < 0 ? '−' : '+'}${kip(Math.abs(outlook.projectedProfit))}`}
              tone={outlook.projectedProfit >= 0 ? 'gain' : 'loss'}
            />
          </div>
        </Section>
      )}

      <Summaries state={state} stats={stats} />
    </div>
  )
}

function LotPanel({ s }) {
  const b = s.batch
  const u = unitOf(b.unit)
  return (
    <article className={cx('rounded-2xl bg-card border border-line border-t-[6px] p-4 md:p-5', s.recovered ? 'border-t-gain' : 'border-t-loss')}>
      <header className="flex items-start gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-xl font-bold leading-snug">
            {b.productName}
            {b.demo && <span className="ml-2 align-middle rounded-md bg-waste-soft text-waste px-2 text-xs font-semibold">ຕົວຢ່າງ</span>}
          </h3>
          <p className="num text-ink-soft">
            ຮັບ {dateShort(b.receivedAt)}, ທຶນ {money(b.totalCost)}
            {s.lotExpenses > 0 && ` + ຄ່າໃຊ້ຈ່າຍ ${money(s.lotExpenses)}`}, ຂາຍ {money(b.sellPrice)}/{u.short}
          </p>
        </div>
        <Button size="md" variant="soft" onClick={() => go('sell', { lot: b.id })}>
          <Scale size={22} /> ຂາຍ
        </Button>
      </header>
      <LotCounts stats={s} />
      <div className="my-4">
        <LotBar stats={s} />
      </div>
      <BreakEvenNote stats={s} />
      {s.sellable > 0 && (
        <div className="mt-3">
          <Projection stats={s} />
        </div>
      )}
      <button type="button" className="mt-3 text-brand font-semibold min-h-[2.75rem]" onClick={() => go('lots', { lot: b.id })}>
        ເບິ່ງລາຍລະອຽດ ແລະ ປະຫວັດ
      </button>
    </article>
  )
}

function Summaries({ state, stats }) {
  const [tab, setTab] = useState('day')
  const [day, setDay] = useState(todayKey())
  const lotsSorted = [...stats].sort((a, b) => b.batch.receivedAt.localeCompare(a.batch.receivedAt))
  const [lotId, setLotId] = useState(lotsSorted[0]?.batch.id || '')
  const d = daySummary(state, day)
  const week = recentDays(state, todayKey(), 7)
  const lot = stats.find((s) => s.batch.id === lotId) || lotsSorted[0]

  return (
    <Section title="ສະຫຼຸບຍອດ">
      <Segmented
        className="mb-4"
        value={tab}
        onChange={setTab}
        options={[
          { value: 'day', label: 'ລາຍວັນ' },
          { value: 'lot', label: 'ລາຍຮອບ (ຕາມລັອດ)' },
        ]}
      />

      {tab === 'day' ? (
        <div className="grid lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] gap-5">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <IconButton label="ມື້ກ່ອນ" className="bg-card border-2 border-line" onClick={() => setDay(addDays(day, -1))}>
                <ChevronLeft size={28} />
              </IconButton>
              <DateInput className="flex-1" value={day} max={todayKey()} onChange={(e) => e.target.value && setDay(e.target.value)} />
              <IconButton
                label="ມື້ຖັດໄປ"
                className="bg-card border-2 border-line disabled:opacity-40"
                disabled={day >= todayKey()}
                onClick={() => setDay(addDays(day, 1))}
              >
                <ChevronRight size={28} />
              </IconButton>
            </div>
            <div className="rounded-2xl bg-card border border-line px-4 py-2 divide-y divide-line-soft">
              <Line label="ເງິນສົດຮັບຈິງ" sub={`${d.saleCount} ລາຍການຂາຍ`} value={money(d.cash)} />
              <Line label="ຕົ້ນທຶນຂອງທີ່ຂາຍໄປ" sign="−" value={money(d.cogs)} />
              {d.lossCost > 0 && <Line label="ຂອງເສຍ / ແຖມ / ຫາຍ (ຕາມທຶນ)" sign="−" value={money(d.lossCost)} tone="waste" />}
              <Line
                label="ຄ່າໃຊ້ຈ່າຍຍ່ອຍ"
                sub={d.expenseItems.map((e) => `${e.category} ${money(e.amount)}`).join(', ') || 'ບໍ່ມີ'}
                sign="−"
                value={money(d.expenses)}
              />
              <Line strong label="ກຳໄລສຸດທິ" value={`${d.net < 0 ? '−' : ''}${money(Math.abs(d.net))}`} tone={d.net >= 0 ? 'gain' : 'loss'} />
            </div>
            {d.byLot.length > 0 && (
              <div className="mt-4">
                <h3 className="font-bold mb-2">ຂາຍຫຍັງໄປແດ່ {dateRelative(day)}</h3>
                <ul className="rounded-2xl bg-card border border-line divide-y divide-line-soft">
                  {d.byLot.map((r) => {
                    const u = unitOf(r.batch.unit)
                    return (
                      <li key={r.batch.id} className="flex items-baseline gap-3 px-4 py-2">
                        <span className="flex-1 font-semibold">{r.batch.productName}</span>
                        <span className="num text-ink-soft">
                          {qtyText(r.soldQty, u.decimals)} {u.short}
                          {r.lossQty > 0 && <span className="text-waste"> (ເສຍ {qtyText(r.lossQty, u.decimals)})</span>}
                        </span>
                        <span className="num font-bold w-28 text-right">{money(r.cash)}</span>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}
          </div>

          <div>
            <h3 className="font-bold mb-2">7 ວັນຫຼ້າສຸດ</h3>
            <ul className="rounded-2xl bg-card border border-line divide-y divide-line-soft">
              <li className="flex gap-3 px-4 py-2 text-sm text-ink-soft">
                <span className="flex-1">ວັນ</span>
                <span className="w-28 text-right">ເງິນຮັບ</span>
                <span className="w-28 text-right">ກຳໄລສຸດທິ</span>
              </li>
              {week.map((w) => (
                <li key={w.key}>
                  <button
                    type="button"
                    onClick={() => setDay(w.key)}
                    className={cx('w-full flex items-center gap-3 px-4 py-2.5 text-left active:bg-line-soft', w.key === day && 'bg-brand-soft')}
                  >
                    <span className="flex-1 font-semibold">{dateRelative(w.key)}</span>
                    <span className="num w-28 text-right">{money(w.cash)}</span>
                    <span className={cx('num w-28 text-right font-bold', w.net > 0 ? 'text-gain' : w.net < 0 ? 'text-loss' : 'text-ink-faint')}>
                      {w.net < 0 ? '−' : w.net > 0 ? '+' : ''}
                      {money(Math.abs(w.net))}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : !lot ? (
        <p className="text-ink-soft">ຍັງບໍ່ມີລັອດ</p>
      ) : (
        <div className="max-w-2xl">
          <Select className="mb-4" value={lot.batch.id} onChange={(e) => setLotId(e.target.value)}>
            {lotsSorted.map((s) => (
              <option key={s.batch.id} value={s.batch.id}>
                {s.batch.productName} — ຮັບ {dateShort(s.batch.receivedAt)}
                {s.batch.closed ? ' (ປິດແລ້ວ)' : ''}
              </option>
            ))}
          </Select>
          <LotSummary stats={lot} />
          <p className="mt-3 text-ink-soft">
            ເງິນທີ່ໄດ້ຄືນ <b className="num text-ink">{money(lot.revenue)}</b> ທຽບກັບເງິນທີ່ຈ່າຍໄປ{' '}
            <b className="num text-ink">{money(lot.costToRecover)}</b>:{' '}
            <b className={cx('num', lot.balance >= 0 ? 'text-gain' : 'text-loss')}>
              {lot.balance >= 0 ? `ຄືນທຶນແລ້ວ +${money(lot.balance)}` : `ຍັງຂາດ ${money(-lot.balance)}`}
            </b>
          </p>
        </div>
      )}
    </Section>
  )
}
