import { useEffect, useMemo, useState } from 'react'
import { useAppState, addBatch, updateBatch } from '../lib/store.js'
import { planLot } from '../lib/calc.js'
import { UNITS, unitOf } from '../lib/units.js'
import { money, qtyText, todayKey } from '../lib/format.js'
import { Button, Sheet, Field, TextInput, DateInput, MoneyInput, QtyInput, Segmented, cx } from './ui.jsx'
import { ceilQty } from './LotVisuals.jsx'

const blank = () => ({ receivedAt: todayKey(), productName: '', unit: 'kg', qtyIn: 0, totalCost: 0, sellPrice: 0, note: '' })

export function LotForm({ open, onClose, editing, onSaved }) {
  const state = useAppState()
  const [f, setF] = useState(blank)
  const [tried, setTried] = useState(false)

  useEffect(() => {
    if (!open) return
    setTried(false)
    setF(
      editing
        ? {
            receivedAt: editing.receivedAt,
            productName: editing.productName,
            unit: editing.unit,
            qtyIn: editing.qtyIn,
            totalCost: editing.totalCost,
            sellPrice: editing.sellPrice,
            note: editing.note || '',
          }
        : blank(),
    )
  }, [open, editing])

  const set = (k) => (v) => setF((x) => ({ ...x, [k]: v }))
  const u = unitOf(f.unit)
  const plan = planLot(f)

  // previous product names → quick fill
  const recent = useMemo(() => {
    const seen = new Map()
    for (const b of [...state.batches].sort((a, b) => b.createdAt - a.createdAt)) if (!seen.has(b.productName)) seen.set(b.productName, b)
    return [...seen.values()].slice(0, 8)
  }, [state.batches])

  const markups = [30, 50, 80, 100].map((p) => {
    const raw = plan.avg * (1 + p / 100)
    const step = raw >= 10000 ? 500 : 100
    return { p, price: Math.ceil(raw / step) * step }
  })

  const errors = {
    productName: !f.productName.trim() && 'ໃສ່ຊື່ສິນຄ້າ',
    qtyIn: !(f.qtyIn > 0) && 'ໃສ່ຈຳນວນທີ່ຮັບມາ',
    sellPrice: !(f.sellPrice > 0) && 'ໃສ່ລາຄາຂາຍ',
  }
  const valid = !Object.values(errors).some(Boolean)

  const save = () => {
    setTried(true)
    if (!valid) return
    if (editing) {
      updateBatch(editing.id, { ...f, productName: f.productName.trim(), note: f.note.trim() })
      onSaved?.(editing)
    } else {
      const b = addBatch(f)
      onSaved?.(b)
    }
    onClose()
  }

  const err = (k) => tried && errors[k] && <span className="block text-loss font-semibold text-sm mt-1">{errors[k]}</span>

  return (
    <Sheet
      open={open}
      onClose={onClose}
      wide
      title={editing ? 'ແກ້ໄຂລັອດ' : 'ຮັບຂອງເຂົ້າ (ລັອດໃໝ່)'}
      footer={
        <Button size="xl" className="w-full" onClick={save}>
          {editing ? 'ບັນທຶກການແກ້ໄຂ' : 'ບັນທຶກລັອດ'}
        </Button>
      }
    >
      <div className="grid md:grid-cols-2 gap-x-5 gap-y-4">
        <div className="md:col-span-2">
          <Field label="ຊື່ສິນຄ້າ">
            <TextInput value={f.productName} onChange={(e) => set('productName')(e.target.value)} placeholder="ເຊັ່ນ ຊີ້ນງົວສົດ, ສະບູ່ສະໝຸນໄພ" />
          </Field>
          {err('productName')}
          {!editing && recent.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {recent.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setF((x) => ({ ...x, productName: b.productName, unit: b.unit, sellPrice: b.sellPrice }))}
                  className="min-h-[2.5rem] px-3 rounded-lg bg-brand-soft text-brand font-semibold active:bg-[#d2dfee]"
                >
                  {b.productName}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="md:col-span-2">
          <span className="block text-[0.95rem] font-semibold text-ink-soft mb-1">ຂາຍເປັນ</span>
          <Segmented value={f.unit} onChange={set('unit')} options={UNITS.map((x) => ({ value: x.key, label: x.label }))} />
        </div>

        <Field label="ວັນທີຮັບຂອງ">
          <DateInput value={f.receivedAt} max={todayKey()} onChange={(e) => set('receivedAt')(e.target.value || todayKey())} />
        </Field>

        <div>
          <Field label={`ຈຳນວນທີ່ຮັບມາ (${u.label})`}>
            <QtyInput value={f.qtyIn} onChange={set('qtyIn')} suffix={u.short} decimals={u.decimals} placeholder={u.decimals ? '0.0' : '0'} />
          </Field>
          {err('qtyIn')}
        </div>

        <Field label="ຕົ້ນທຶນລວມທີ່ຈ່າຍໄປ" hint="ລວມທັງລັອດ (ຄ່າຂົນສົ່ງ ໃສ່ໃນໜ້າ ຄ່າໃຊ້ຈ່າຍ ແລ້ວຜູກກັບລັອດນີ້ໄດ້)">
          <MoneyInput value={f.totalCost} onChange={set('totalCost')} placeholder="0" />
        </Field>

        <div>
          <Field label={`ລາຄາຂາຍ ຕໍ່${u.label}`}>
            <MoneyInput value={f.sellPrice} onChange={set('sellPrice')} placeholder="0" />
          </Field>
          {err('sellPrice')}
          {plan.avg > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {markups.map((m) => (
                <button
                  key={m.p}
                  type="button"
                  onClick={() => set('sellPrice')(m.price)}
                  className={cx(
                    'num min-h-[2.5rem] px-3 rounded-lg font-semibold border-2',
                    f.sellPrice === m.price ? 'border-brand bg-brand text-white' : 'border-line bg-card active:bg-line-soft',
                  )}
                >
                  ບວກ {m.p}% = {money(m.price)}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="md:col-span-2">
          <Field label="ໝາຍເຫດ (ບໍ່ບັງຄັບ)">
            <TextInput value={f.note} onChange={(e) => set('note')(e.target.value)} placeholder="ເຊັ່ນ ຮັບຈາກເຈົ້າໃດ, ເກຣດສິນຄ້າ" />
          </Field>
        </div>
      </div>

      {/* live maths */}
      <div className="mt-6 rounded-2xl bg-card border-2 border-line p-4">
        <div className="flex flex-wrap items-end gap-x-8 gap-y-3">
          <div>
            <div className="text-ink-soft">ຕົ້ນທຶນສະເລ່ຍ ຕໍ່{u.label}</div>
            <div className="num text-[2.2rem] font-bold leading-tight">
              {money(plan.avg)} <span className="text-lg text-ink-faint">ກີບ</span>
            </div>
          </div>
          {f.sellPrice > 0 && plan.avg > 0 && (
            <div>
              <div className="text-ink-soft">ກຳໄລ ຕໍ່{u.label}</div>
              <div className={cx('num text-[1.7rem] font-bold leading-tight', plan.marginPerUnit > 0 ? 'text-gain' : 'text-loss')}>
                {plan.marginPerUnit >= 0 ? '+' : '−'}
                {money(Math.abs(plan.marginPerUnit))}
                <span className="text-lg ml-2">({Math.round(plan.marginPct * 100)}%)</span>
              </div>
            </div>
          )}
        </div>
        {f.sellPrice > 0 && f.qtyIn > 0 && (
          <div className="mt-3 pt-3 border-t border-line-soft text-[1.05rem] leading-relaxed">
            {plan.marginPerUnit <= 0 ? (
              <p className="text-loss font-bold">ລາຄາຂາຍຕ່ຳກວ່າຕົ້ນທຶນ — ຂາຍໝົດກໍ່ຍັງຂາດທຶນ</p>
            ) : (
              <p>
                ຕ້ອງຂາຍໃຫ້ໄດ້{' '}
                <b className="num">
                  {qtyText(ceilQty(plan.breakEvenQty, u.decimals), u.decimals)} {u.short}
                </b>{' '}
                ຈຶ່ງຄືນທຶນ. ຂາຍໝົດ {qtyText(f.qtyIn, u.decimals)} {u.short} ຈະໄດ້ເງິນ <b className="num">{money(plan.fullRevenue)}</b> ກີບ, ກຳໄລ{' '}
                <b className="num text-gain">{money(plan.fullProfit)}</b> ກີບ.
              </p>
            )}
          </div>
        )}
        {editing && (
          <p className="mt-3 text-sm text-ink-soft">ການແກ້ຕົ້ນທຶນ ຈະຄິດກຳໄລຂອງລັອດນີ້ຄືນໃໝ່; ລາຍການທີ່ຂາຍໄປແລ້ວຍັງເກັບລາຄາເດີມ.</p>
        )}
      </div>
    </Sheet>
  )
}
