import React, { useState } from 'react';
import { useTasks, useSubjects } from '../../db/useDatabase';
import { db } from '../../db/index';
import { todayISO, datePart } from '../../utils/date';
import { navigateTo, CANONICAL_HASHES } from '../../hooks/useHashLocation';
import { BottomSheet, SegmentedControl, Button, Card, Badge } from '../../components/ui';
import { Plus, Trash2, Check, BookOpen, Calendar, Folder, BarChart2 } from 'lucide-react';

export const TasksView: React.FC = () => {
  const tasks = useTasks() || [];
  const subjects = useSubjects() || [];

  const [activeFilter, setActiveFilter] = useState<'today' | 'upcoming' | 'all'>('all');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  // Create Task Form State
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newSubjectId, setNewSubjectId] = useState('');
  const [newDueDate, setNewDueDate] = useState(() => todayISO());
  const [newDueTime, setNewDueTime] = useState('23:59');
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
    if (!newDueDate || !newDueTime) {
      setDbError('Please choose a due date & time for the task.');
      return;
    }
    setDbError(null);

    try {
      await db.tasks.add({
        id: `task-${Date.now()}`,
        subject_id: newSubjectId || undefined,
        title: newTitle,
        due_at: `${newDueDate}T${newDueTime}:00`,
        priority: newPriority,
        status: 'todo',
        is_deleted: false,
      });

      setNewTitle('');
      setNewSubjectId('');
      setNewDueDate(todayISO());
      setNewDueTime('23:59');
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
    <div style={{ display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-page)' }} data-testid="tasks-view">
      <h1 className="sr-only">Tasks</h1>
      {/* Screen header */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: 'var(--stack-md, 16px)',
          paddingTop: 'calc(var(--stack-md, 16px) + env(safe-area-inset-top))',
          borderBottom: '1px solid var(--outline-variant, #c4c6d1)',
          backgroundColor: 'var(--surface-container-lowest, #ffffff)',
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}
      >
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--on-surface, #1a1c1c)', fontFamily: 'var(--font-primary)' }}>Study Hub</h2>
          <div style={{ fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--on-surface-variant, #444750)', fontFamily: 'var(--font-mono)' }}>
            Tasks & Coursework
          </div>
        </div>
        <Button size="sm" variant="primary" onClick={() => setIsAdding(true)}>
          <Plus size={16} /> Add Task
        </Button>
      </header>

      {/* Subview Quick Links */}
      <div style={{ display: 'flex', gap: '8px', padding: '12px 16px 4px', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        <button
          onClick={() => navigateTo(CANONICAL_HASHES.studyTasks)}
          style={{
            padding: '8px 16px',
            borderRadius: 'var(--radius-full, 9999px)',
            fontSize: '0.8rem',
            fontWeight: 700,
            fontFamily: 'var(--font-primary)',
            backgroundColor: 'var(--primary, #001e4c)',
            color: 'var(--on-primary, #ffffff)',
            border: 'none',
            minHeight: '36px',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          Tasks
        </button>
        <button
          onClick={() => navigateTo(CANONICAL_HASHES.studyNotes)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 16px',
            borderRadius: 'var(--radius-full, 9999px)',
            fontSize: '0.8rem',
            fontWeight: 600,
            fontFamily: 'var(--font-primary)',
            backgroundColor: 'var(--surface-container-low, #f4f3f2)',
            color: 'var(--on-surface, #1a1c1c)',
            border: '1px solid var(--outline-variant, #c4c6d1)',
            minHeight: '36px',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          <BookOpen size={14} /> Notes
        </button>
        <button
          onClick={() => navigateTo(CANONICAL_HASHES.studyExams)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 16px',
            borderRadius: 'var(--radius-full, 9999px)',
            fontSize: '0.8rem',
            fontWeight: 600,
            fontFamily: 'var(--font-primary)',
            backgroundColor: 'var(--surface-container-low, #f4f3f2)',
            color: 'var(--on-surface, #1a1c1c)',
            border: '1px solid var(--outline-variant, #c4c6d1)',
            minHeight: '36px',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          <Calendar size={14} /> Exams
        </button>
        <button
          onClick={() => navigateTo(CANONICAL_HASHES.studyResources)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 16px',
            borderRadius: 'var(--radius-full, 9999px)',
            fontSize: '0.8rem',
            fontWeight: 600,
            fontFamily: 'var(--font-primary)',
            backgroundColor: 'var(--surface-container-low, #f4f3f2)',
            color: 'var(--on-surface, #1a1c1c)',
            border: '1px solid var(--outline-variant, #c4c6d1)',
            minHeight: '36px',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          <Folder size={14} /> Resources
        </button>
        <button
          onClick={() => navigateTo(CANONICAL_HASHES.studyAnalytics)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 16px',
            borderRadius: 'var(--radius-full, 9999px)',
            fontSize: '0.8rem',
            fontWeight: 600,
            fontFamily: 'var(--font-primary)',
            backgroundColor: 'var(--surface-container-low, #f4f3f2)',
            color: 'var(--on-surface, #1a1c1c)',
            border: '1px solid var(--outline-variant, #c4c6d1)',
            minHeight: '36px',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          <BarChart2 size={14} /> Analytics
        </button>
      </div>

      {/* Filter Tabs */}
      <div style={{ padding: 'var(--stack-sm, 8px) var(--stack-md, 16px)' }}>
        <SegmentedControl
          options={[
            { value: 'all', label: 'All Tasks' },
            { value: 'today', label: 'Due Today' },
            { value: 'upcoming', label: 'Upcoming' },
          ]}
          value={activeFilter}
          onChange={f => setActiveFilter(f as 'all' | 'today' | 'upcoming')}
        />
      </div>

      <div style={{ padding: '0 var(--stack-md, 16px)', display: 'flex', flexDirection: 'column', gap: 'var(--stack-md, 16px)' }}>
        {/* Task List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--stack-sm, 8px)' }}>
          {filteredTasks.length === 0 ? (
            <Card style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--on-surface-variant, #444750)', fontSize: '0.9rem' }}>
              No tasks found. Tap "+ Add Task" to create one.
            </Card>
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
                    backgroundColor: 'var(--surface-container-lowest, #ffffff)',
                    borderRadius: 'var(--radius-lg, 12px)',
                    border: '1px solid var(--outline-variant, #c4c6d1)',
                    padding: 'var(--stack-md, 16px)',
                    paddingLeft: 'calc(var(--stack-md, 16px) + 4px)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    minHeight: '64px',
                    opacity: isDone ? 0.6 : 1,
                    transition: 'opacity 0.2s ease',
                  }}
                >
                  {/* Left 4px accent bar */}
                  <div
                    style={{
                      position: 'absolute',
                      left: 0,
                      top: 0,
                      bottom: 0,
                      width: 4,
                      background: isDone ? 'var(--outline-variant, #c4c6d1)' : isUrgent ? 'var(--error, #ba1a1a)' : (sub?.color || 'var(--primary-container, #1b3462)'),
                    }}
                  />

                  {/* Checkbox button — 44px touch target */}
                  <button
                    onClick={() => toggleTask(t.id, t.status)}
                    style={{
                      width: 44,
                      height: 44,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      flexShrink: 0,
                    }}
                    aria-label={isDone ? "Mark incomplete" : "Mark complete"}
                  >
                    <div
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: 6,
                        border: isDone ? 'none' : '2px solid var(--outline, #747781)',
                        backgroundColor: isDone ? 'var(--primary, #001e4c)' : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--on-primary, #ffffff)',
                      }}
                    >
                      {isDone && <Check size={14} strokeWidth={3} />}
                    </div>
                  </button>

                  {/* Details */}
                  <div
                    onClick={() => setSelectedTaskId(t.id)}
                    style={{ flex: 1, cursor: 'pointer', minWidth: 0 }}
                  >
                    <div style={{ fontSize: '0.95rem', fontWeight: 600, textDecoration: isDone ? 'line-through' : 'none', color: 'var(--on-surface, #1a1c1c)', fontFamily: 'var(--font-primary)' }}>
                      {t.title}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: 4, flexWrap: 'wrap' }}>
                      {sub && (
                        <span style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: sub.color, fontWeight: 700 }}>
                          {sub.code}
                        </span>
                      )}
                      {t.due_at && (
                        <span style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: 'var(--on-surface-variant, #444750)' }}>
                          Due: {new Date(t.due_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      )}
                    </div>
                  </div>

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

                  {/* Delete button — 44px touch target */}
                  <button
                    onClick={() => deleteTask(t.id)}
                    style={{
                      width: 44,
                      height: 44,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: 'var(--radius-md, 8px)',
                      color: 'var(--error, #ba1a1a)',
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      flexShrink: 0,
                    }}
                    title="Delete task"
                    aria-label="Delete task"
                  >
                    <Trash2 size={18} />
                  </button>
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
          style={{ display: 'flex', flexDirection: 'column', gap: 'var(--stack-md, 16px)' }}
        >
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--on-surface, #1a1c1c)', fontFamily: 'var(--font-primary)' }}>Add New Task</h3>

          <div>
            <label style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--on-surface-variant, #444750)', fontFamily: 'var(--font-mono)' }}>Task Title</label>
            <input
              type="text"
              placeholder="e.g. Complete assignment 3"
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              className="input"
              style={{ marginTop: 6, width: '100%', minHeight: '44px' }}
              required
            />
          </div>

          <div>
            <label style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--on-surface-variant, #444750)', fontFamily: 'var(--font-mono)' }}>Subject Connection</label>
            <select
              value={newSubjectId}
              onChange={e => setNewSubjectId(e.target.value)}
              className="input"
              style={{ marginTop: 6, width: '100%', minHeight: '44px' }}
            >
              <option value="">General (No Subject)</option>
              {subjects.map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 'var(--stack-md, 16px)' }}>
            <div>
              <label style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--on-surface-variant, #444750)', fontFamily: 'var(--font-mono)' }}>Due Date</label>
              <input
                type="date"
                value={newDueDate}
                onChange={e => setNewDueDate(e.target.value)}
                required
                className="input"
                style={{ marginTop: 6, width: '100%', minHeight: '44px' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--on-surface-variant, #444750)', fontFamily: 'var(--font-mono)' }}>Due Time</label>
              <input
                type="time"
                value={newDueTime}
                onChange={e => setNewDueTime(e.target.value)}
                required
                className="input"
                style={{ marginTop: 6, width: '100%', minHeight: '44px' }}
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--on-surface-variant, #444750)', fontFamily: 'var(--font-mono)' }}>Priority</label>
            <select
              value={newPriority}
              onChange={e => setNewPriority(e.target.value as any)}
              className="input"
              style={{ marginTop: 6, width: '100%', minHeight: '44px' }}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>

          {dbError && (
            <div style={{ padding: '10px 14px', borderRadius: 'var(--radius-md, 8px)', backgroundColor: 'var(--error-container, #ffdad6)', color: 'var(--on-error-container, #93000a)', fontSize: '0.85rem', fontWeight: 600 }}>
              {dbError}
            </div>
          )}

          <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
            <Button type="submit" variant="primary" style={{ flex: 1 }}>
              Create Task
            </Button>
            <Button type="button" variant="ghost" onClick={() => setIsAdding(false)}>
              Cancel
            </Button>
          </div>
        </form>
      </BottomSheet>

      {/* Task Details Sheet */}
      {selectedTaskId && selectedTask && (
        <BottomSheet open onClose={() => setSelectedTaskId(null)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--stack-md, 16px)' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: 'var(--radius-full, 9999px)',
                    color: selectedTaskSubject?.color || 'var(--on-surface-variant, #444750)',
                    backgroundColor: `${selectedTaskSubject?.color || 'var(--surface-container, #eeeeed)'}20`,
                  }}
                >
                  {selectedTaskSubject?.code || 'General'}
                </span>
                <span style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--on-surface-variant, #444750)', fontFamily: 'var(--font-mono)' }}>
                  {selectedTask.priority} Priority
                </span>
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginTop: '6px', color: 'var(--on-surface, #1a1c1c)', fontFamily: 'var(--font-primary)' }}>{selectedTask.title}</h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', backgroundColor: 'var(--surface-container-low, #f4f3f2)', borderRadius: 'var(--radius-md, 8px)', border: '1px solid var(--outline-variant, #c4c6d1)' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--on-surface-variant, #444750)' }}>Due Date</span>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, fontFamily: 'var(--font-mono)', color: 'var(--on-surface, #1a1c1c)' }}>
                  {selectedTask.due_at ? new Date(selectedTask.due_at).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : 'No due date set'}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', backgroundColor: 'var(--surface-container-low, #f4f3f2)', borderRadius: 'var(--radius-md, 8px)', border: '1px solid var(--outline-variant, #c4c6d1)' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--on-surface-variant, #444750)' }}>Status</span>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, textTransform: 'capitalize', color: 'var(--on-surface, #1a1c1c)' }}>
                  {selectedTask.status.replace('_', ' ')}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
              <Button
                variant={selectedTask.status === 'completed' ? 'subtle' : 'success'}
                style={{ flex: 1 }}
                onClick={() => {
                  toggleTask(selectedTask.id, selectedTask.status);
                  setSelectedTaskId(null);
                }}
              >
                {selectedTask.status === 'completed' ? 'Mark Incomplete' : 'Mark Complete'}
              </Button>
              <Button variant="ghost" onClick={() => setSelectedTaskId(null)}>
                Close
              </Button>
            </div>
          </div>
        </BottomSheet>
      )}
    </div>
  );
};
export default TasksView;
