import { useMemo, useState } from 'react'
import { Trash2, Plus } from 'lucide-react'
import { useAppState, addExpense, deleteExpense } from '../lib/store.js'
import { EXPENSE_CATEGORIES } from '../lib/units.js'
import { money, kip, todayKey, dateRelative, dateShort } from '../lib/format.js'
import { Button, IconButton, Field, TextInput, DateInput, MoneyInput, Select, Section, cx } from '../components/ui.jsx'
import { useDialogs } from '../components/Dialogs.jsx'

export default function ExpensesPage() {
  const state = useAppState()
  const { toast, confirm } = useDialogs()
  const [amount, setAmount] = useState(0)
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0])
  const [day, setDay] = useState(todayKey())
  const [batchId, setBatchId] = useState('')
  const [note, setNote] = useState('')

  const byId = new Map(state.batches.map((b) => [b.id, b]))
  const lotOptions = state.batches.filter((b) => !b.closed || b.id === batchId)

  const groups = useMemo(() => {
    const m = new Map()
    for (const e of [...state.expenses].sort((a, b) => b.day.localeCompare(a.day) || b.createdAt - a.createdAt)) {
      if (!m.has(e.day)) m.set(e.day, [])
      m.get(e.day).push(e)
    }
    return [...m.entries()].slice(0, 30)
  }, [state.expenses])

  const save = () => {
    if (!(amount > 0)) {
      toast('ໃສ່ຈຳນວນເງິນກ່ອນ', { tone: 'warn' })
      return
    }
    addExpense({ day, category, amount, note, batchId: batchId || null })
    toast(`ບັນທຶກຄ່າໃຊ້ຈ່າຍແລ້ວ ${kip(amount)}`)
    setAmount(0)
    setNote('')
  }

  const remove = async (e) => {
    const ok = await confirm({ title: 'ລຶບຄ່າໃຊ້ຈ່າຍນີ້?', message: `${e.category} ${kip(e.amount)}`, confirmText: 'ລຶບ', danger: true })
    if (ok) deleteExpense(e.id)
  }

  return (
    <div className="md:grid md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:gap-6 md:items-start">
      <Section title="ບັນທຶກຄ່າໃຊ້ຈ່າຍຍ່ອຍ">
        <div className="rounded-2xl bg-card border border-line p-4 space-y-4">
          <Field label="ຈຳນວນເງິນ">
            <MoneyInput value={amount} onChange={setAmount} placeholder="0" />
          </Field>
          <div>
            <span className="block text-[0.95rem] font-semibold text-ink-soft mb-1">ປະເພດ</span>
            <div className="flex flex-wrap gap-2">
              {EXPENSE_CATEGORIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-pressed={c === category}
                  onClick={() => setCategory(c)}
                  className={cx(
                    'min-h-[3rem] px-4 rounded-xl border-2 font-semibold',
                    c === category ? 'border-brand bg-brand text-white' : 'border-line bg-card active:bg-line-soft',
                  )}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="ວັນທີ">
              <DateInput value={day} max={todayKey()} onChange={(e) => setDay(e.target.value || todayKey())} />
            </Field>
            <Field label="ຂອງລັອດໃດ (ບໍ່ບັງຄັບ)">
              <Select value={batchId} onChange={(e) => setBatchId(e.target.value)}>
                <option value="">ຄ່າໃຊ້ຈ່າຍທົ່ວໄປ</option>
                {lotOptions.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.productName} ({dateShort(b.receivedAt)})
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <p className="text-sm text-ink-faint -mt-2">
            ຜູກກັບລັອດ = ນັບເຂົ້າໃນທຶນທີ່ຕ້ອງເອົາຄືນຂອງລັອດນັ້ນ (ເຊັ່ນ ຄ່າຂົນສົ່ງລັອດນີ້)
          </p>
          <Field label="ໝາຍເຫດ (ບໍ່ບັງຄັບ)">
            <TextInput value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>
          <Button size="xl" className="w-full" onClick={save}>
            <Plus size={26} /> ບັນທຶກຄ່າໃຊ້ຈ່າຍ
          </Button>
        </div>
      </Section>

      <Section title="ລາຍການຄ່າໃຊ້ຈ່າຍ">
        {groups.length === 0 ? (
          <p className="text-ink-soft py-6 text-center rounded-2xl border-2 border-dashed border-line">ຍັງບໍ່ມີຄ່າໃຊ້ຈ່າຍ</p>
        ) : (
          <div className="space-y-4">
            {groups.map(([k, items]) => (
              <div key={k}>
                <div className="flex justify-between items-baseline mb-1 px-1">
                  <span className="font-bold">{dateRelative(k)}</span>
                  <span className="num font-bold">{kip(items.reduce((s, e) => s + e.amount, 0))}</span>
                </div>
                <ul className="rounded-2xl bg-card border border-line divide-y divide-line-soft">
                  {items.map((e) => {
                    const b = e.batchId ? byId.get(e.batchId) : null
                    return (
                      <li key={e.id} className="flex items-center gap-3 pl-4 pr-1 py-1.5">
                        <span className="flex-1 min-w-0">
                          <span className="block font-semibold">{e.category}</span>
                          {(b || e.note) && (
                            <span className="block text-sm text-ink-soft truncate">
                              {b && `ລັອດ: ${b.productName}`}
                              {b && e.note && ' — '}
                              {e.note}
                            </span>
                          )}
                        </span>
                        <span className="num font-bold">{money(e.amount)}</span>
                        <IconButton label="ລຶບ" onClick={() => remove(e)}>
                          <Trash2 size={20} />
                        </IconButton>
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  )
}
