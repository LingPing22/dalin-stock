import { Trash2, Pencil, Lock, LockOpen, Scale } from 'lucide-react'
import { useAppState, closeBatch, reopenBatch, deleteBatch, deleteMove, restoreMove } from '../lib/store.js'
import { lotStats } from '../lib/calc.js'
import { unitOf, lossLabel } from '../lib/units.js'
import { money, kip, qtyText, dateLong, dateShort, timeText } from '../lib/format.js'
import { go } from '../lib/router.js'
import { Button, IconButton, Sheet, Line, cx } from './ui.jsx'
import { LotBar, LotCounts, BreakEvenNote, Projection, StatusPill } from './LotVisuals.jsx'
import { useDialogs } from './Dialogs.jsx'

/** Money breakdown for one lot (ສະຫຼຸບລາຍຮອບ). */
export function LotSummary({ stats: s }) {
  const u = unitOf(s.batch.unit)
  return (
    <div className="rounded-2xl bg-card border border-line px-4 py-2 divide-y divide-line-soft">
      <Line label="ເງິນສົດຮັບຈາກການຂາຍ" sub={`${s.sales.length} ລາຍການ`} value={money(s.revenue)} />
      <Line
        label="ຕົ້ນທຶນຂອງທີ່ຂາຍໄປ"
        sub={`${qtyText(s.soldQty, u.decimals)} ${u.short} × ${money(s.avg)}`}
        sign="−"
        value={money(s.cogsSold)}
      />
      {s.lossQty > 0 && (
        <Line label="ຂອງເສຍ / ແຖມ / ຫາຍ (ຕາມທຶນ)" sub={`${qtyText(s.lossQty, u.decimals)} ${u.short}`} sign="−" value={money(s.lossCost)} tone="waste" />
      )}
      {s.lotExpenses > 0 && <Line label="ຄ່າໃຊ້ຈ່າຍຂອງລັອດ" sign="−" value={money(s.lotExpenses)} />}
      <Line
        strong
        label="ກຳໄລສຸດທິ (ຂອງທີ່ຂາຍແລ້ວ)"
        value={`${s.netSoFar < 0 ? '−' : ''}${money(Math.abs(s.netSoFar))}`}
        tone={s.netSoFar >= 0 ? 'gain' : 'loss'}
      />
    </div>
  )
}

