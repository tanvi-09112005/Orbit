import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { Plus, ChevronLeft, Pencil, Trash2, ArrowRight, Upload, FileText, Check, X, Loader } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'
import { useFamilyStore } from '../../stores/familyStore'
import { useUIStore } from '../../stores/uiStore'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import Skeleton from '../../components/ui/Skeleton'
import BottomSheet from '../../components/ui/BottomSheet'
import Input from '../../components/ui/Input'

// ── Client-side text extraction ───────────────────────────────
async function extractTextFromFile(file){
  if (file.type === 'application/pdf') {
    // For digital PDFs: read raw text content
    try {
      const arrayBuffer = await file.arrayBuffer()
      const bytes = new Uint8Array(arrayBuffer)
      const decoder = new TextDecoder('latin1')
      const raw = decoder.decode(bytes)
      // Extract readable strings from PDF structure
      const textMatches = raw.match(/\(([^)]{2,})\)/g) || []
      const text = textMatches
        .map(m => m.slice(1, -1))
        .filter(t => /[a-zA-Z]{2,}/.test(t) && !/^[^\x20-\x7E]/.test(t))
        .join(' ')
        .replace(/[^\x20-\x7E\n]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 5000)
      if (text.length > 100) return text
    } catch {
      // fall through to Tesseract
    }
  }

  // For images (and scanned PDFs that yielded no text): use Tesseract OCR
  try {
    const { createWorker } = await import('tesseract.js')
    const worker = await createWorker('eng')
    const imageUrl = URL.createObjectURL(file)
    const { data } = await worker.recognize(imageUrl)
    URL.revokeObjectURL(imageUrl)
    await worker.terminate()
    return (data.text || '').slice(0, 5000)
  } catch (err) {
    console.error('OCR failed:', err)
    return ''
  }
}

