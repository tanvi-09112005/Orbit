import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format, startOfMonth, endOfMonth, startOfDay, isSameDay } from 'date-fns'
import { Plus, Calendar, Users } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import { useFamilyStore } from '../stores/familyStore'
import { usePermissions } from '../layouts/AppLayout'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Avatar from '../components/ui/Avatar'
import Badge from '../components/ui/Badge'
import EmptyState from '../components/ui/EmptyState'
import Skeleton from '../components/ui/Skeleton'
import AddTaskSheet from '../components/AddTaskSheet'
import InviteMemberSheet from '../components/InviteMemberSheet'
import EditTaskSheet from '../components/EditTaskSheet'
import TaskCard from '../components/TaskCard'

export default function FamilyPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const { family, members, children } = useFamilyStore()
  const { role, permissions } = usePermissions()

  const [taskSheet, setTaskSheet] = useState(false)
  const [inviteSheet, setInviteSheet] = useState(false)
  const [editingTask, setEditingTask] = useState(null)

  const canEditTasks = role === 'parent' || (role === 'guardian' && permissions?.edit_tasks === true)
  const canAddEvents = role === 'parent'

  const getActiveTab = () => {
    if (location.pathname.includes('/tasks')) return 'tasks'
    if (location.pathname.includes('/members')) return 'members'
    return 'calendar'
  }
  const [activeTab, setActiveTab] = useState(getActiveTab())

  const tabs = [
    { id: 'calendar', label: 'Calendar' },
    { id: 'tasks', label: 'Tasks' },
    { id: 'members', label: 'Members' },
  ]

  // Only real joined members
  const activeMembers = members.filter((m) => m.user_id && m.joined_at)
  const myMember = activeMembers.find((m) => m.user_id === user?.id)
  const otherMembers = activeMembers.filter((m) => m.user_id !== user?.id)

  const { data: events = [], isLoading: eventsLoading } = useQuery({
    queryKey: ['events', 'month', family?.id],
    enabled: !!family?.id,
    queryFn: async () => {
      const now = new Date()
      const { data, error } = await supabase
        .from('events').select('*').eq('family_id', family.id)
        .gte('start_at', startOfDay(now).toISOString())
        .lte('start_at', endOfMonth(now).toISOString())
        .order('start_at')
      if (error) throw error
      return data
    },
  })

  const { data: tasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ['tasks', family?.id],
    enabled: !!family?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks').select('*').eq('family_id', family.id)
        .neq('status', 'done').order('due_date')
      if (error) throw error
      return data
    },
  })

  const completeTask = useMutation({
    mutationFn: async (taskId) => {
      const { error } = await supabase.from('tasks').update({ status: 'done' }).eq('id', taskId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', family?.id] })
      queryClient.invalidateQueries({ queryKey: ['tasks', 'today', family?.id] })
      queryClient.invalidateQueries({ queryKey: ['insights', 'balance', family?.id] })
    },
  })

  const deleteTask = useMutation({
    mutationFn: async (taskId) => {
      const { error } = await supabase.from('tasks').delete().eq('id', taskId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', family?.id] })
      queryClient.invalidateQueries({ queryKey: ['tasks', 'today', family?.id] })
    },
  })

  const myTasks = tasks.filter((t) => t.assigned_to === myMember?.id)
  const unassignedTasks = tasks.filter((t) => t.assigned_to === null)

  return (
    <>
      <div className="space-y-4 pt-4">
        {/* Tab Navigation */}
        <div className="flex gap-2 border-b border-border sticky top-0 bg-white z-10 -mx-5 px-5">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 text-h3 font-semibold transition-colors border-b-2 ${
                activeTab === tab.id
                  ? 'text-primary border-primary'
                  : 'text-text-secondary border-transparent hover:border-border'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* CALENDAR TAB */}
        {activeTab === 'calendar' && (
          <div className="space-y-3 pb-4">
            {eventsLoading ? (
              <>
                <Skeleton className="h-16 rounded-2xl" />
                <Skeleton className="h-16 rounded-2xl" />
                <Skeleton className="h-16 rounded-2xl" />
              </>
            ) : events.length > 0 ? (
              events.map((event) => {
                const child = children.find((c) => c.id === event.child_ids?.[0])
                const isEventToday = isSameDay(new Date(event.start_at), new Date())
                return (
                  <Card
                    key={event.id}
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => navigate(`/family/events/${event.id}`)}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-0.5">
                          {isEventToday && <Badge variant="coral">Today</Badge>}
                          <p className="text-body font-semibold">{event.title}</p>
                        </div>
                        <p className="text-caption text-text-secondary">
                          {format(new Date(event.start_at), 'EEE, d MMM • h:mm a')}
                        </p>
                      </div>
                      {child && (
                        <span
                          className="text-caption font-medium px-2 py-1 rounded-full text-white flex-shrink-0"
                          style={{ backgroundColor: child.color_hex }}
                        >
                          {child.name}
                        </span>
                      )}
                    </div>
                  </Card>
                )
              })
            ) : (
              <EmptyState
                icon={Calendar}
                title="No events scheduled"
                description="Add an event to organise your family calendar."
                action={canAddEvents && (
                  <Button onClick={() => navigate('/family/events/new')}>
                    <Plus size={18} /> Add Event
                  </Button>
                )}
              />
            )}
            {canAddEvents && (
              <Button className="w-full mt-2" onClick={() => navigate('/family/events/new')}>
                <Plus size={18} /> Add Event
              </Button>
            )}
          </div>
        )}

        {/* TASKS TAB */}
        {activeTab === 'tasks' && (
          <div className="space-y-5 pb-4">
            {tasksLoading ? (
              <Skeleton className="h-40 rounded-2xl" />
            ) : (
              <>
                {/* My Tasks */}
                <div>
                  <h3 className="text-h3 font-semibold mb-3 text-primary">
                    My Tasks
                  </h3>
                  {myTasks.length > 0 ? (
                    <div className="space-y-2">
                      {myTasks.map((task) => (
                        <TaskCard
                          key={task.id}
                          task={task}
                          linkedChild={children.find((c) => c.id === task.child_id)}
                          isOwn={true}
                          canEdit={canEditTasks}
                          onComplete={(id) => completeTask.mutate(id)}
                          onEdit={(t) => setEditingTask(t)}
                          onDelete={(id) => deleteTask.mutate(id)}
                        />
                      ))}
                    </div>
                  ) : (
                    <p className="text-body text-text-secondary">No tasks assigned to you</p>
                  )}
                </div>

                {/* Per-member task sections — dynamic, shows real names */}
                {otherMembers.map((member) => {
                  const memberTasks = tasks.filter((t) => t.assigned_to === member.id)
                  const memberName = member.profiles?.name || 'Member'
                  const isEditable = canEditTasks && role === 'parent'
                  return (
                    <div key={member.id}>
                      <h3 className="text-h3 font-semibold mb-3 text-primary">
                        {memberName}'s Tasks
                      </h3>
                      {memberTasks.length > 0 ? (
                        <div className="space-y-2">
                          {memberTasks.map((task) => (
                            <TaskCard
                              key={task.id}
                              task={task}
                              linkedChild={children.find((c) => c.id === task.child_id)}
                              isOwn={false}
                              canEdit={isEditable}
                              onComplete={() => {}}
                              onEdit={(t) => setEditingTask(t)}
                              onDelete={(id) => deleteTask.mutate(id)}
                            />
                          ))}
                        </div>
                      ) : (
                        <p className="text-body text-text-secondary">
                          No tasks assigned to {memberName}
                        </p>
                      )}
                    </div>
                  )
                })}

                {/* Unassigned Tasks */}
                {unassignedTasks.length > 0 && (
                  <div>
                    <h3 className="text-h3 font-semibold mb-3 text-primary">Unassigned</h3>
                    <div className="space-y-2">
                      {unassignedTasks.map((task) => (
                        <TaskCard
                          key={task.id}
                          task={task}
                          linkedChild={children.find((c) => c.id === task.child_id)}
                          isOwn={false}
                          canEdit={canEditTasks}
                          onComplete={() => {}}
                          onEdit={(t) => setEditingTask(t)}
                          onDelete={(id) => deleteTask.mutate(id)}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {canEditTasks && (
              <Button variant="secondary" className="w-full" onClick={() => setTaskSheet(true)}>
                <Plus size={18} /> Add Task
              </Button>
            )}
          </div>
        )}

        {/* MEMBERS TAB */}
        {activeTab === 'members' && (
          <div className="space-y-3 pb-4">
            {activeMembers.length > 0 ? (
              activeMembers.map((member) => (
                <Card
                  key={member.id}
                  className="flex items-center justify-between cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => navigate(`/profile/member/${member.id}`)}
                >
                  <div className="flex items-center gap-3">
                    <Avatar name={member.profiles?.name || 'Member'} size="md" />
                    <div>
                      <p className="text-body font-semibold">
                        {member.user_id === user?.id
                          ? `${member.profiles?.name || 'You'} (You)`
                          : member.profiles?.name || 'Member'}
                      </p>
                      <p className="text-caption text-text-secondary capitalize">{member.role}</p>
                    </div>
                  </div>
                  <Badge variant="primary">{member.role}</Badge>
                </Card>
              ))
            ) : (
              <EmptyState
                icon={Users}
                title="No members yet"
                description="Invite your partner or guardians to join."
              />
            )}
            {role === 'parent' && (
              <Button variant="secondary" className="w-full" onClick={() => setInviteSheet(true)}>
                <Plus size={18} /> Invite Someone
              </Button>
            )}
          </div>
        )}
      </div>

      <AddTaskSheet open={taskSheet} onClose={() => setTaskSheet(false)} />
      <InviteMemberSheet open={inviteSheet} onClose={() => setInviteSheet(false)} />
      {editingTask && <EditTaskSheet task={editingTask} onClose={() => setEditingTask(null)} />}
    </>
  )
}