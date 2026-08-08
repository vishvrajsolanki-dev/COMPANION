import React, { useState } from 'react';
import { useTasks, useSubjects } from '../../db/useDatabase';
import { db } from '../../db/index';
import { useUIStore } from '../../store/uiStore';
import { todayISO, datePart } from '../../utils/date';
import { BottomSheet, SegmentedControl, GlassButton, GlassCard, Badge } from '../../components/ui';
import { Plus, Trash2, Check } from 'lucide-react';

export const TasksView: React.FC = () => {
  const tasks = useTasks() || [];
  const subjects = useSubjects() || [];

  const [activeFilter, setActiveFilter] = useState<'today' | 'upcoming' | 'all'>('all');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  // Create Task Form State
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newSubjectId, setNewSubjectId] = useState('');
  const [newDueAt, setNewDueAt] = useState(() => `${todayISO()}T23:59:00`);
  const [newPriority, setNewPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');

  const selectedTask = tasks.find(t => t.id === selectedTaskId);
  const selectedTaskSubject = selectedTask ? subjects.find(s => s.id === selectedTask.subject_id) : null;

  const [dbError, setDbError] = useState<string | null>(null);

  const toggleTask = async (id: string, currentStatus: 'todo' | 'in_progress' | 'completed') => {
    const newStatus = currentStatus === 'completed' ? 'todo' : 'completed';
    try {
      await db.tasks.update(id, { status: newStatus });
    } catch (err) {
      console.error('Failed to update task:', err);
      setDbError('Failed to update task.');
    }
  };

  const deleteTask = async (id: string) => {
    try {
      await db.tasks.update(id, { is_deleted: true });
      if (selectedTaskId === id) setSelectedTaskId(null);
    } catch (err) {
      console.error('Failed to delete task:', err);
      setDbError('Failed to delete task.');
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    if (!newDueAt) {
      setDbError('Please choose a due date & time for the task.');
      return;
    }
    setDbError(null);

    try {
      await db.tasks.add({
        id: `task-${Date.now()}`,
        subject_id: newSubjectId || undefined,
        title: newTitle,
        due_at: newDueAt,
        priority: newPriority,
        status: 'todo',
        is_deleted: false,
      });

      setNewTitle('');
      setNewSubjectId('');
      setNewDueAt(`${todayISO()}T23:59:00`);
      setNewPriority('medium');
      setIsAdding(false);
    } catch (err) {
      console.error('Failed to create task:', err);
      setDbError('Failed to save task. Please try again.');
    }
  };

  // Filter computation — real date engine
  const filteredTasks = tasks.filter(t => {
    if (t.is_deleted) return false;

    const taskDateStr = datePart(t.due_at);

    if (activeFilter === 'today') {
      return taskDateStr === todayISO();
    } else if (activeFilter === 'upcoming') {
      return taskDateStr > todayISO();
    }
    return true;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: 'var(--bg-page)', paddingBottom: '80px' }}>
      <h1 className="sr-only">Tasks</h1>
      {/* Screen header */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: 'var(--space-md)',
          paddingTop: 'calc(var(--space-md) + env(safe-area-inset-top))',
          borderBottom: '1px solid var(--border-hairline)',
          backgroundColor: 'var(--bg-page)',
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}
      >
        <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--text-primary)' }}>Tasks</h2>
        <GlassButton size="sm" onClick={() => setIsAdding(true)}>
          <Plus size={16} /> Add Task
        </GlassButton>
      </header>

      {/* Filter Tabs */}
      <div style={{ padding: 'var(--space-sm) var(--space-md)' }}>
        <SegmentedControl
          options={[
            { value: 'all', label: 'All' },
            { value: 'today', label: 'Today' },
            { value: 'upcoming', label: 'Upcoming' },
          ]}
          value={activeFilter}
          onChange={f => setActiveFilter(f as 'all' | 'today' | 'upcoming')}
        />
      </div>

      <div style={{ padding: '0 var(--space-md)', display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
        {/* Task List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
          {filteredTasks.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              No tasks found.
            </div>
          ) : (
            filteredTasks.map(t => {
              const sub = subjects.find(s => s.id === t.subject_id);
              const isDone = t.status === 'completed';
              const isUrgent = t.priority === 'urgent';

              return (
                <div
                  key={t.id}
                  style={{
                    position: 'relative',
                    overflow: 'hidden',
                    backgroundColor: 'var(--bg-card)',
                    borderRadius: 'var(--radius-card)',
                    border: '1px solid var(--border-hairline)',
                    boxShadow: 'var(--shadow-card)',
                    padding: 'var(--space-md)',
                    paddingLeft: 'calc(var(--space-md) + 4px)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-sm)',
                    opacity: isDone ? 0.55 : 1,
                    transition: 'opacity 0.2s ease',
                  }}
                >
                  {/* Left accent bar — neutral when done */}
                  <div
                    style={{
                      position: 'absolute',
                      left: 0,
                      top: 0,
                      bottom: 0,
                      width: 3,
                      background: isDone ? 'var(--neutral-200, #E2E8F0)' : isUrgent ? 'var(--color-danger)' : 'var(--color-primary)',
                    }}
                  />

                  {/* Checkbox */}
                  <button
                    onClick={() => toggleTask(t.id, t.status)}
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 8,
                      border: isDone ? 'none' : '2px solid var(--border-hairline)',
                      backgroundColor: isDone ? 'var(--color-success)' : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--color-on-accent)',
                      flexShrink: 0,
                    }}
                  >
                    {isDone && <Check size={14} />}
                  </button>

                  {/* Priority badge */}
                  <Badge
                    tone={
                      t.priority === 'urgent' || t.priority === 'high'
                        ? 'danger'
                        : t.priority === 'medium'
                        ? 'warning'
                        : 'neutral'
                    }
                  >
                    {t.priority}
                  </Badge>

                  {/* Details */}
                  <div
                    onClick={() => setSelectedTaskId(t.id)}
                    style={{ flex: 1, cursor: 'pointer', minWidth: 0 }}
                  >
                    <div style={{ fontSize: '0.95rem', fontWeight: 600, textDecoration: isDone ? 'line-through' : 'none', color: 'var(--text-primary)' }}>
                      {t.title}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: 2 }}>
                      {sub && (
                        <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-family-mono)', color: sub.color, fontWeight: 700 }}>
                          {sub.code}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button
                      onClick={() => deleteTask(t.id)}
                      style={{ padding: 6, borderRadius: 8, color: 'var(--color-danger)', background: 'var(--color-danger-bg)' }}
                      title="Delete task"
                      aria-label="Delete task"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Task Creation Sheet */}
      <BottomSheet open={isAdding} onClose={() => setIsAdding(false)}>
        <form
          onSubmit={handleCreateTask}
          style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}
        >
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>Add New Task</h3>

          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Task Title</label>
            <input
              type="text"
              placeholder="e.g. Complete assignment 3"
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              className="input"
              style={{ marginTop: 4 }}
              required
            />
          </div>

          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Subject Connection</label>
            <select
              value={newSubjectId}
              onChange={e => setNewSubjectId(e.target.value)}
              className="input"
              style={{ marginTop: 4 }}
            >
              <option value="">General (No Subject)</option>
              {subjects.map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Due Date</label>
              <input
                type="datetime-local"
                value={newDueAt}
                onChange={e => setNewDueAt(e.target.value)}
                required
                className="input"
                style={{ marginTop: 4 }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Priority</label>
              <select
                value={newPriority}
                onChange={e => setNewPriority(e.target.value as any)}
                className="input"
                style={{ marginTop: 4 }}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>

          {dbError && (
            <div style={{ padding: '10px', borderRadius: 'var(--radius-card)', backgroundColor: 'var(--color-danger-bg)', color: 'var(--color-danger)', fontSize: '0.85rem', fontWeight: 600 }}>
              {dbError}
            </div>
          )}

          <div style={{ display: 'flex', gap: '8px' }}>
            <GlassButton type="submit" style={{ flex: 1 }}>
              Create Task
            </GlassButton>
            <GlassButton type="button" variant="ghost" onClick={() => setIsAdding(false)}>
              Cancel
            </GlassButton>
          </div>
        </form>
      </BottomSheet>

      {/* Task Details Sheet */}
      {selectedTaskId && selectedTask && (
        <BottomSheet open onClose={() => setSelectedTaskId(null)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    fontFamily: 'var(--font-family-mono)',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: 'var(--radius-pill)',
                    color: selectedTaskSubject?.color || 'var(--text-secondary)',
                    backgroundColor: `${selectedTaskSubject?.color || 'var(--neutral-100)'}1A`,
                  }}
                >
                  {selectedTaskSubject?.code || 'General'}
                </span>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)' }}>
                  {selectedTask.priority} Priority
                </span>
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginTop: '4px', color: 'var(--text-primary)' }}>{selectedTask.title}</h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', backgroundColor: 'var(--bg-card)', borderRadius: 'var(--radius-card)', border: '1px solid var(--border-hairline)' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Due Date</span>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, fontFamily: 'var(--font-family-mono)', color: 'var(--text-primary)' }}>
                  {selectedTask.due_at ? new Date(selectedTask.due_at).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : 'No due date set'}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', backgroundColor: 'var(--bg-card)', borderRadius: 'var(--radius-card)', border: '1px solid var(--border-hairline)' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Status</span>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, textTransform: 'capitalize', color: 'var(--text-primary)' }}>
                  {selectedTask.status.replace('_', ' ')}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <GlassButton
                variant={selectedTask.status === 'completed' ? 'subtle' : 'success'}
                style={{ flex: 1 }}
                onClick={() => {
                  toggleTask(selectedTask.id, selectedTask.status);
                  setSelectedTaskId(null);
                }}
              >
                {selectedTask.status === 'completed' ? 'Mark Incomplete' : 'Mark Complete'}
              </GlassButton>
              <GlassButton variant="ghost" onClick={() => setSelectedTaskId(null)}>
                Close
              </GlassButton>
            </div>
          </div>
        </BottomSheet>
      )}
    </div>
  );
};
export default TasksView;