export function LotDetail({ batchId, onClose, onEdit }) {
  const state = useAppState()
  const { confirm, toast } = useDialogs()
  const batch = state.batches.find((b) => b.id === batchId)
  if (!batch) return null
  const s = lotStats(batch, state.moves, state.expenses)
  const u = unitOf(batch.unit)

  const doClose = async () => {
    if (s.sellable > 0) {
      const choice = await confirm({
        title: 'ປິດລັອດນີ້',
        message: `ລັອດນີ້ຍັງເຫຼືອ ${qtyText(s.sellable, u.decimals)} ${u.short}. ຈະເຮັດແນວໃດກັບສ່ວນທີ່ເຫຼືອ?`,
        actions: [
          { label: `ບັນທຶກເປັນ ນ້ຳໜັກຫາຍ ແລ້ວປິດ`, value: 'shrink', variant: 'waste' },
          { label: `ບັນທຶກເປັນ ຂອງເສຍ ແລ້ວປິດ`, value: 'spoil', variant: 'secondary' },
          { label: 'ປິດໂດຍບໍ່ບັນທຶກ (ເກັບໄວ້ຂາຍລັອດໜ້າ)', value: 'keep', variant: 'secondary' },
        ],
      })
      if (!choice) return
      closeBatch(batch.id, choice === 'keep' ? {} : { writeOffQty: s.sellable, reason: choice })
    } else {
      closeBatch(batch.id)
    }
    toast('ປິດລັອດແລ້ວ')
  }

  const doDelete = async () => {
    const ok = await confirm({
      title: 'ລຶບລັອດນີ້?',
      message: `ຈະລຶບ "${batch.productName}" ພ້ອມລາຍການຂາຍ/ຂອງເສຍ ${s.moves.length} ລາຍການ. ຄ່າໃຊ້ຈ່າຍທີ່ຜູກໄວ້ຈະຍັງຢູ່. ລຶບແລ້ວເອົາຄືນບໍ່ໄດ້.`,
      confirmText: 'ລຶບລັອດ',
      danger: true,
    })
    if (ok) {
      deleteBatch(batch.id)
      onClose()
      toast('ລຶບລັອດແລ້ວ')
    }
  }

  const removeMove = async (m) => {
    const ok = await confirm({
      title: 'ລຶບລາຍການນີ້?',
      message: `${dateShort(m.day)} ${timeText(m.at)} — ${qtyText(m.qty, u.decimals)} ${u.short}${m.kind === 'sale' ? ` = ${kip(m.amount)}` : ` (${lossLabel(m.reason)})`}`,
      confirmText: 'ລຶບ',
      danger: true,
    })
    if (ok) {
      deleteMove(m.id)
      toast('ລຶບລາຍການແລ້ວ', { action: { label: 'ເອົາຄືນ', onClick: () => restoreMove(m) } })
    }
  }

  return (
    <Sheet
      open
      wide
      onClose={onClose}
      title={batch.productName}
      footer={
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {!batch.closed && (
            <Button
              size="md"
              onClick={() => {
                onClose()
                go('sell', { lot: batch.id })
              }}
            >
              <Scale size={22} /> ຂາຍລັອດນີ້
            </Button>
          )}
          <Button size="md" variant="secondary" onClick={() => onEdit(batch)}>
            <Pencil size={20} /> ແກ້ໄຂ
          </Button>
          {batch.closed ? (
            <Button size="md" variant="secondary" onClick={() => reopenBatch(batch.id)}>
              <LockOpen size={20} /> ເປີດຂາຍຄືນ
            </Button>
          ) : (
            <Button size="md" variant="secondary" onClick={doClose}>
              <Lock size={20} /> ປິດລັອດ
            </Button>
          )}
          <Button size="md" variant="ghost" className="text-loss" onClick={doDelete}>
            <Trash2 size={20} /> ລຶບລັອດ
          </Button>
        </div>
      }
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-4 text-ink-soft">
        <StatusPill stats={s} />
        <span>ຮັບ {dateLong(batch.receivedAt)}</span>
        {batch.demo && <span className="rounded-md bg-waste-soft text-waste px-2 text-sm font-semibold">ຕົວຢ່າງ</span>}
      </div>

      <div className="grid grid-cols-3 gap-3 mb-5">
        <Fact label="ຕົ້ນທຶນລວມ" value={money(batch.totalCost)} />
        <Fact label={`ຕົ້ນທຶນ/${u.short}`} value={money(s.avg)} />
        <Fact label={`ລາຄາຂາຍ/${u.short}`} value={money(batch.sellPrice)} />
      </div>

      <LotCounts stats={s} />
      <div className="my-4">
        <LotBar stats={s} />
      </div>
      <div className="mb-4">
        <BreakEvenNote stats={s} />
      </div>
      {s.sellable > 0 && !batch.closed && (
        <div className="mb-6">
          <Projection stats={s} />
        </div>
      )}

      <h3 className="text-lg font-bold mb-2">ສະຫຼຸບເງິນຂອງລັອດນີ້</h3>
      <LotSummary stats={s} />
      <p className="text-sm text-ink-faint mt-2 mb-6">
        ເງິນທີ່ໄດ້ຄືນ {money(s.revenue)} ທຽບກັບເງິນທີ່ຈ່າຍໄປ {money(s.costToRecover)} ={' '}
        <b className={cx('num', s.balance >= 0 ? 'text-gain' : 'text-loss')}>
          {s.balance >= 0 ? '+' : '−'}
          {money(Math.abs(s.balance))}
        </b>
      </p>

      <h3 className="text-lg font-bold mb-2">ປະຫວັດ ({s.moves.length})</h3>
      {s.moves.length === 0 ? (
        <p className="text-ink-soft">ຍັງບໍ່ມີການຂາຍ</p>
      ) : (
        <ul className="rounded-2xl bg-card border border-line divide-y divide-line-soft">
          {s.moves.map((m) => (
            <li key={m.id} className="flex items-center gap-3 pl-4 pr-1 py-1.5">
              <span className="num text-ink-faint text-sm w-24 shrink-0">
                {dateShort(m.day)} {timeText(m.at)}
              </span>
              <span className="num flex-1">
                {qtyText(m.qty, u.decimals)} {u.short}
                {m.kind === 'loss' && <span className="ml-2 text-sm font-semibold text-waste">{lossLabel(m.reason)}</span>}
              </span>
              {m.kind === 'sale' && <span className="num font-bold">{money(m.amount)}</span>}
              <IconButton label="ລຶບລາຍການ" onClick={() => removeMove(m)}>
                <Trash2 size={20} />
              </IconButton>
            </li>
          ))}
        </ul>
      )}
      {batch.note && <p className="mt-4 text-ink-soft">ໝາຍເຫດ: {batch.note}</p>}
    </Sheet>
  )
}

function Fact({ label, value }) {
  return (
    <div className="rounded-xl bg-card border border-line px-3 py-2">
      <div className="text-sm text-ink-soft">{label}</div>
      <div className="num text-xl font-bold">{value}</div>
    </div>
  )
}
