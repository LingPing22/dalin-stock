import { useState } from 'react'
import { Lock, ShieldCheck, UserRound, KeyRound } from 'lucide-react'
import {
  useSecurity,
  pinEnabled,
  checkNewPin,
  verifyOwnerPin,
  setOwnerPin,
  setStaffPin,
  removeStaffPin,
  disablePin,
  setAutoLock,
  lockNow,
  AUTO_LOCK_CHOICES,
} from '../lib/security.js'
import { Button, Sheet, Field, Segmented, cx } from './ui.jsx'
import { useDialogs } from './Dialogs.jsx'

const SHEETS = {
  setOwner: { title: 'ຕັ້ງ PIN ເຈົ້າຂອງ', current: false, next: true, ok: 'ເປີດການລັອກ' },
  changeOwner: { title: 'ປ່ຽນ PIN ເຈົ້າຂອງ', current: true, next: true, ok: 'ບັນທຶກ PIN ໃໝ່' },
  setStaff: { title: 'ຕັ້ງ PIN ພະນັກງານ', current: false, next: true, ok: 'ບັນທຶກ PIN ພະນັກງານ' },
  disable: { title: 'ປິດການລັອກແອັບ', current: true, next: false, ok: 'ປິດການລັອກ', danger: true },
}

function PinInput({ value, onChange, autoFocus }) {
  return (
    <input
      type="password"
      inputMode="numeric"
      pattern="[0-9]*"
      autoComplete="off"
      maxLength={6}
      autoFocus={autoFocus}
      value={value}
      onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
      className="num w-full min-h-[3.5rem] rounded-xl border-2 border-line bg-card px-4 text-2xl tracking-[0.5em] outline-none focus:border-brand"
    />
  )
}

