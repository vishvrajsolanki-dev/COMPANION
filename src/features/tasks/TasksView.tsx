import React, { useState } from 'react';
import { useTasks, useSubjects } from '../../db/useDatabase';
import { db, Task, Subject } from '../../db/index';
import { useUIStore } from '../../store/uiStore';
import { 
  CheckSquare, Plus, Clock, AlertCircle, Trash2, Check,
  ChevronRight, Calendar, ArrowLeft
} from 'lucide-react';

export const TasksView: React.FC = () => {
  const tasks = useTasks() || [];
  const subjects = useSubjects() || [];

  const [activeFilter, setActiveFilter] = useState<'today' | 'upcoming' | 'all'>('all');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  
  // Create Task Form State
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newSubjectId, setNewSubjectId] = useState('');
  const [newDueAt, setNewDueAt] = useState('2026-08-05T23:59:00');
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
      setNewDueAt('2026-08-05T23:59:00');
      setNewPriority('medium');
      setIsAdding(false);
    } catch (err) {
      console.error('Failed to create task:', err);
      setDbError('Failed to save task. Please try again.');
    }
  };

  // Filter computation
  const filteredTasks = tasks.filter(t => {
    if (t.is_deleted) return false;
    
    // We assume current simulated local date is Aug 5, 2026
    const taskDateStr = t.due_at.split('T')[0];
    
    if (activeFilter === 'today') {
      return taskDateStr === '2026-08-05';
    } else if (activeFilter === 'upcoming') {
      return taskDateStr > '2026-08-05';
    }
    return true;
  });

  return (
    <div style={{ padding: 'var(--space-md)', paddingBottom: '90px', display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
      
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Tasks</h2>
        <button 
          onClick={() => setIsAdding(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            backgroundColor: 'var(--color-accent-primary)',
            color: '#ffffff',
            padding: '8px 12px',
            borderRadius: 'var(--radius-chip)',
            fontWeight: 600,
            fontSize: '0.85rem'
          }}
        >
          <Plus size={16} /> Add Task
        </button>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', backgroundColor: 'var(--color-bg-tertiary)', borderRadius: '10px', padding: '3px', gap: '2px' }}>
        {(['all', 'today', 'upcoming'] as const).map(f => (
          <button
            key={f}
            onClick={() => setActiveFilter(f)}
            style={{
              flex: 1,
              padding: '8px',
              borderRadius: '8px',
              fontSize: '0.85rem',
              fontWeight: 600,
              textTransform: 'capitalize',
              color: activeFilter === f ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
              backgroundColor: activeFilter === f ? 'var(--color-bg-primary)' : 'transparent',
              boxShadow: activeFilter === f ? '0 1px 3px rgba(0,0,0,0.06)' : 'none'
            }}
          >
            {f}
          </button>
        ))}
      </div>

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
                  backgroundColor: 'var(--color-bg-secondary)',
                  borderRadius: 'var(--radius-card)',
                  border: '1px solid var(--color-border)',
                  opacity: isDone ? 0.6 : 1,
                  position: 'relative'
                }}
              >
                {/* Checkbox */}
                <button
                  onClick={() => toggleTask(t.id, t.status)}
                  style={{
                    width: '22px',
                    height: '22px',
                    borderRadius: '6px',
                    border: isDone ? 'none' : '2px solid var(--color-border)',
                    backgroundColor: isDone ? 'var(--color-success)' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffffff'
                  }}
                >
                  {isDone && <Check size={14} />}
                </button>

                {/* Priority Indicator */}
                <div 
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: priorityColor
                  }}
                />

                {/* Details */}
                <div 
                  onClick={() => setSelectedTaskId(t.id)}
                  style={{ flex: 1, cursor: 'pointer' }}
                >
                  <div style={{ fontSize: '0.95rem', fontWeight: 600, textDecoration: isDone ? 'line-through' : 'none' }}>
                    {t.title}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                    {sub && (
                      <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-family-mono)', color: sub.color, fontWeight: 700 }}>
                        {sub.code}
                      </span>
                    )}
                    {isUrgent && (
                      <span style={{ fontSize: '0.65rem', fontWeight: 700, backgroundColor: 'var(--color-danger)', color: '#ffffff', padding: '1px 6px', borderRadius: '4px' }}>
                        URGENT
                      </span>
                    )}
                  </div>
                </div>

                {/* Action Buttons (Emulates swipe actions) */}
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button 
                    onClick={() => deleteTask(t.id)}
                    style={{ padding: '6px', borderRadius: '6px', color: 'var(--color-danger)' }}
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
      {isAdding && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.4)',
            backdropFilter: 'blur(4px)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center'
          }}
          onClick={() => setIsAdding(false)}
        >
          <form 
            onSubmit={handleCreateTask}
            style={{
              width: '100%',
              maxWidth: '500px',
              backgroundColor: 'var(--color-bg-primary)',
              borderTopLeftRadius: 'var(--radius-sheet)',
              borderTopRightRadius: 'var(--radius-sheet)',
              padding: 'var(--space-lg)',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-md)'
            }}
            onClick={e => e.stopPropagation()}
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
              <button
                type="submit"
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: 'var(--radius-card)',
                  backgroundColor: 'var(--color-accent-primary)',
                  color: '#ffffff',
                  fontWeight: 600,
                  fontSize: '0.9rem'
                }}
              >
                Create Task
              </button>
              <button 
                type="button"
                onClick={() => setIsAdding(false)}
                style={{
                  padding: '12px 20px',
                  borderRadius: 'var(--radius-card)',
                  backgroundColor: 'var(--color-bg-tertiary)',
                  fontWeight: 600,
                  fontSize: '0.9rem'
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Task Details Sheet */}
      {selectedTaskId && selectedTask && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.4)',
            backdropFilter: 'blur(4px)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center'
          }}
          onClick={() => setSelectedTaskId(null)}
        >
          <div 
            style={{
              width: '100%',
              maxWidth: '500px',
              backgroundColor: 'var(--color-bg-primary)',
              borderTopLeftRadius: 'var(--radius-sheet)',
              borderTopRightRadius: 'var(--radius-sheet)',
              padding: 'var(--space-lg)',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-md)'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ width: '36px', height: '4px', borderRadius: '2px', backgroundColor: 'var(--color-border)', alignSelf: 'center' }} />

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
              <button 
                onClick={() => {
                  toggleTask(selectedTask.id, selectedTask.status);
                  setSelectedTaskId(null);
                }}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: 'var(--radius-card)',
                  backgroundColor: selectedTask.status === 'completed' ? 'var(--color-bg-tertiary)' : 'var(--color-success)',
                  color: selectedTask.status === 'completed' ? 'var(--color-text-primary)' : '#ffffff',
                  fontWeight: 600,
                  fontSize: '0.9rem'
                }}
              >
                {selectedTask.status === 'completed' ? 'Mark Incomplete' : 'Mark Complete'}
              </button>
              <button 
                onClick={() => setSelectedTaskId(null)}
                style={{
                  padding: '12px 24px',
                  borderRadius: 'var(--radius-card)',
                  backgroundColor: 'var(--color-bg-tertiary)',
                  fontWeight: 600,
                  fontSize: '0.9rem'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default TasksView;
