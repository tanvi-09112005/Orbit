import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { Upload, Loader, Check, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import { useFamilyStore } from '../stores/familyStore'
import { useUIStore } from '../stores/uiStore'
import BottomSheet from './ui/BottomSheet'
import Button from './ui/Button'
import Badge from './ui/Badge'
import Card from './ui/Card'
import { createWorker } from 'tesseract.js'
const TYPE_BADGE = {
  event:    { label: 'Event',    variant: 'primary' },
  homework: { label: 'Homework', variant: 'amber'   },
  exam:     { label: 'Exam',     variant: 'coral'   },
  ptm:      { label: 'PTM',      variant: 'teal'    },
  task:     { label: 'Task',     variant: 'gray'    },
  other:    { label: 'Other',    variant: 'gray'    },
}

export default function GlobalUploadSheet({ open, onClose }) {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const { family, children } = useFamilyStore()
  const { addToast } = useUIStore()

  const [uploading, setUploading] = useState(false)
  const [parsedItems, setParsedItems] = useState(null)
  const [selectedItems, setSelectedItems] = useState(new Set())
  const [addingItems, setAddingItems] = useState(false)
  const [selectedChildId, setSelectedChildId] = useState(children[0]?.id || '')

  const reset = () => {
    setParsedItems(null)
    setSelectedItems(new Set())
    setUploading(false)
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  // Add at top of GlobalUploadSheet.jsx


// Replace handleFileUpload with this:
const handleFileUpload = async (e) => {
  const file = e.target.files?.[0]
  if (!file) return

  const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
  if (!allowed.includes(file.type)) {
    addToast('Only PDF, JPG, and PNG supported', 'error'); return
  }
  if (file.size > 10 * 1024 * 1024) {
    addToast('File must be under 10MB', 'error'); return
  }

  setUploading(true)
  setParsedItems(null)

  try {
    const fileName = `${family.id}/${selectedChildId || 'general'}/${Date.now()}_${file.name}`
    const { error: uploadError } = await supabase.storage
      .from('notices').upload(fileName, file, { contentType: file.type })
    if (uploadError) throw uploadError

    const { data: noticeRow, error: insertError } = await supabase
      .from('notices').insert([{
        child_id: selectedChildId || null,
        family_id: family.id,
        uploaded_by: user.id,
        file_name: file.name,
        storage_path: fileName,
        parsed_items: [],
      }]).select().single()
    if (insertError) throw insertError

    addToast('Parsing document...', 'info')

    // For images: run OCR in browser first
    let extractedText = ''
    if (file.type.startsWith('image/')) {
      addToast('Running OCR on image...', 'info')
      const worker = await createWorker('eng')
      const { data: { text } } = await worker.recognize(file)
      await worker.terminate()
      extractedText = text
      console.log('OCR result length:', extractedText.length)
    }

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
          child_id: selectedChildId || null,
          family_id: family.id,
          file_name: file.name,
          notice_id: noticeRow.id,
          extracted_text: extractedText || undefined,
        }),
      }
    )

    const result = await parseRes.json()
    if (!parseRes.ok) throw new Error(result.error || 'Parse failed')

    const items = result.items || []
    setParsedItems(items)
    setSelectedItems(new Set(items.map((_, i) => i)))

    if (items.length === 0) addToast('No actionable items found', 'info')
    else addToast(`Found ${items.length} item${items.length > 1 ? 's' : ''}`, 'success')

  } catch (err) {
    addToast(err.message || 'Upload failed', 'error')
    setParsedItems([])
  } finally {
    setUploading(false)
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

        if (item.type === 'task') {
          await supabase.from('tasks').insert([{
            family_id: family.id,
            title: item.title,
            child_id: selectedChildId || null,
            notes: item.notes || null,
            due_date: item.date || null,
            status: 'open',
          }])
          queryClient.invalidateQueries({ queryKey: ['tasks', family.id] })

        } else if (item.type === 'homework') {
          await supabase.from('homework').insert([{
            child_id: selectedChildId,
            subject: item.title,
            description: item.notes || item.title,
            due_date: item.date || null,
            done: false,
          }])
          if (selectedChildId) {
            queryClient.invalidateQueries({ queryKey: ['homework', selectedChildId] })
          }

        } else if (item.type === 'exam') {
          await supabase.from('exams').insert([{
            child_id: selectedChildId,
            subject: item.title,
            exam_date: item.date || null,
            notes: item.notes || null,
          }])
          if (selectedChildId) {
            queryClient.invalidateQueries({ queryKey: ['exams', selectedChildId] })
          }

        } else if (item.type === 'ptm') {
          await supabase.from('ptms').insert([{
            child_id: selectedChildId,
            teacher_name: item.title,
            ptm_date: item.date || null,
            notes: item.notes || null,
            followup_items: [],
          }])
          if (selectedChildId) {
            queryClient.invalidateQueries({ queryKey: ['ptms', selectedChildId] })
          }

        } else {
          // event or other
          const startAt = item.date
            ? new Date(`${item.date}T${item.time || '00:00'}`).toISOString()
            : new Date().toISOString()
          await supabase.from('events').insert([{
            family_id: family.id,
            title: item.title,
            start_at: startAt,
            end_at: null,
            child_ids: selectedChildId ? [selectedChildId] : [],
            notes: item.notes || null,
            created_by: user.id,
          }])
          queryClient.invalidateQueries({ queryKey: ['events'] })
        }
        added++
      }

      addToast(`Added ${added} item${added > 1 ? 's' : ''}`, 'success')
      handleClose()
    } catch (err) {
      addToast(err.message || 'Failed to add items', 'error')
    } finally {
      setAddingItems(false)
    }
  }

  return (
    <BottomSheet open={open} onClose={handleClose} title="Upload Document">
      <div className="space-y-4 pb-4">

        {/* Child selector */}
        {children.length > 0 && (
          <div>
            <p className="text-body font-semibold mb-2">For which child?</p>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setSelectedChildId('')}
                className={`px-3 py-1.5 rounded-full text-body font-medium border-2 transition-colors ${
                  selectedChildId === '' ? 'bg-primary text-white border-primary' : 'bg-white border-border text-text-secondary'
                }`}
              >
                Family
              </button>
              {children.map((child) => (
                <button
                  key={child.id}
                  onClick={() => setSelectedChildId(child.id)}
                  className={`px-3 py-1.5 rounded-full text-body font-medium border-2 transition-colors ${
                    selectedChildId === child.id ? 'text-white border-transparent' : 'bg-white border-border text-text-secondary'
                  }`}
                  style={selectedChildId === child.id ? { backgroundColor: child.color_hex, borderColor: child.color_hex } : {}}
                >
                  {child.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Upload trigger */}
        {!parsedItems && (
          <label className={`block border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-colors ${
            uploading ? 'border-primary bg-primary-light' : 'border-border hover:border-primary hover:bg-primary-light'
          }`}>
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp"
              className="hidden"
              onChange={handleFileUpload}
              disabled={uploading}
            />
            {uploading ? (
              <div className="flex flex-col items-center gap-2">
                <Loader size={32} className="text-primary animate-spin" />
                <p className="text-body font-semibold text-primary">Parsing document...</p>
                <p className="text-caption text-text-secondary">Reading with AI — takes a few seconds</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <Upload size={32} className="text-text-secondary" />
                <p className="text-body font-semibold">Tap to upload</p>
                <p className="text-caption text-text-secondary">PDF, JPG, or PNG · Max 10MB</p>
                <p className="text-caption text-text-secondary">School notices, timetables, circulars...</p>
              </div>
            )}
          </label>
        )}

        {/* Parsed results */}
        {parsedItems !== null && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-body font-semibold">
                {parsedItems.length > 0
                  ? `${parsedItems.length} item${parsedItems.length > 1 ? 's' : ''} found`
                  : 'Nothing found'}
              </p>
              <button onClick={reset} className="text-caption text-text-secondary hover:text-primary">
                Upload another
              </button>
            </div>

            {parsedItems.length > 0 ? (
              <>
                <div className="space-y-2 max-h-64 overflow-y-auto">
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
                          <div className={`w-5 h-5 rounded border-2 flex-shrink-0 mt-0.5 flex items-center justify-center transition-colors ${
                            isSelected ? 'bg-primary border-primary' : 'border-border'
                          }`}>
                            {isSelected && <Check size={12} className="text-white" />}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                              <Badge variant={badge.variant}>{badge.label}</Badge>
                              {item.date && (
                                <span className="text-caption text-text-secondary">
                                  {format(new Date(item.date), 'd MMM yyyy')}
                                </span>
                              )}
                            </div>
                            <p className="text-body font-semibold">{item.title}</p>
                            {item.notes && (
                              <p className="text-caption text-text-secondary mt-0.5">{item.notes}</p>
                            )}
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
                  <Button variant="secondary" onClick={handleClose}>
                    <X size={18} />
                  </Button>
                </div>
              </>
            ) : (
              <Card className="text-center py-4">
                <p className="text-body text-text-secondary">No actionable items found.</p>
                <p className="text-caption text-text-secondary mt-1">Try a clearer scan or add manually.</p>
              </Card>
            )}
          </div>
        )}
      </div>
    </BottomSheet>
  )
}