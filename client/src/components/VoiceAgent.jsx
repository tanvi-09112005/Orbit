import { useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { Mic, MicOff, Loader2, X, CheckCircle, AlertCircle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import { useFamilyStore } from '../stores/familyStore'
import { useUIStore } from '../stores/uiStore'

const EDGE_FN_URL = 'https://innyndztbmrynnzmwgdt.supabase.co/functions/v1/voice-agent'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlubnluZHp0Ym1yeW5uem13Z2R0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA1MDg3NjIsImV4cCI6MjA5NjA4NDc2Mn0.0YNM8eBgOmWhAfYvvFxvzl8L026DzkMxwBVITCzptfI'

// Pick best supported audio format for this browser
function getSupportedMimeType() {
  const types = ['audio/webm', 'audio/mp4', 'audio/ogg', 'audio/wav']
  for (const type of types) {
    if (MediaRecorder.isTypeSupported(type)) return type
  }
  return ''
}

export default function VoiceAgent({ role, permissions, myMemberId }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const { family, members, children } = useFamilyStore()
  const { addToast } = useUIStore()

  const [agentState, setAgentState] = useState('idle')
  const [transcript, setTranscript] = useState('')
  const [message, setMessage] = useState('')
  const [clarifyQuestion, setClarifyQuestion] = useState('')
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])
  const streamRef = useRef(null)
  const mimeTypeRef = useRef('')

  const resetAfterDelay = useCallback((delay = 3000) => {
    setTimeout(() => {
      setAgentState('idle')
      setTranscript('')
      setMessage('')
    }, delay)
  }, [])

  // ── Execute parsed action ────────────────────────────────────
  const executeAction = useCallback(async (action, payload) => {
    if (!family?.id) return

    switch (action) {
      case 'create_event': {
        const startAt = payload.start_time
          ? new Date(`${payload.date}T${payload.start_time}`).toISOString()
          : new Date(`${payload.date}T00:00`).toISOString()
        const { error } = await supabase.from('events').insert([{
          family_id: family.id,
          title: payload.title,
          start_at: startAt,
          end_at: payload.end_time ? new Date(`${payload.date}T${payload.end_time}`).toISOString() : null,
          child_ids: payload.child_ids || [],
          responsible_member_id: payload.responsible_member_id || null,
          backup_member_id: payload.backup_member_id || null,
          notes: payload.notes || null,
          created_by: user.id,
        }])
        if (error) throw error
        queryClient.invalidateQueries({ queryKey: ['events'] })
        break
      }

      case 'create_task': {
        const { error } = await supabase.from('tasks').insert([{
          family_id: family.id,
          title: payload.title,
          assigned_to: payload.assigned_to || null,
          due_date: payload.due_date || null,
          child_id: payload.child_id || null,
          notes: payload.notes || null,
          status: 'open',
        }])
        if (error) throw error
        queryClient.invalidateQueries({ queryKey: ['tasks', family.id] })
        queryClient.invalidateQueries({ queryKey: ['tasks', 'today', family.id] })
        queryClient.invalidateQueries({ queryKey: ['insights', 'balance', family.id] })
        break
      }

      case 'log_mood': {
        const { error } = await supabase.from('mood_logs').insert([{
          child_id: payload.child_id,
          logged_by: user.id,
          mood: payload.mood,
          note: payload.note || null,
          logged_at: new Date().toISOString(),
        }])
        if (error) throw error
        queryClient.invalidateQueries({ queryKey: ['mood', payload.child_id] })
        queryClient.invalidateQueries({ queryKey: ['insights', 'child-trends', family.id] })
        break
      }

      case 'add_homework': {
        const { error } = await supabase.from('homework').insert([{
          child_id: payload.child_id,
          subject: payload.subject,
          description: payload.description,
          due_date: payload.due_date || null,
          done: false,
        }])
        if (error) throw error
        queryClient.invalidateQueries({ queryKey: ['homework', payload.child_id] })
        queryClient.invalidateQueries({ queryKey: ['homework', 'count', payload.child_id] })
        break
      }

      case 'add_exam': {
        const { error } = await supabase.from('exams').insert([{
          child_id: payload.child_id,
          subject: payload.subject,
          exam_date: payload.exam_date || null,
          notes: payload.notes || null,
        }])
        if (error) throw error
        queryClient.invalidateQueries({ queryKey: ['exams', payload.child_id] })
        break
      }

      case 'add_ptm': {
        const { error } = await supabase.from('ptms').insert([{
          child_id: payload.child_id,
          teacher_name: payload.teacher_name,
          ptm_date: payload.ptm_date || null,
          notes: payload.notes || null,
          followup_items: [],
        }])
        if (error) throw error
        queryClient.invalidateQueries({ queryKey: ['ptms', payload.child_id] })
        break
      }

      case 'add_activity': {
        const { error } = await supabase.from('activities').insert([{
          child_id: payload.child_id,
          name: payload.name,
          location: payload.location || null,
          schedule: payload.schedule ? { description: payload.schedule } : {},
          responsible_member_id: payload.responsible_member_id || null,
        }])
        if (error) throw error
        queryClient.invalidateQueries({ queryKey: ['activities', payload.child_id] })
        break
      }

      case 'log_screen_time': {
        const date = payload.date || new Date().toISOString().split('T')[0]
        const { data: existing } = await supabase
          .from('screen_time_logs').select('id')
          .eq('child_id', payload.child_id).eq('date', date).maybeSingle()
        if (existing) {
          const { error } = await supabase.from('screen_time_logs')
            .update({ hours_manual: payload.hours }).eq('id', existing.id)
          if (error) throw error
        } else {
          const { error } = await supabase.from('screen_time_logs')
            .insert([{ child_id: payload.child_id, logged_by: user.id, date, hours_manual: payload.hours }])
          if (error) throw error
        }
        queryClient.invalidateQueries({ queryKey: ['screentime', payload.child_id] })
        break
      }

      case 'navigate': {
        navigate(payload.route)
        return
      }

      case 'clarify': {
        setClarifyQuestion(payload.question || 'Could you be more specific?')
        setAgentState('clarify')
        return
      }

      case 'denied': {
        setMessage("You don't have permission to do that.")
        setAgentState('error')
        resetAfterDelay(3000)
        return
      }

      default:
        throw new Error('Unknown action: ' + action)
    }
  }, [family, user, navigate, queryClient, resetAfterDelay])

  // ── Send audio blob to Edge Function (STT + parse + execute) ─
  const processAudio = useCallback(async (audioBlob, mimeType) => {
    setAgentState('processing')

    try {
      const activeMembers = members.filter((m) => m.user_id && m.joined_at)

      // Convert blob to base64
      const arrayBuffer = await audioBlob.arrayBuffer()
const uint8Array = new Uint8Array(arrayBuffer)
let binary = ''
const chunkSize = 8192
for (let i = 0; i < uint8Array.length; i += chunkSize) {
  binary += String.fromCharCode(...uint8Array.subarray(i, i + chunkSize))
}
const base64Audio = btoa(binary)

      const res = await fetch(EDGE_FN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          audio: base64Audio,
          mimeType,
          context: {
            role,
            permissions,
            members: activeMembers,
            children,
            familyId: family?.id,
            userId: user?.id,
            myMemberId,
          },
        }),
      })

      const result = await res.json()

      // Show transcript if returned
      if (result.transcript) setTranscript(result.transcript)

      if (result.action === 'clarify') {
        setClarifyQuestion(result.payload?.question || result.message)
        setAgentState('clarify')
        return
      }

      if (result.action === 'denied') {
        setMessage(result.message || "You don't have permission to do that.")
        setAgentState('error')
        resetAfterDelay(3000)
        return
      }

      await executeAction(result.action, result.payload)
      setMessage(result.message || 'Done!')
      setAgentState('success')
      addToast(result.message || 'Done!', 'success')
      resetAfterDelay(2500)
    } catch (err) {
      console.error('Voice agent error:', err)
      setMessage('Something went wrong. Please try again.')
      setAgentState('error')
      resetAfterDelay(3000)
    }
  }, [role, permissions, members, children, family, user, myMemberId, executeAction, addToast, resetAfterDelay])

  // ── Start recording ───────────────────────────────────────────
  const startListening = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      audioChunksRef.current = []

      const mimeType = getSupportedMimeType()
      mimeTypeRef.current = mimeType

      const mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
      mediaRecorderRef.current = mediaRecorder

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data)
      }

      mediaRecorder.onstop = async () => {
        streamRef.current?.getTracks().forEach((t) => t.stop())
        if (audioChunksRef.current.length === 0) {
          setAgentState('idle')
          return
        }
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeTypeRef.current || 'audio/webm' })
        await processAudio(audioBlob, mimeTypeRef.current || 'audio/webm')
      }

      mediaRecorder.start()
      setAgentState('listening')
    } catch (err) {
      console.error('Mic error:', err)
      if (err.name === 'NotAllowedError') {
        addToast('Microphone access denied. Please allow mic in browser settings.', 'error')
      } else {
        addToast('Could not access microphone. Try again.', 'error')
      }
      setAgentState('idle')
    }
  }, [processAudio, addToast])

  const stopListening = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop()
    }
  }, [])

  const dismiss = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop()
    }
    streamRef.current?.getTracks().forEach((t) => t.stop())
    setAgentState('idle')
    setTranscript('')
    setMessage('')
    setClarifyQuestion('')
  }, [])

  const buttonConfig = {
    idle:       { bg: 'bg-coral',   icon: <Mic size={20} />,                              onClick: startListening },
    listening:  { bg: 'bg-coral',   icon: <MicOff size={20} />,                           onClick: stopListening },
    processing: { bg: 'bg-amber',   icon: <Loader2 size={20} className="animate-spin" />, onClick: null },
    success:    { bg: 'bg-teal',    icon: <CheckCircle size={20} />,                      onClick: null },
    error:      { bg: 'bg-coral',   icon: <AlertCircle size={20} />,                      onClick: dismiss },
    clarify:    { bg: 'bg-primary', icon: <Mic size={20} />,                              onClick: startListening },
  }

  const cfg = buttonConfig[agentState] || buttonConfig.idle

  return (
    <>
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        onClick={cfg.onClick}
        disabled={agentState === 'processing' || agentState === 'success'}
        className={`${cfg.bg} text-white p-3.5 rounded-full shadow-lg hover:shadow-xl transition-shadow flex items-center justify-center disabled:opacity-70`}
        aria-label="Voice assistant"
      >
        {cfg.icon}
      </motion.button>

      <AnimatePresence>
        {agentState !== 'idle' && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
           className="fixed bottom-32 left-4 w-72 bg-white rounded-2xl shadow-xl border border-border p-4 z-50"
          >
            {agentState !== 'processing' && (
              <button onClick={dismiss} className="absolute top-3 right-3 text-text-secondary hover:text-foreground">
                <X size={16} />
              </button>
            )}

            {agentState === 'listening' && (
              <div className="flex items-center gap-3">
                <div className="flex gap-1 items-end h-6">
                  {[0, 1, 2, 3].map((i) => (
                    <motion.div
                      key={i}
                      className="w-1 bg-coral rounded-full"
                      animate={{ height: ['8px', '20px', '8px'] }}
                      transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
                    />
                  ))}
                </div>
                <div>
                  <p className="text-body font-semibold text-coral">Listening...</p>
                  <p className="text-caption text-text-secondary">Tap mic to stop</p>
                </div>
              </div>
            )}

            {agentState === 'processing' && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Loader2 size={16} className="text-amber animate-spin" />
                  <p className="text-body font-semibold text-amber">Working on it...</p>
                </div>
                {transcript && (
                  <p className="text-caption text-text-secondary italic">"{transcript}"</p>
                )}
              </div>
            )}

            {agentState === 'success' && (
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <CheckCircle size={16} className="text-teal flex-shrink-0" />
                  <p className="text-body font-semibold text-teal">{message}</p>
                </div>
                {transcript && (
                  <p className="text-caption text-text-secondary italic">"{transcript}"</p>
                )}
              </div>
            )}

            {agentState === 'error' && (
              <div className="flex items-center gap-2">
                <AlertCircle size={16} className="text-coral flex-shrink-0" />
                <p className="text-body font-semibold text-coral">{message}</p>
              </div>
            )}

            {agentState === 'clarify' && (
              <div className="space-y-3">
                <p className="text-body font-semibold">{clarifyQuestion}</p>
                {transcript && (
                  <p className="text-caption text-text-secondary italic">"{transcript}"</p>
                )}
                <p className="text-caption text-text-secondary">Tap the mic and answer</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}