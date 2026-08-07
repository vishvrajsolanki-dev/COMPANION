import React, { useState } from 'react';
import { useTasks, useSubjects } from '../../db/useDatabase';
import { db, Task, Subject } from '../../db/index';
import { useUIStore } from '../../store/uiStore';
import { todayISO, datePart } from '../../utils/date';
import { BottomSheet, SegmentedControl, GlassButton } from '../../components/ui';
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

  // Filter computation — real date engine (no simulated "Aug 5 2026")
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
    <div style={{ padding: 'var(--space-md)', paddingBottom: '90px', display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
      
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>Tasks</h2>
        <GlassButton size="sm" onClick={() => setIsAdding(true)}>
          <Plus size={16} /> Add Task
        </GlassButton>
      </div>

      {/* Filter Tabs */}
      <SegmentedControl
        options={[
          { value: 'all', label: 'All' },
          { value: 'today', label: 'Today' },
          { value: 'upcoming', label: 'Upcoming' },
        ]}
        value={activeFilter}
        onChange={f => setActiveFilter(f as 'all' | 'today' | 'upcoming')}
      />

      {/* Task List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
        {filteredTasks.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-tertiary)' }}>
            No tasks found.
          </div>
        ) : (
          filteredTasks.map(t => {
            const sub = subjects.find(s => s.id === t.subject_id);
            const isDone = t.status === 'completed';
            const isUrgent = t.priority === 'urgent';

            let priorityColor = 'var(--priority-low)';
            if (t.priority === 'medium') priorityColor = 'var(--priority-medium)';
            if (t.priority === 'high' || t.priority === 'urgent') priorityColor = 'var(--priority-high)';

            return (
              <div
                key={t.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-sm)',
                  padding: 'var(--space-md)',
                  paddingLeft: 'var(--space-lg)',
                  position: 'relative',
                  overflow: 'hidden',
                  backgroundColor: 'var(--surface-glass)',
                  backdropFilter: 'blur(var(--blur-glass)) saturate(1.4)',
                  WebkitBackdropFilter: 'blur(var(--blur-glass)) saturate(1.4)',
                  borderRadius: 'var(--radius-squircle)',
                  border: '1px solid var(--surface-glass-border)',
                  boxShadow: isUrgent && !isDone ? 'var(--shadow-glass), var(--shadow-glow)' : 'var(--shadow-glass)',
                  opacity: isDone ? 0.55 : 1,
                  transition: 'opacity 0.2s ease',
                }}
              >
                {/* Left gradient accent bar — turns neutral when completed */}
                <div
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: 3,
                    background: isDone ? 'var(--color-border)' : 'var(--gradient-accent)',
                  }}
                />

                {/* Checkbox — squircle */}
                <button
                  onClick={() => toggleTask(t.id, t.status)}
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 8,
                    border: isDone ? 'none' : '2px solid var(--color-border)',
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

                {/* Priority pill */}
                <span
                  style={{
                    flexShrink: 0,
                    fontSize: '0.6rem',
                    fontWeight: 700,
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                    padding: '3px 8px',
                    borderRadius: 'var(--radius-pill)',
                    backgroundColor: `${priorityColor}22`,
                    color: priorityColor,
                    border: `1px solid ${priorityColor}55`,
                  }}
                >
                  {t.priority}
                </span>

                {/* Details */}
                <div
                  onClick={() => setSelectedTaskId(t.id)}
                  style={{ flex: 1, cursor: 'pointer', minWidth: 0 }}
                >
                  <div style={{ fontSize: '0.95rem', fontWeight: 600, textDecoration: isDone ? 'line-through' : 'none', color: 'var(--color-text-primary)' }}>
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

                {/* Action Buttons (Emulates swipe actions) */}
                <div style={{ display: 'flex', gap: 4 }}>
                  <button
                    onClick={() => deleteTask(t.id)}
                    style={{ padding: 6, borderRadius: 8, color: 'var(--color-danger)', background: 'var(--color-danger-bg)' }}
                    title="Delete task"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Task Creation Sheet Drawer */}
      <BottomSheet open={isAdding} onClose={() => setIsAdding(false)}>
        <form
          onSubmit={handleCreateTask}
          style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}
        >
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Add New Task</h3>

            <input
              type="text"
              placeholder="Task Title"
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: 'var(--radius-card)',
                border: '1px solid var(--color-border)',
                backgroundColor: 'var(--color-bg-secondary)',
                color: 'var(--color-text-primary)',
                fontSize: '0.95rem'
              }}
              required
            />

            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Subject Connection</label>
              <select
                value={newSubjectId}
                onChange={e => setNewSubjectId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: 'var(--radius-card)',
                  border: '1px solid var(--color-border)',
                  backgroundColor: 'var(--color-bg-secondary)',
                  color: 'var(--color-text-primary)',
                  fontSize: '0.95rem',
                  marginTop: '4px'
                }}
              >
                <option value="">General (No Subject)</option>
                {subjects.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Due Date</label>
                <input
                  type="datetime-local"
                  value={newDueAt}
                  onChange={e => setNewDueAt(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: 'var(--radius-card)',
                    border: '1px solid var(--color-border)',
                    backgroundColor: 'var(--color-bg-secondary)',
                    color: 'var(--color-text-primary)',
                    fontSize: '0.95rem',
                    marginTop: '4px'
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Priority</label>
                <select
                  value={newPriority}
                  onChange={e => setNewPriority(e.target.value as any)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: 'var(--radius-card)',
                    border: '1px solid var(--color-border)',
                    backgroundColor: 'var(--color-bg-secondary)',
                    color: 'var(--color-text-primary)',
                    fontSize: '0.95rem',
                    marginTop: '4px'
                  }}
                >
                  <option value="low">Low (Gray)</option>
                  <option value="medium">Medium (Amber)</option>
                  <option value="high">High (Red)</option>
                  <option value="urgent">Urgent (Filled Badge)</option>
                </select>
              </div>
            </div>

            {dbError && (
              <div style={{ padding: '10px', borderRadius: 'var(--radius-card)', backgroundColor: 'var(--color-danger-bg)', color: 'var(--color-danger)', fontSize: '0.85rem', fontWeight: 600 }}>
                {dbError}
              </div>
            )}

            <div style={{ display: 'flex', gap: '8px', marginTop: 'var(--space-xs)' }}>
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
                    fontSize: '0.8rem', 
                    fontWeight: 700, 
                    color: selectedTaskSubject?.color || 'var(--color-text-secondary)',
                    backgroundColor: `${selectedTaskSubject?.color || 'var(--color-border)'}18`,
                    padding: '2px 8px',
                    borderRadius: '6px'
                  }}
                >
                  {selectedTaskSubject?.code || 'General'}
                </span>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--color-text-secondary)' }}>
                  {selectedTask.priority} Priority
                </span>
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginTop: '4px' }}>{selectedTask.title}</h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', backgroundColor: 'var(--color-bg-secondary)', borderRadius: '12px', border: '1px solid var(--color-border)' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>Due Date</span>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, fontFamily: 'var(--font-family-mono)' }}>
                  {new Date(selectedTask.due_at).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', backgroundColor: 'var(--color-bg-secondary)', borderRadius: '12px', border: '1px solid var(--color-border)' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>Status</span>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, textTransform: 'capitalize' }}>
                  {selectedTask.status}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', marginTop: 'var(--space-xs)' }}>
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