export function SecuritySettings() {
  const s = useSecurity()
  const { toast } = useDialogs()
  const [sheet, setSheet] = useState(null)
  const [cur, setCur] = useState('')
  const [p1, setP1] = useState('')
  const [p2, setP2] = useState('')
  const [err, setErr] = useState('')
  const enabled = pinEnabled(s)
  const hasStaff = !!s.config.staff
  const conf = sheet && SHEETS[sheet]

  const open = (k) => {
    setCur('')
    setP1('')
    setP2('')
    setErr('')
    setSheet(k)
  }

  const save = async () => {
    if (conf.current && !verifyOwnerPin(cur)) return setErr('PIN ເຈົ້າຂອງປັດຈຸບັນບໍ່ຖືກ')
    if (conf.next) {
      const e = checkNewPin(p1, p2, sheet === 'setStaff' ? { notSameAs: s.config.owner } : {})
      if (e) return setErr(e)
    }
    if (sheet === 'setOwner' || sheet === 'changeOwner') await setOwnerPin(p1)
    if (sheet === 'setStaff') await setStaffPin(p1)
    if (sheet === 'disable') await disablePin()
    setSheet(null)
    toast(
      {
        setOwner: 'ເປີດການລັອກແລ້ວ — ຈື່ PIN ໄວ້ໃຫ້ດີ',
        changeOwner: 'ປ່ຽນ PIN ເຈົ້າຂອງແລ້ວ',
        setStaff: 'ບັນທຶກ PIN ພະນັກງານແລ້ວ',
        disable: 'ປິດການລັອກແລ້ວ',
      }[sheet],
    )
  }

  return (
    <div className="rounded-2xl bg-card border border-line p-4">
      {!enabled ? (
        <>
          <p className="mb-1">
            ຕອນນີ້ <b className="text-loss">ຍັງບໍ່ໄດ້ລັອກ</b> — ໃຜຈັບ iPad ກໍ່ເປີດເບິ່ງຕົ້ນທຶນ, ກຳໄລ ແລະ ລຶບຂໍ້ມູນໄດ້.
          </p>
          <ul className="list-disc pl-6 text-ink-soft mb-4">
            <li>ເປີດແອັບຕ້ອງໃສ່ PIN 4–6 ຕົວ</li>
            <li>
              <b className="text-ink">ເຈົ້າຂອງ</b> ເຂົ້າໄດ້ທຸກໜ້າ; <b className="text-ink">ພະນັກງານ</b> ເຂົ້າໄດ້ແຕ່ໜ້າຂາຍ ບໍ່ເຫັນຕົ້ນທຶນ ແລະ ກຳໄລ
            </li>
            <li>ລັອກເອງເມື່ອບໍ່ໄດ້ໃຊ້; ໃສ່ຜິດ 5 ເທື່ອ ລັອກ 1 ນາທີ</li>
          </ul>
          <Button onClick={() => open('setOwner')}>
            <Lock size={22} /> ຕັ້ງ PIN ເຈົ້າຂອງ
          </Button>
        </>
      ) : (
        <div className="space-y-4">
          <p className="flex items-center gap-2 font-semibold text-gain">
            <ShieldCheck size={24} /> ລັອກແອັບດ້ວຍ PIN ເປີດຢູ່
          </p>

          <Row icon={<KeyRound size={22} />} title="PIN ເຈົ້າຂອງ" sub="ເຂົ້າໄດ້ທຸກໜ້າ">
            <Button size="md" variant="secondary" onClick={() => open('changeOwner')}>
              ປ່ຽນ
            </Button>
          </Row>

          <Row
            icon={<UserRound size={22} />}
            title="PIN ພະນັກງານ"
            sub={hasStaff ? 'ຕັ້ງແລ້ວ — ເຂົ້າໄດ້ແຕ່ໜ້າຂາຍ' : 'ຍັງບໍ່ໄດ້ຕັ້ງ'}
          >
            <Button size="md" variant="secondary" onClick={() => open('setStaff')}>
              {hasStaff ? 'ປ່ຽນ' : 'ຕັ້ງ'}
            </Button>
            {hasStaff && (
              <Button
                size="md"
                variant="ghost"
                className="text-loss"
                onClick={async () => {
                  await removeStaffPin()
                  toast('ລຶບ PIN ພະນັກງານແລ້ວ')
                }}
              >
                ລຶບ
              </Button>
            )}
          </Row>

          <div>
            <span className="block text-[0.95rem] font-semibold text-ink-soft mb-1">ລັອກເອງເມື່ອບໍ່ໄດ້ແຕະໜ້າຈໍ</span>
            <Segmented
              value={s.config.autoLockMin}
              onChange={(v) => setAutoLock(v)}
              options={AUTO_LOCK_CHOICES.map((m) => ({ value: m, label: `${m} ນາທີ` }))}
            />
          </div>

          <div className="flex flex-wrap gap-3 pt-1">
            <Button onClick={lockNow}>
              <Lock size={22} /> ລັອກດຽວນີ້
            </Button>
            <Button variant="ghost" className="text-loss" onClick={() => open('disable')}>
              ປິດການລັອກ
            </Button>
          </div>
          <p className="text-sm text-ink-faint">
            PIN ບໍ່ໄດ້ຢູ່ໃນໄຟລ໌ສຳຮອງ. ຖ້າເຈົ້າຂອງລືມ PIN ຕ້ອງລຶບແອັບແລ້ວກູ້ຄືນຈາກໄຟລ໌ສຳຮອງ — ສະນັ້ນສຳຮອງຂໍ້ມູນເປັນປະຈຳ.
          </p>
        </div>
      )}

      <Sheet
        open={!!sheet}
        onClose={() => setSheet(null)}
        title={conf?.title || ''}
        footer={
          <Button variant={conf?.danger ? 'danger' : 'primary'} className="w-full" onClick={save}>
            {conf?.ok}
          </Button>
        }
      >
        {conf && (
          <div className="space-y-4">
            {sheet === 'setStaff' && <p className="text-ink-soft">ພະນັກງານໃຊ້ PIN ນີ້ເຂົ້າໜ້າຂາຍ. ຕ້ອງບໍ່ຊ້ຳກັບ PIN ເຈົ້າຂອງ.</p>}
            {sheet === 'setOwner' && <p className="text-ink-soft">ເລືອກຕົວເລກ 4–6 ຕົວທີ່ຈື່ໄດ້ ແຕ່ຄົນອື່ນເດົາບໍ່ໄດ້ (ບໍ່ແມ່ນ 1234, ວັນເກີດ).</p>}
            {conf.current && (
              <Field label="PIN ເຈົ້າຂອງປັດຈຸບັນ">
                <PinInput value={cur} onChange={setCur} autoFocus />
              </Field>
            )}
            {conf.next && (
              <>
                <Field label="PIN ໃໝ່ (4–6 ຕົວເລກ)">
                  <PinInput value={p1} onChange={setP1} autoFocus={!conf.current} />
                </Field>
                <Field label="ໃສ່ PIN ໃໝ່ອີກເທື່ອ">
                  <PinInput value={p2} onChange={setP2} />
                </Field>
              </>
            )}
            {err && <p className={cx('font-semibold text-loss')} role="alert">{err}</p>}
          </div>
        )}
      </Sheet>
    </div>
  )
}

function Row({ icon, title, sub, children }) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-line-soft px-3 py-2">
      <span className="text-ink-soft">{icon}</span>
      <span className="flex-1 min-w-[9rem]">
        <span className="block font-semibold">{title}</span>
        <span className="block text-sm text-ink-soft">{sub}</span>
      </span>
      {children}
    </div>
  )
}