export default function SchoolPage() {
  const { childId } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const { children, family } = useFamilyStore()
  const { addToast } = useUIStore()
  const child = children.find((c) => c.id === childId)
  const [activeTab, setActiveTab] = useState('homework')

  // Add sheets
  const [homeworkSheet, setHomeworkSheet] = useState(false)
  const [examSheet, setExamSheet] = useState(false)
  const [ptmSheet, setPtmSheet] = useState(false)

  // Edit sheets
  const [editingHw, setEditingHw] = useState(null)
  const [editingExam, setEditingExam] = useState(null)
  const [editingPtm, setEditingPtm] = useState(null)

  // Notices state
  const [uploading, setUploading] = useState(false)
 const [uploadStep, setUploadStep] = useState(null)
  const [parsedItems, setParsedItems] = useState(null)
  const [selectedItems, setSelectedItems] = useState(new Set())
  const [addingItems, setAddingItems] = useState(false)
  const [currentNoticeId, setCurrentNoticeId] = useState(null)

  // Form state
  const [hwSubject, setHwSubject] = useState('')
  const [hwDesc, setHwDesc] = useState('')
  const [hwDue, setHwDue] = useState('')
  const [examSubject, setExamSubject] = useState('')
  const [examDate, setExamDate] = useState('')
  const [examNotes, setExamNotes] = useState('')
  const [ptmTeacher, setPtmTeacher] = useState('')
  const [ptmDate, setPtmDate] = useState('')
  const [ptmNotes, setPtmNotes] = useState('')

  const tabs = [
    { id: 'homework', label: 'Homework' },
    { id: 'exams', label: 'Exams' },
    { id: 'ptms', label: 'PTMs' },
    { id: 'notices', label: 'Notices' },
  ]

  // ── HOMEWORK ──────────────────────────────────────────────
  const { data: homework = [], isLoading: hwLoading } = useQuery({
    queryKey: ['homework', childId],
    enabled: !!childId,
    queryFn: async () => {
      const { data, error } = await supabase.from('homework').select('*').eq('child_id', childId).order('due_date')
      if (error) throw error
      return data
    },
  })

  const addHomework = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('homework').insert([{
        child_id: childId, subject: hwSubject.trim(), description: hwDesc.trim(), due_date: hwDue || null, done: false,
      }])
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['homework', childId] })
      queryClient.invalidateQueries({ queryKey: ['homework', 'count', childId] })
      setHwSubject(''); setHwDesc(''); setHwDue(''); setHomeworkSheet(false)
    },
  })

  const updateHomework = useMutation({
    mutationFn: async ({ id, subject, description, due_date }) => {
      const { error } = await supabase.from('homework').update({ subject, description, due_date: due_date || null }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['homework', childId] }); setEditingHw(null) },
  })

  const deleteHomework = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('homework').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['homework', childId] })
      queryClient.invalidateQueries({ queryKey: ['homework', 'count', childId] })
    },
  })

  const toggleHomework = useMutation({
    mutationFn: async ({ id, done }) => {
      const { error } = await supabase.from('homework').update({ done: !done }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['homework', childId] })
      queryClient.invalidateQueries({ queryKey: ['homework', 'count', childId] })
    },
  })

  // ── EXAMS ──────────────────────────────────────────────────
  const { data: exams = [], isLoading: examsLoading } = useQuery({
    queryKey: ['exams', childId],
    enabled: !!childId,
    queryFn: async () => {
      const { data, error } = await supabase.from('exams').select('*').eq('child_id', childId).order('exam_date')
      if (error) throw error
      return data
    },
  })

  const addExam = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('exams').insert([{
        child_id: childId, subject: examSubject.trim(), exam_date: examDate || null, notes: examNotes.trim() || null,
      }])
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exams', childId] })
      setExamSubject(''); setExamDate(''); setExamNotes(''); setExamSheet(false)
    },
  })

  const updateExam = useMutation({
    mutationFn: async ({ id, subject, exam_date, notes }) => {
      const { error } = await supabase.from('exams').update({ subject, exam_date: exam_date || null, notes: notes || null }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['exams', childId] }); setEditingExam(null) },
  })

  const deleteExam = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('exams').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['exams', childId] }),
  })

  // ── PTMS ──────────────────────────────────────────────────
  const { data: ptms = [], isLoading: ptmsLoading } = useQuery({
    queryKey: ['ptms', childId],
    enabled: !!childId,
    queryFn: async () => {
      const { data, error } = await supabase.from('ptms').select('*').eq('child_id', childId).order('ptm_date', { ascending: false })
      if (error) throw error
      return data
    },
  })

  const addPtm = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('ptms').insert([{
        child_id: childId, teacher_name: ptmTeacher.trim(), ptm_date: ptmDate || null, notes: ptmNotes.trim() || null, followup_items: [],
      }])
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ptms', childId] })
      setPtmTeacher(''); setPtmDate(''); setPtmNotes(''); setPtmSheet(false)
    },
  })

  const updatePtm = useMutation({
    mutationFn: async ({ id, teacher_name, ptm_date, notes }) => {
      const { error } = await supabase.from('ptms').update({ teacher_name, ptm_date: ptm_date || null, notes: notes || null }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['ptms', childId] }); setEditingPtm(null) },
  })

  const deletePtm = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('ptms').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ptms', childId] }),
  })

  const convertPtmToTask = async (ptm) => {
    if (!family?.id) return
    const title = `PTM follow-up: ${ptm.teacher_name}${ptm.notes ? ' — ' + ptm.notes.slice(0, 60) : ''}`
    const { error } = await supabase.from('tasks').insert([{ family_id: family.id, title, child_id: childId, status: 'open' }])
    if (error) { addToast('Failed to create task', 'error'); return }
    addToast('Task created from PTM', 'success')
  }

  // ── NOTICES ──────────────────────────────────────────────
  const { data: notices = [], isLoading: noticesLoading } = useQuery({
    queryKey: ['notices', childId],
    enabled: !!childId && activeTab === 'notices',
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notices').select('*').eq('child_id', childId).order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
  })

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      addToast('Only PDF, JPG, and PNG files are supported', 'error')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      addToast('File must be under 10MB', 'error')
      return
    }

    setUploading(true)
    setUploadStep('uploading')
    setParsedItems(null)
    setSelectedItems(new Set())

    try {
      // Step 1: Upload to Supabase Storage
      const fileName = `${family.id}/${childId}/${Date.now()}_${file.name}`
      const { error: uploadError } = await supabase.storage
        .from('notices')
        .upload(fileName, file, { contentType: file.type, upsert: false })
      if (uploadError) throw uploadError

      // Insert notice row
      const { data: noticeRow, error: insertError } = await supabase.from('notices').insert([{
        child_id: childId,
        family_id: family.id,
        uploaded_by: user.id,
        file_name: file.name,
        storage_path: fileName,
        parsed_items: [],
      }]).select().single()
      if (insertError) throw insertError

      setCurrentNoticeId(noticeRow.id)
      queryClient.invalidateQueries({ queryKey: ['notices', childId] })

      // Step 2: Extract text client-side
      setUploadStep('extracting')
      addToast('Extracting text from document...', 'info')
      const extracted_text = await extractTextFromFile(file)

      if (!extracted_text || extracted_text.trim().length < 10) {
        addToast('Could not read text from this file. Try a clearer image.', 'error')
        setParsedItems([])
        return
      }

      // Step 3: Send to Edge Function for parsing
      setUploadStep('parsing')
      addToast('Parsing document...', 'info')
      const { data: { session } } = await supabase.auth.getSession()
      const parseRes = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/parse-notice`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            storage_path: fileName,
            child_id: childId,
            family_id: family.id,
            file_name: file.name,
            notice_id: noticeRow.id,
            extracted_text,
          }),
        }
      )

      const result = await parseRes.json()
      if (!parseRes.ok) throw new Error(result.error || 'Parse failed')

      const items = result.items || []
      setParsedItems(items)
      setSelectedItems(new Set(items.map((_, i) => i)))

      if (items.length === 0) {
        addToast('No actionable items found in this document', 'info')
      } else {
        addToast(`Found ${items.length} item${items.length > 1 ? 's' : ''}`, 'success')
      }
    } catch (err) {
      addToast(err.message || 'Upload failed', 'error')
      setParsedItems([])
    } finally {
      setUploading(false)
      setUploadStep(null)
      e.target.value = ''
    }
  }

  const toggleItem = (idx) => {
    setSelectedItems((prev) => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      return next
    })
  }

  const handleAddSelected = async () => {
    if (!parsedItems || selectedItems.size === 0) return
    setAddingItems(true)
    let added = 0
    try {
      for (const idx of selectedItems) {
        const item = parsedItems[idx]
        if (!item) continue
        if (item.type === 'homework') {
          await supabase.from('homework').insert([{
            child_id: childId,
            subject: item.title,
            description: item.notes || item.title,
            due_date: item.date || null,
            done: false,
          }])
          queryClient.invalidateQueries({ queryKey: ['homework', childId] })
        } else if (item.type === 'exam') {
          await supabase.from('exams').insert([{
            child_id: childId,
            subject: item.title,
            exam_date: item.date || null,
            notes: item.notes || null,
          }])
          queryClient.invalidateQueries({ queryKey: ['exams', childId] })
        } else if (item.type === 'ptm') {
          await supabase.from('ptms').insert([{
            child_id: childId,
            teacher_name: item.title,
            ptm_date: item.date || null,
            notes: item.notes || null,
            followup_items: [],
          }])
          queryClient.invalidateQueries({ queryKey: ['ptms', childId] })
        } else {
          const startAt = item.date
            ? new Date(`${item.date}T${item.time || '00:00'}`).toISOString()
            : new Date().toISOString()
          await supabase.from('events').insert([{
            family_id: family.id,
            title: item.title,
            start_at: startAt,
            end_at: null,
            child_ids: [childId],
            notes: item.notes || null,
            created_by: user.id,
          }])
          queryClient.invalidateQueries({ queryKey: ['events'] })
        }
        added++
      }
      addToast(`Added ${added} item${added > 1 ? 's' : ''}`, 'success')
      setParsedItems(null)
      setSelectedItems(new Set())
      setCurrentNoticeId(null)
    } catch (err) {
      addToast(err.message || 'Failed to add items', 'error')
    } finally {
      setAddingItems(false)
    }
  }

  const handleDeleteNotice = async (notice) => {
    if (!confirm('Delete this notice?')) return
    try {
      await supabase.storage.from('notices').remove([notice.storage_path])
      await supabase.from('notices').delete().eq('id', notice.id)
      queryClient.invalidateQueries({ queryKey: ['notices', childId] })
      addToast('Notice deleted', 'success')
    } catch (err) {
      addToast(err.message, 'error')
    }
  }

  const TYPE_BADGE = {
    event: { label: 'Event', variant: 'primary' },
    homework: { label: 'Homework', variant: 'amber' },
    exam: { label: 'Exam', variant: 'coral' },
    ptm: { label: 'PTM', variant: 'teal' },
    task: { label: 'Task', variant: 'primary' },
    other: { label: 'Other', variant: 'gray' },
  }

  const uploadStepLabel = {
    uploading: 'Uploading file...',
    extracting: 'Reading document...',
    parsing: 'Finding items...',
  }

  const pending = homework.filter((h) => !h.done)
  const done = homework.filter((h) => h.done)
  const upcomingExams = exams.filter((e) => !e.exam_date || new Date(e.exam_date) >= new Date())
  const pastExams = exams.filter((e) => e.exam_date && new Date(e.exam_date) < new Date())

  const ActionButtons = ({ onEdit, onDelete }) => (
    <div className="flex gap-1 flex-shrink-0">
      <button onClick={onEdit} className="p-1.5 text-text-secondary hover:text-primary transition-colors" aria-label="Edit">
        <Pencil size={14} />
      </button>
      <button onClick={onDelete} className="p-1.5 text-text-secondary hover:text-coral transition-colors" aria-label="Delete">
        <Trash2 size={14} />
      </button>
    </div>
  )

  return (
    <div className="space-y-4 pt-4 pb-8">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(`/children/${childId}`)} className="p-1" aria-label="Back">
          <ChevronLeft size={24} className="text-primary" />
        </button>
        <h1 className="text-h1 text-primary">{child?.name ? `${child.name}'s School` : 'School'}</h1>
      </div>

      <div className="flex gap-1 overflow-x-auto border-b border-border -mx-5 px-5">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-2 text-h3 font-semibold whitespace-nowrap border-b-2 transition-colors ${
              activeTab === tab.id ? 'text-primary border-primary' : 'text-text-secondary border-transparent'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* HOMEWORK */}
      {activeTab === 'homework' && (
        <div className="space-y-3">
          {hwLoading ? <Skeleton className="h-16 rounded-2xl" /> : (
            <>
              {pending.length > 0 && (
                <div className="space-y-2">
                  {pending.map((item) => (
                    <Card key={item.id} className="flex items-start gap-3">
                      <input type="checkbox" checked={false} onChange={() => toggleHomework.mutate({ id: item.id, done: item.done })} className="w-5 h-5 mt-1 accent-primary cursor-pointer" />
                      <div className="flex-1">
                        {item.subject && <Badge variant="primary" className="mb-1">{item.subject}</Badge>}
                        <p className="text-body font-semibold">{item.description}</p>
                        {item.due_date && <p className="text-caption text-text-secondary">Due {format(new Date(item.due_date), 'd MMM')}</p>}
                      </div>
                      <ActionButtons onEdit={() => setEditingHw(item)} onDelete={() => { if (confirm('Delete?')) deleteHomework.mutate(item.id) }} />
                    </Card>
                  ))}
                </div>
              )}
              {done.length > 0 && (
                <div className="space-y-2 opacity-60">
                  <p className="text-caption text-text-secondary">Completed</p>
                  {done.map((item) => (
                    <Card key={item.id} className="flex items-start gap-3">
                      <input type="checkbox" checked={true} onChange={() => toggleHomework.mutate({ id: item.id, done: item.done })} className="w-5 h-5 mt-1 accent-primary cursor-pointer" />
                      <div className="flex-1"><p className="text-body line-through text-text-secondary">{item.description}</p></div>
                      <ActionButtons onEdit={() => setEditingHw(item)} onDelete={() => { if (confirm('Delete?')) deleteHomework.mutate(item.id) }} />
                    </Card>
                  ))}
                </div>
              )}
              {pending.length === 0 && done.length === 0 && (
                <p className="text-body text-text-secondary text-center py-8">No homework added yet</p>
              )}
            </>
          )}
          <Button variant="secondary" className="w-full" onClick={() => setHomeworkSheet(true)}>
            <Plus size={18} /> Add Homework
          </Button>
        </div>
      )}

      {/* EXAMS */}
      {activeTab === 'exams' && (
        <div className="space-y-3">
          {examsLoading ? <Skeleton className="h-16 rounded-2xl" /> : (
            <>
              {upcomingExams.length > 0 ? upcomingExams.map((exam) => (
                <Card key={exam.id} className="flex items-start gap-3">
                  <div className="flex-1">
                    <p className="text-body font-semibold">{exam.subject}</p>
                    {exam.exam_date && <p className="text-caption text-text-secondary">{format(new Date(exam.exam_date), 'EEE, d MMM yyyy')}</p>}
                    {exam.notes && <p className="text-caption text-text-secondary mt-1">{exam.notes}</p>}
                  </div>
                  <ActionButtons onEdit={() => setEditingExam(exam)} onDelete={() => { if (confirm('Delete?')) deleteExam.mutate(exam.id) }} />
                </Card>
              )) : <p className="text-body text-text-secondary text-center py-8">No upcoming exams</p>}
              {pastExams.length > 0 && (
                <div className="opacity-60">
                  <p className="text-caption text-text-secondary mb-2">Past</p>
                  {pastExams.map((exam) => (
                    <Card key={exam.id} className="mb-2 flex items-start gap-3">
                      <div className="flex-1">
                        <p className="text-body font-semibold">{exam.subject}</p>
                        <p className="text-caption text-text-secondary">{format(new Date(exam.exam_date), 'EEE, d MMM yyyy')}</p>
                      </div>
                      <ActionButtons onEdit={() => setEditingExam(exam)} onDelete={() => { if (confirm('Delete?')) deleteExam.mutate(exam.id) }} />
                    </Card>
                  ))}
                </div>
              )}
            </>
          )}
          <Button variant="secondary" className="w-full" onClick={() => setExamSheet(true)}>
            <Plus size={18} /> Add Exam
          </Button>
        </div>
      )}

      {/* PTMS */}
      {activeTab === 'ptms' && (
        <div className="space-y-3">
          {ptmsLoading ? <Skeleton className="h-16 rounded-2xl" /> : ptms.length > 0 ? (
            ptms.map((ptm) => (
              <Card key={ptm.id}>
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <p className="text-body font-semibold">{ptm.teacher_name}</p>
                    {ptm.ptm_date && <p className="text-caption text-text-secondary">{format(new Date(ptm.ptm_date), 'EEE, d MMM yyyy')}</p>}
                    {ptm.notes && <p className="text-body text-text-secondary mt-1">{ptm.notes}</p>}
                  </div>
                  <ActionButtons onEdit={() => setEditingPtm(ptm)} onDelete={() => { if (confirm('Delete?')) deletePtm.mutate(ptm.id) }} />
                </div>
                <button onClick={() => convertPtmToTask(ptm)} className="mt-3 flex items-center gap-1.5 text-primary text-caption font-semibold hover:underline">
                  <ArrowRight size={14} /> Convert to Task
                </button>
              </Card>
            ))
          ) : (
            <p className="text-body text-text-secondary text-center py-8">No PTMs scheduled</p>
          )}
          <Button variant="secondary" className="w-full" onClick={() => setPtmSheet(true)}>
            <Plus size={18} /> Add PTM
          </Button>
        </div>
      )}

      {/* NOTICES */}
      {activeTab === 'notices' && (
        <div className="space-y-4">
          {/* Upload area */}
          <label className={`block border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-colors ${uploading ? 'border-primary bg-primary-light' : 'border-border hover:border-primary hover:bg-primary-light'}`}>
            <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" className="hidden" onChange={handleFileUpload} disabled={uploading} />
            {uploading ? (
              <div className="flex flex-col items-center gap-2">
                <Loader size={28} className="text-primary animate-spin" />
                <p className="text-body font-semibold text-primary">{uploadStepLabel[uploadStep] || 'Processing...'}</p>
                <p className="text-caption text-text-secondary">This takes a few seconds</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <Upload size={28} className="text-text-secondary" />
                <p className="text-body font-semibold">Upload school notice</p>
                <p className="text-caption text-text-secondary">PDF, JPG, or PNG · Max 10MB</p>
              </div>
            )}
          </label>

          {/* Parsed items preview */}
          {parsedItems !== null && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-body font-semibold">
                  {parsedItems.length > 0 ? `${parsedItems.length} item${parsedItems.length > 1 ? 's' : ''} found` : 'Nothing found'}
                </p>
                {parsedItems.length > 0 && (
                  <button onClick={() => setParsedItems(null)} className="text-caption text-text-secondary hover:text-primary">
                    Clear
                  </button>
                )}
              </div>

              {parsedItems.length > 0 ? (
                <>
                  <div className="space-y-2">
                    {parsedItems.map((item, idx) => {
                      const badge = TYPE_BADGE[item.type] || TYPE_BADGE.other
                      const isSelected = selectedItems.has(idx)
                      return (
                        <Card
                          key={idx}
                          className={`cursor-pointer transition-all ${isSelected ? 'border-primary bg-primary-light' : 'opacity-60'}`}
                          onClick={() => toggleItem(idx)}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`w-5 h-5 rounded border-2 flex-shrink-0 mt-0.5 flex items-center justify-center transition-colors ${isSelected ? 'bg-primary border-primary' : 'border-border'}`}>
                              {isSelected && <Check size={12} className="text-white" />}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-0.5">
                                <Badge variant={badge.variant}>{badge.label}</Badge>
                                {item.date && <span className="text-caption text-text-secondary">{format(new Date(item.date), 'd MMM')}</span>}
                              </div>
                              <p className="text-body font-semibold">{item.title}</p>
                              {item.notes && <p className="text-caption text-text-secondary mt-0.5">{item.notes}</p>}
                            </div>
                          </div>
                        </Card>
                      )
                    })}
                  </div>

                  <div className="flex gap-3">
                    <Button
                      className="flex-1"
                      loading={addingItems}
                      disabled={selectedItems.size === 0}
                      onClick={handleAddSelected}
                    >
                      Add {selectedItems.size > 0 ? `${selectedItems.size} ` : ''}Selected
                    </Button>
                    <Button variant="secondary" onClick={() => { setParsedItems(null); setSelectedItems(new Set()) }}>
                      <X size={18} />
                    </Button>
                  </div>
                </>
              ) : (
                <Card className="text-center py-4">
                  <p className="text-body text-text-secondary">No events, homework, or exams found in this document.</p>
                  <p className="text-caption text-text-secondary mt-1">Try a clearer scan or add items manually.</p>
                </Card>
              )}
            </div>
          )}

          {/* Past notices */}
          {noticesLoading ? (
            <Skeleton className="h-16 rounded-2xl" />
          ) : notices.length > 0 ? (
            <div className="space-y-2">
              <p className="text-caption text-text-secondary">Uploaded notices</p>
              {notices.map((notice) => (
                <Card key={notice.id} className="flex items-center gap-3">
                  <FileText size={20} className="text-primary flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-body font-semibold truncate">{notice.file_name}</p>
                    <p className="text-caption text-text-secondary">
                      {format(new Date(notice.created_at), 'd MMM yyyy')}
                      {notice.parsed_items?.length > 0 && ` · ${notice.parsed_items.length} items extracted`}
                    </p>
                  </div>
                  <button onClick={() => handleDeleteNotice(notice)} className="p-1.5 text-text-secondary hover:text-coral transition-colors flex-shrink-0">
                    <Trash2 size={15} />
                  </button>
                </Card>
              ))}
            </div>
          ) : !uploading && parsedItems === null ? (
            <p className="text-body text-text-secondary text-center py-4">No notices uploaded yet</p>
          ) : null}
        </div>
      )}

      {/* ADD SHEETS */}
      <BottomSheet open={homeworkSheet} onClose={() => setHomeworkSheet(false)}>
        <div className="space-y-4 pb-4">
          <h2 className="text-h2 text-primary">Add Homework</h2>
          <Input label="Subject" placeholder="Math" value={hwSubject} onChange={(e) => setHwSubject(e.target.value)} />
          <Input label="Description" placeholder="Chapter 5 exercises" value={hwDesc} onChange={(e) => setHwDesc(e.target.value)} />
          <Input label="Due date" type="date" value={hwDue} onChange={(e) => setHwDue(e.target.value)} />
          <Button className="w-full" loading={addHomework.isPending} disabled={!hwSubject.trim() || !hwDesc.trim()} onClick={() => addHomework.mutate()}>Save</Button>
        </div>
      </BottomSheet>

      <BottomSheet open={examSheet} onClose={() => setExamSheet(false)}>
        <div className="space-y-4 pb-4">
          <h2 className="text-h2 text-primary">Add Exam</h2>
          <Input label="Subject" placeholder="Science" value={examSubject} onChange={(e) => setExamSubject(e.target.value)} />
          <Input label="Exam date" type="date" value={examDate} onChange={(e) => setExamDate(e.target.value)} />
          <Input label="Notes (optional)" placeholder="Chapters 1-4" value={examNotes} onChange={(e) => setExamNotes(e.target.value)} />
          <Button className="w-full" loading={addExam.isPending} disabled={!examSubject.trim()} onClick={() => addExam.mutate()}>Save</Button>
        </div>
      </BottomSheet>

      <BottomSheet open={ptmSheet} onClose={() => setPtmSheet(false)}>
        <div className="space-y-4 pb-4">
          <h2 className="text-h2 text-primary">Add PTM</h2>
          <Input label="Teacher name" placeholder="Ms. Sharma" value={ptmTeacher} onChange={(e) => setPtmTeacher(e.target.value)} />
          <Input label="Date" type="date" value={ptmDate} onChange={(e) => setPtmDate(e.target.value)} />
          <Input label="Notes (optional)" placeholder="Discuss math progress" value={ptmNotes} onChange={(e) => setPtmNotes(e.target.value)} />
          <Button className="w-full" loading={addPtm.isPending} disabled={!ptmTeacher.trim()} onClick={() => addPtm.mutate()}>Save</Button>
        </div>
      </BottomSheet>

      {/* EDIT SHEETS */}
      {editingHw && <EditHomeworkSheet item={editingHw} onSave={(vals) => updateHomework.mutate({ id: editingHw.id, ...vals })} onClose={() => setEditingHw(null)} saving={updateHomework.isPending} />}
      {editingExam && <EditExamSheet item={editingExam} onSave={(vals) => updateExam.mutate({ id: editingExam.id, ...vals })} onClose={() => setEditingExam(null)} saving={updateExam.isPending} />}
      {editingPtm && <EditPtmSheet item={editingPtm} onSave={(vals) => updatePtm.mutate({ id: editingPtm.id, ...vals })} onClose={() => setEditingPtm(null)} saving={updatePtm.isPending} />}
    </div>
  )
}

