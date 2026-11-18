import { useEffect, useRef, useState } from 'react'
import { Download, Share2, Upload, FileSpreadsheet, Sparkles, Trash2 } from 'lucide-react'
import { useAppState, updateSettings, markBackup, replaceAll, clearDemo, loadDemo, resetAll, hasDemo } from '../lib/store.js'
import {
  makeBackupJSON,
  backupFileName,
  parseBackup,
  movesCSV,
  lotsCSV,
  expensesCSV,
  canShareFiles,
  downloadText,
  shareText,
} from '../lib/backup.js'
import { storageInfo, storageMode } from '../lib/storage.js'
import { todayKey, dayKey, dateLong, daysBetween } from '../lib/format.js'
import { Button, Field, TextInput, Segmented, Section } from '../components/ui.jsx'
import { SecuritySettings } from '../components/SecuritySettings.jsx'
import { useDialogs } from '../components/Dialogs.jsx'

export default function SettingsPage() {
  const state = useAppState()
  const { toast, confirm } = useDialogs()
  const [name, setName] = useState(state.settings.shopName)
  const [info, setInfo] = useState(null)
  const fileRef = useRef(null)
  const share = canShareFiles()
  const demo = hasDemo()

  useEffect(() => setName(state.settings.shopName), [state.settings.shopName])
  useEffect(() => {
    storageInfo().then(setInfo)
  }, [state])

  const backup = async (how) => {
    const text = makeBackupJSON(state)
    const res = how === 'share' ? await shareText(backupFileName(), text, 'application/json') : downloadText(backupFileName(), text, 'application/json')
    if (res !== 'cancelled') {
      markBackup()
      toast('ສຳຮອງຂໍ້ມູນແລ້ວ — ເກັບໄຟລ໌ໄວ້ບ່ອນປອດໄພ')
    }
  }

  const csv = (kind) => {
    const map = { moves: ['ລາຍການຂາຍ-ຂອງເສຍ', movesCSV], lots: ['ລັອດສິນຄ້າ', lotsCSV], expenses: ['ຄ່າໃຊ້ຈ່າຍ', expensesCSV] }
    const [label, fn] = map[kind]
    const fname = `dalin-stock-${label}-${todayKey()}.csv`
    const text = fn(state)
    if (share) shareText(fname, text, 'text/csv')
    else downloadText(fname, text, 'text/csv')
  }

  const onPickFile = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const { data, summary } = parseBackup(await file.text())
      const ok = await confirm({
        title: 'ກູ້ຄືນຂໍ້ມູນຈາກໄຟລ໌ນີ້?',
        message: (
          <div>
            <p className="mb-2">
              ໄຟລ໌: <b>{file.name}</b>
            </p>
            <ul className="list-disc pl-6 mb-3">
              <li>ຮ້ານ: {summary.shopName}</li>
              {summary.exportedAt && <li>ສຳຮອງເມື່ອ: {dateLong(dayKey(new Date(summary.exportedAt)))}</li>}
              <li>
                ລັອດ {summary.batches}, ລາຍການຂາຍ/ຂອງເສຍ {summary.moves}, ຄ່າໃຊ້ຈ່າຍ {summary.expenses}
              </li>
            </ul>
            <p className="text-loss font-semibold">ຂໍ້ມູນທີ່ຢູ່ໃນເຄື່ອງນີ້ຕອນນີ້ ຈະຖືກແທນທີ່ທັງໝົດ.</p>
          </div>
        ),
        confirmText: 'ກູ້ຄືນ',
        danger: true,
      })
      if (ok) {
        replaceAll(data)
        toast('ກູ້ຄືນຂໍ້ມູນແລ້ວ')
      }
    } catch (err) {
      toast(err.message || 'ອ່ານໄຟລ໌ບໍ່ໄດ້', { tone: 'warn', ms: 7000 })
    }
  }

  const doClearDemo = async () => {
    const ok = await confirm({
      title: 'ລ້າງຂໍ້ມູນຕົວຢ່າງ?',
      message: 'ລັອດ, ລາຍການຂາຍ ແລະ ຄ່າໃຊ້ຈ່າຍ ທີ່ເປັນຕົວຢ່າງຈະຖືກລຶບອອກ. ຂໍ້ມູນທີ່ທ່ານບັນທຶກເອງຈະຍັງຢູ່.',
      confirmText: 'ລ້າງ ແລະ ເລີ່ມໃຊ້ຈິງ',
    })
    if (ok) {
      clearDemo()
      toast('ພ້ອມໃຊ້ຈິງແລ້ວ — ເລີ່ມຈາກ “ຮັບຂອງເຂົ້າ” ໃນໜ້າ ລັອດສິນຄ້າ')
    }
  }

  const doReset = async () => {
    const ok = await confirm({
      title: 'ລຶບຂໍ້ມູນທັງໝົດໃນເຄື່ອງນີ້?',
      message: 'ລັອດ, ການຂາຍ, ຄ່າໃຊ້ຈ່າຍ ທັງໝົດຈະຫາຍໄປ ແລະ ເອົາຄືນບໍ່ໄດ້ ຖ້າບໍ່ມີໄຟລ໌ສຳຮອງ.',
      confirmText: 'ລຶບທັງໝົດ',
      danger: true,
      requireText: 'ລຶບ',
    })
    if (ok) {
      await resetAll()
      toast('ລຶບຂໍ້ມູນທັງໝົດແລ້ວ')
    }
  }

  const last = state.meta.lastBackupAt
  const lastDays = last ? daysBetween(dayKey(new Date(last)), todayKey()) : null

  return (
    <div className="max-w-3xl">
      <Section title="ລັອກແອັບດ້ວຍ PIN">
        <SecuritySettings />
      </Section>

      <Section title="ຂໍ້ມູນຮ້ານ">
        <div className="rounded-2xl bg-card border border-line p-4 space-y-4">
          <Field label="ຊື່ຮ້ານ">
            <TextInput
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => name.trim() && name !== state.settings.shopName && updateSettings({ shopName: name.trim() })}
            />
          </Field>
          <div>
            <span className="block text-[0.95rem] font-semibold text-ink-soft mb-1">ປັດເສດຍອດເງິນເວລາຂາຍ (ຊັ່ງນ້ຳໜັກ)</span>
            <Segmented
              value={state.settings.rounding}
              onChange={(v) => updateSettings({ rounding: v })}
              options={[
                { value: 0, label: 'ບໍ່ປັດ' },
                { value: 100, label: '100' },
                { value: 500, label: '500' },
                { value: 1000, label: '1,000' },
              ]}
            />
            <p className="text-sm text-ink-faint mt-1">ເຊັ່ນ 2.37 ກກ. × 45,000 = 106,650 → ປັດເປັນ 106,500 ກີບ</p>
          </div>
        </div>
      </Section>

      <Section title="ສຳຮອງ ແລະ ກູ້ຄືນຂໍ້ມູນ">
        <div className="rounded-2xl bg-card border border-line p-4">
          <p className="mb-1">
            ຂໍ້ມູນທັງໝົດເກັບຢູ່ໃນເຄື່ອງນີ້ເທົ່ານັ້ນ. ຖ້າເຄື່ອງເສຍ ຫຼື ລຶບແອັບ ຂໍ້ມູນຈະຫາຍ — ສຳຮອງເປັນໄຟລ໌ຢ່າງໜ້ອຍອາທິດລະເທື່ອ.
          </p>
          <p className={lastDays == null || lastDays > 7 ? 'text-loss font-semibold mb-4' : 'text-gain font-semibold mb-4'}>
            {last ? `ສຳຮອງຫຼ້າສຸດ: ${dateLong(dayKey(new Date(last)))}` : 'ຍັງບໍ່ເຄີຍສຳຮອງ'}
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            <Button onClick={() => backup('download')}>
              <Download size={24} /> ດາວໂຫຼດໄຟລ໌ສຳຮອງ
            </Button>
            {share && (
              <Button variant="soft" onClick={() => backup('share')}>
                <Share2 size={24} /> ສົ່ງໄຟລ໌ສຳຮອງ (LINE, Drive…)
              </Button>
            )}
            <Button variant="secondary" onClick={() => fileRef.current?.click()}>
              <Upload size={24} /> ກູ້ຄືນຈາກໄຟລ໌ (.json)
            </Button>
          </div>
          <input ref={fileRef} type="file" accept=".json,application/json" className="hidden" onChange={onPickFile} />
          <p className="text-sm text-ink-faint mt-3">ຍ້າຍໄປເຄື່ອງໃໝ່: ສຳຮອງໃນເຄື່ອງເກົ່າ → ສົ່ງໄຟລ໌ໄປເຄື່ອງໃໝ່ → ກົດ “ກູ້ຄືນຈາກໄຟລ໌”.</p>
        </div>
      </Section>

      <Section title="ສົ່ງອອກໄປເປີດໃນ Excel / Google Sheets (CSV)">
        <div className="grid sm:grid-cols-3 gap-3">
          <Button variant="secondary" size="md" onClick={() => csv('moves')}>
            <FileSpreadsheet size={22} /> ລາຍການຂາຍ
          </Button>
          <Button variant="secondary" size="md" onClick={() => csv('lots')}>
            <FileSpreadsheet size={22} /> ລັອດສິນຄ້າ
          </Button>
          <Button variant="secondary" size="md" onClick={() => csv('expenses')}>
            <FileSpreadsheet size={22} /> ຄ່າໃຊ້ຈ່າຍ
          </Button>
        </div>
        <p className="text-sm text-ink-faint mt-2">ໄຟລ໌ CSV ໃຊ້ເບິ່ງ ຫຼື ສົ່ງໃຫ້ຄົນອື່ນ. ການກູ້ຄືນຂໍ້ມູນໃຊ້ໄຟລ໌ສຳຮອງ (.json).</p>
      </Section>

      <Section title="ຂໍ້ມູນຕົວຢ່າງ">
        <div className="rounded-2xl bg-card border border-line p-4">
          {demo ? (
            <>
              <p className="mb-3">ຕອນນີ້ມີຂໍ້ມູນຕົວຢ່າງຢູ່ (ມີປ້າຍ “ຕົວຢ່າງ”). ລ້າງອອກເມື່ອພ້ອມໃຊ້ຈິງ.</p>
              <Button variant="danger" onClick={doClearDemo}>
                <Trash2 size={22} /> ລ້າງຂໍ້ມູນຕົວຢ່າງ ເພື່ອເລີ່ມໃຊ້ຈິງ
              </Button>
            </>
          ) : (
            <>
              <p className="mb-3">ຢາກລອງເບິ່ງວິທີໃຊ້? ໃສ່ຂໍ້ມູນຕົວຢ່າງຄືນໄດ້ ໂດຍບໍ່ກະທົບຂໍ້ມູນຈິງ.</p>
              <Button variant="secondary" onClick={() => loadDemo()}>
                <Sparkles size={22} /> ໃສ່ຂໍ້ມູນຕົວຢ່າງ
              </Button>
            </>
          )}
        </div>
      </Section>

      <Section title="ຕິດຕັ້ງເປັນແອັບເທິງ iPad / iPhone">
        <div className="rounded-2xl bg-card border border-line p-4">
          <ol className="list-decimal pl-6 space-y-1 mb-3">
            <li>ເປີດລິ້ງນີ້ດ້ວຍ Safari</li>
            <li>ແຕະປຸ່ມ ແບ່ງປັນ (ສີ່ຫຼ່ຽມມີລູກສອນຂຶ້ນ)</li>
            <li>ເລືອກ “Add to Home Screen / ເພີ່ມໃສ່ໜ້າຈໍໂຮມ” ແລ້ວແຕະ Add</li>
            <li>ເປີດແອັບຈາກໄອຄອນທຸກເທື່ອ — ໃຊ້ໄດ້ເຖິງບໍ່ມີເນັດ</li>
          </ol>
          <p className="text-loss font-semibold">
            ສຳຄັນ: ເທິງ iPhone/iPad ຂໍ້ມູນໃນ Safari ກັບໃນແອັບທີ່ເພີ່ມໃສ່ໜ້າຈໍ ແມ່ນແຍກກັນ. ໃຫ້ບັນທຶກຜ່ານໄອຄອນແອັບບ່ອນດຽວ.
          </p>
          <p className="text-sm text-ink-faint mt-2">Android (Chrome): ແຕະ ⋮ → “Install app / ຕິດຕັ້ງແອັບ”.</p>
        </div>
      </Section>

      <Section title="ບ່ອນເກັບຂໍ້ມູນ">
        <div className="rounded-2xl bg-card border border-line p-4 text-ink-soft space-y-1">
          <p>
            ເກັບໃນເຄື່ອງດ້ວຍ <b className="text-ink">{storageMode()}</b>
            {info?.usage ? `, ໃຊ້ໄປ ${(info.usage / 1024 / 1024).toFixed(2)} MB` : ''}
          </p>
          <p>
            {info?.persisted
              ? 'ເຄື່ອງອະນຸຍາດໃຫ້ເກັບຂໍ້ມູນຖາວອນແລ້ວ'
              : 'ເຄື່ອງອາດລຶບຂໍ້ມູນຖ້າພື້ນທີ່ເຕັມ — ຕິດຕັ້ງເປັນແອັບ ແລະ ສຳຮອງເປັນປະຈຳ'}
          </p>
          <p>
            ລັອດ {state.batches.length}, ລາຍການຂາຍ/ຂອງເສຍ {state.moves.length}, ຄ່າໃຊ້ຈ່າຍ {state.expenses.length}
          </p>
        </div>
      </Section>

      <Section title="ລຶບຂໍ້ມູນທັງໝົດ">
        <Button variant="secondary" className="text-loss border-loss" onClick={doReset}>
          <Trash2 size={22} /> ລຶບຂໍ້ມູນທັງໝົດໃນເຄື່ອງນີ້
        </Button>
      </Section>
      <p className="text-sm text-ink-faint">Dalin Stock v1.0 — ເຮັດວຽກແບບອອບລາຍ, ບໍ່ສົ່ງຂໍ້ມູນອອກຈາກເຄື່ອງ</p>
    </div>
  )
}
