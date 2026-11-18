import { useEffect, useMemo, useState } from 'react'
import { PackagePlus, ChevronRight } from 'lucide-react'
import { useAppState } from '../lib/store.js'
import { lotStats } from '../lib/calc.js'
import { unitOf } from '../lib/units.js'
import { money, qtyText, dateShort } from '../lib/format.js'
import { go } from '../lib/router.js'
import { Button, Segmented, Empty } from '../components/ui.jsx'
import { LotBar, StatusPill } from '../components/LotVisuals.jsx'
import { LotForm } from '../components/LotForm.jsx'
import { LotDetail } from '../components/LotDetail.jsx'

export default function LotsPage({ params }) {
  const state = useAppState()
  const [filter, setFilter] = useState('open')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [detailId, setDetailId] = useState(null)

  useEffect(() => {
    if (params.new) {
      setEditing(null)
      setFormOpen(true)
      go('lots')
    }
    if (params.lot) {
      setDetailId(params.lot)
      go('lots')
    }
  }, [params.new, params.lot])

  const all = useMemo(
    () =>
      state.batches
        .map((b) => lotStats(b, state.moves, state.expenses))
        .sort((a, b) => b.batch.receivedAt.localeCompare(a.batch.receivedAt) || b.batch.createdAt - a.batch.createdAt),
    [state],
  )
  const open = all.filter((s) => !s.batch.closed)
  const closed = all.filter((s) => s.batch.closed)
  const list = filter === 'open' ? open : closed

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <Segmented
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'open', label: `ກຳລັງຂາຍ (${open.length})` },
            { value: 'closed', label: `ປິດແລ້ວ (${closed.length})` },
          ]}
        />
        <Button
          onClick={() => {
            setEditing(null)
            setFormOpen(true)
          }}
        >
          <PackagePlus size={24} /> ຮັບຂອງເຂົ້າ (ລັອດໃໝ່)
        </Button>
      </div>

      {list.length === 0 ? (
        <Empty icon={<PackagePlus size={44} />} title={filter === 'open' ? 'ຍັງບໍ່ມີລັອດທີ່ກຳລັງຂາຍ' : 'ຍັງບໍ່ມີລັອດທີ່ປິດແລ້ວ'}>
          {filter === 'open' && <p className="text-ink-soft">ກົດ “ຮັບຂອງເຂົ້າ” ເພື່ອບັນທຶກລັອດທຳອິດ</p>}
        </Empty>
      ) : (
        <ul className="grid lg:grid-cols-2 gap-3">
          {list.map((s) => {
            const b = s.batch
            const u = unitOf(b.unit)
            return (
              <li key={b.id}>
                <button
                  type="button"
                  onClick={() => setDetailId(b.id)}
                  className="w-full text-left rounded-2xl bg-card border border-line px-4 pt-3 pb-4 active:bg-line-soft"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-lg font-bold leading-snug">{b.productName}</span>
                        {b.demo && <span className="rounded-md bg-waste-soft text-waste px-2 text-xs font-semibold">ຕົວຢ່າງ</span>}
                      </div>
                      <div className="num text-ink-soft text-[0.95rem]">
                        ຮັບ {dateShort(b.receivedAt)} — {qtyText(b.qtyIn, u.decimals)} {u.short}, ທຶນ {money(s.avg)}/{u.short}, ຂາຍ{' '}
                        {money(b.sellPrice)}/{u.short}
                      </div>
                    </div>
                    <StatusPill stats={s} />
                    <ChevronRight className="text-ink-faint mt-0.5 shrink-0" />
                  </div>
                  <div className="mt-3">
                    <LotBar stats={s} size="sm" />
                  </div>
                  <div className="num flex justify-between mt-2 text-[0.95rem]">
                    <span>
                      ຂາຍແລ້ວ <b>{qtyText(s.soldQty, u.decimals)}</b>
                      {s.lossQty > 0 && (
                        <span className="text-waste">
                          {' '}
                          ເສຍ <b>{qtyText(s.lossQty, u.decimals)}</b>
                        </span>
                      )}{' '}
                      ເຫຼືອ <b>{qtyText(s.sellable, u.decimals)}</b> {u.short}
                    </span>
                    <span className={s.balance >= 0 ? 'text-gain font-bold' : 'text-loss font-bold'}>
                      {s.balance >= 0 ? '+' : '−'}
                      {money(Math.abs(s.balance))}
                    </span>
                  </div>
                </button>
              </li>
            )
          })}
        </ul>
      )}

      <LotForm
        open={formOpen}
        editing={editing}
        onClose={() => setFormOpen(false)}
        onSaved={(b) => {
          if (!editing) setDetailId(b.id)
        }}
      />
      {detailId && !formOpen && (
        <LotDetail
          batchId={detailId}
          onClose={() => setDetailId(null)}
          onEdit={(b) => {
            setEditing(b)
            setFormOpen(true)
          }}
        />
      )}
    </div>
  )
}