function EditHomeworkSheet({ item, onSave, onClose, saving }) {
  const [subject, setSubject] = useState(item.subject || '')
  const [description, setDescription] = useState(item.description || '')
  const [due_date, setDueDate] = useState(item.due_date || '')
  return (
    <BottomSheet open={true} onClose={onClose}>
      <div className="space-y-4 pb-4">
        <h2 className="text-h2 text-primary">Edit Homework</h2>
        <Input label="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
        <Input label="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
        <Input label="Due date" type="date" value={due_date} onChange={(e) => setDueDate(e.target.value)} />
        <Button className="w-full" loading={saving} disabled={!subject.trim() || !description.trim()} onClick={() => onSave({ subject, description, due_date })}>Save Changes</Button>
      </div>
    </BottomSheet>
  )
}

function EditExamSheet({ item, onSave, onClose, saving }) {
  const [subject, setSubject] = useState(item.subject || '')
  const [exam_date, setExamDate] = useState(item.exam_date || '')
  const [notes, setNotes] = useState(item.notes || '')
  return (
    <BottomSheet open={true} onClose={onClose}>
      <div className="space-y-4 pb-4">
        <h2 className="text-h2 text-primary">Edit Exam</h2>
        <Input label="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
        <Input label="Exam date" type="date" value={exam_date} onChange={(e) => setExamDate(e.target.value)} />
        <Input label="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
        <Button className="w-full" loading={saving} disabled={!subject.trim()} onClick={() => onSave({ subject, exam_date, notes })}>Save Changes</Button>
      </div>
    </BottomSheet>
  )
}

function EditPtmSheet({ item, onSave, onClose, saving }) {
  const [teacher_name, setTeacherName] = useState(item.teacher_name || '')
  const [ptm_date, setPtmDate] = useState(item.ptm_date || '')
  const [notes, setNotes] = useState(item.notes || '')
  return (
    <BottomSheet open={true} onClose={onClose}>
      <div className="space-y-4 pb-4">
        <h2 className="text-h2 text-primary">Edit PTM</h2>
        <Input label="Teacher name" value={teacher_name} onChange={(e) => setTeacherName(e.target.value)} />
        <Input label="Date" type="date" value={ptm_date} onChange={(e) => setPtmDate(e.target.value)} />
        <Input label="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
        <Button className="w-full" loading={saving} disabled={!teacher_name.trim()} onClick={() => onSave({ teacher_name, ptm_date, notes })}>Save Changes</Button>
      </div>
    </BottomSheet>
  )
}