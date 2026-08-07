import React, { useState } from 'react';
import { useExams, useSubjects } from '../../db/useDatabase';
import { db } from '../../db/index';
import { useUIStore } from '../../store/uiStore';
import { todayISO, nowMinutes } from '../../utils/date';
import { BottomSheet, SegmentedControl, GlassButton, EmptyState } from '../../components/ui';
import { ArrowLeft, Plus, Calendar, AlertTriangle, Trash2, Check, BookOpen } from 'lucide-react';

export const ExamsView: React.FC = () => {
  const exams = useExams() || [];
  const subjects = useSubjects() || [];

  const closeSubview = useUIStore(state => state.closeSubview);

  const [activeFilter, setActiveFilter] = useState<'upcoming' | 'past'>('upcoming');
  const [selectedExamId, setSelectedExamId] = useState<string | null>(null);

  // Form State
  const [isAdding, setIsAdding] = useState(false);
  const [newSubjectId, setNewSubjectId] = useState('');
  const [newType, setNewType] = useState<'midsem' | 'endsem' | 'quiz'>('midsem');
  const [newDate, setNewDate] = useState(() => `${todayISO()}T10:00:00`);
  const [newSyllabusInput, setNewSyllabusInput] = useState('');

  const selectedExam = exams.find(e => e.id === selectedExamId);
  const selectedExamSubject = selectedExam ? subjects.find(s => s.id === selectedExam.subject_id) : null;

  const [dbError, setDbError] = useState<string | null>(null);

  const handleCreateExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubjectId) return;
    setDbError(null);

    try {
      const topicsList = newSyllabusInput
        .split(',')
        .map(t => t.trim())
        .filter(t => t.length > 0)
        .map(t => ({ topic: t, completed: false }));

      await db.exams.add({
        id: `exam-${Date.now()}`,
        subject_id: newSubjectId,
        type: newType,
        date: newDate,
        syllabus_checklist: topicsList,
        is_deleted: false
      });

      setNewSubjectId('');
      setNewType('midsem');
      setNewDate(`${todayISO()}T10:00:00`);
      setNewSyllabusInput('');
      setIsAdding(false);
    } catch (err) {
      console.error('Failed to create exam:', err);
      setDbError('Failed to save exam. Please try again.');
    }
  };

  const handleDeleteExam = async (examId: string) => {
    const exam = exams.find(e => e.id === examId);
    if (!exam) return;
    const sub = subjects.find(s => s.id === exam.subject_id);
    if (!confirm(`Delete ${sub?.name || 'this exam'} (${exam.type})?`)) return;
    try {
      await db.exams.update(examId, { is_deleted: true });
      setSelectedExamId(null);
    } catch (err) {
      console.error('Failed to delete exam:', err);
      setDbError('Failed to delete exam. Please try again.');
    }
  };

  const toggleSyllabusItem = async (examId: string, index: number) => {
    const exam = exams.find(e => e.id === examId);
    if (!exam) return;

    try {
      const updatedChecklist = [...exam.syllabus_checklist];
      updatedChecklist[index].completed = !updatedChecklist[index].completed;
      await db.exams.update(examId, { syllabus_checklist: updatedChecklist });
    } catch (err) {
      console.error('Failed to update syllabus:', err);
    }
  };

  // Real date engine — no simulated timestamp
  const nowStr = `${todayISO()}T${nowMinutes()}`;

  const filteredExams = exams.filter(e => {
    if (e.is_deleted) return false;
    if (activeFilter === 'upcoming') {
      return e.date >= nowStr;
    } else {
      return e.date < nowStr;
    }
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: 'var(--color-bg-primary)', paddingBottom: '80px' }}>

      {/* Header */}
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--space-md)', borderBottom: '1px solid var(--color-border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={closeSubview} style={{ color: 'var(--color-text-primary)' }}>
            <ArrowLeft size={24} />
          </button>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>Exams & Quizzes</h2>
        </div>

        <GlassButton size="sm" onClick={() => setIsAdding(true)}>
          <Plus size={16} /> Add Exam
        </GlassButton>
      </header>

      {/* Filter Tabs */}
      <div style={{ padding: 'var(--space-md)' }}>
        <SegmentedControl
          options={[
            { value: 'upcoming', label: 'Upcoming' },
            { value: 'past', label: 'Past' },
          ]}
          value={activeFilter}
          onChange={f => setActiveFilter(f as 'upcoming' | 'past')}
        />
      </div>

      {/* Exam Cards */}
      <div style={{ padding: '0 var(--space-md)', display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
        {filteredExams.length === 0 ? (
          <EmptyState
            title="No exams scheduled"
            body="Add an exam or quiz to start tracking your revision checklist."
          />
        ) : (
          filteredExams.map(exam => {
            const sub = subjects.find(s => s.id === exam.subject_id);
            if (!sub) return null;

            // Countdown — real now
            const examTime = new Date(exam.date).getTime();
            const nowTime = new Date(nowStr).getTime();
            const diffHours = (examTime - nowTime) / (1000 * 60 * 60);
            const diffDays = Math.floor(diffHours / 24);

            let countdownColor = 'var(--color-text-secondary)';
            let isClose = false;

            if (activeFilter === 'upcoming') {
              if (diffHours < 24) {
                countdownColor = 'var(--color-danger)';
                isClose = true;
              } else if (diffHours < 48) {
                countdownColor = 'var(--color-warning)';
                isClose = true;
              }
            }

            return (
              <div
                key={exam.id}
                role="button"
                data-exam-id={exam.id}
                data-exam-date={exam.date}
                onClick={() => setSelectedExamId(exam.id)}
                style={{
                  position: 'relative',
                  overflow: 'hidden',
                  padding: 'var(--space-md)',
                  paddingLeft: 'var(--space-lg)',
                  backgroundColor: 'var(--surface-glass)',
                  backdropFilter: 'blur(var(--blur-glass)) saturate(1.4)',
                  WebkitBackdropFilter: 'blur(var(--blur-glass)) saturate(1.4)',
                  borderRadius: 'var(--radius-squircle)',
                  border: '1px solid var(--surface-glass-border)',
                  boxShadow: isClose ? 'var(--shadow-glass), var(--shadow-glow)' : 'var(--shadow-glass)',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 'var(--space-sm)',
                }}
              >
                {/* Left gradient accent bar */}
                <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: 'var(--gradient-accent)' }} />

                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span
                      style={{
                        fontFamily: 'var(--font-family-mono)',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        color: sub.color,
                        backgroundColor: `${sub.color}18`,
                        padding: '2px 8px',
                        borderRadius: 'var(--radius-pill)',
                      }}
                    >
                      {sub.code}
                    </span>
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'capitalize', color: 'var(--color-text-secondary)' }}>
                      {exam.type === 'midsem' ? 'Mid-Sem' : exam.type === 'endsem' ? 'End-Sem' : 'Quiz'}
                    </span>
                  </div>
                  <h4 style={{ fontWeight: 700, fontSize: '1rem', marginTop: 4, color: 'var(--color-text-primary)' }}>{sub.name}</h4>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', fontFamily: 'var(--font-family-mono)', marginTop: 2 }}>
                    {new Date(exam.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>

                {activeFilter === 'upcoming' && (
                  <div
                    style={{
                      flexShrink: 0,
                      textAlign: 'center',
                      padding: '6px 12px',
                      borderRadius: 'var(--radius-pill)',
                      backgroundColor: `${countdownColor}1A`,
                      border: `1px solid ${countdownColor}44`,
                    }}
                  >
                    <div style={{ fontFamily: 'var(--font-family-mono)', fontSize: '0.9rem', fontWeight: 700, color: countdownColor }}>
                      {diffHours > 0 ? (diffDays > 0 ? `${diffDays}d left` : `${Math.floor(diffHours)}h left`) : 'Starting now'}
                    </div>
                    {isClose && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', color: countdownColor, justifyContent: 'center', marginTop: 1 }}>
                        <AlertTriangle size={11} /> Close
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Add Exam Sheet */}
      <BottomSheet open={isAdding} onClose={() => setIsAdding(false)}>
        <form
          onSubmit={handleCreateExam}
          style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}
        >
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>Add Exam / Quiz</h3>

          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Subject Connection</label>
            <select
              value={newSubjectId}
              onChange={e => setNewSubjectId(e.target.value)}
              className="input-like"
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: 'var(--radius-btn)',
                border: '1px solid var(--color-border)',
                backgroundColor: 'var(--surface-glass)',
                color: 'var(--color-text-primary)',
                fontSize: '0.95rem',
                marginTop: 4,
              }}
              required
            >
              <option value="">Select Subject</option>
              {subjects.map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Exam Type</label>
              <select
                value={newType}
                onChange={e => setNewType(e.target.value as any)}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: 'var(--radius-btn)',
                  border: '1px solid var(--color-border)',
                  backgroundColor: 'var(--surface-glass)',
                  color: 'var(--color-text-primary)',
                  fontSize: '0.95rem',
                  marginTop: 4,
                }}
              >
                <option value="midsem">Mid-Semester</option>
                <option value="endsem">End-Semester</option>
                <option value="quiz">Quiz</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Date & Time</label>
              <input
                type="datetime-local"
                value={newDate}
                onChange={e => setNewDate(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: 'var(--radius-btn)',
                  border: '1px solid var(--color-border)',
                  backgroundColor: 'var(--surface-glass)',
                  color: 'var(--color-text-primary)',
                  fontSize: '0.95rem',
                  marginTop: 4,
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Syllabus Topics (comma separated)</label>
            <input
              type="text"
              placeholder="Topic A, Topic B, Topic C"
              value={newSyllabusInput}
              onChange={e => setNewSyllabusInput(e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: 'var(--radius-btn)',
                border: '1px solid var(--color-border)',
                backgroundColor: 'var(--surface-glass)',
                color: 'var(--color-text-primary)',
                fontSize: '0.95rem',
                marginTop: 4,
              }}
            />
          </div>

          {dbError && (
            <div style={{ padding: 10, borderRadius: 'var(--radius-chip)', backgroundColor: 'var(--color-danger-bg)', color: 'var(--color-danger)', fontSize: '0.85rem', fontWeight: 600 }}>
              {dbError}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, marginTop: 'var(--space-xs)' }}>
            <GlassButton type="submit" style={{ flex: 1 }}>
              Add Exam
            </GlassButton>
            <GlassButton type="button" variant="ghost" onClick={() => setIsAdding(false)}>
              Cancel
            </GlassButton>
          </div>
        </form>
      </BottomSheet>

      {/* Exam Details Sheet w/ Syllabus Checklist */}
      <BottomSheet open={!!selectedExamId} onClose={() => setSelectedExamId(null)}>
        {selectedExam && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            <div>
              <span style={{ fontSize: '0.8rem', fontFamily: 'var(--font-family-mono)', color: selectedExamSubject?.color, fontWeight: 700 }}>
                {selectedExamSubject?.code} — {selectedExam.type.toUpperCase()}
              </span>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>{selectedExamSubject?.name}</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', color: 'var(--color-text-secondary)', fontFamily: 'var(--font-family-mono)', marginTop: 4 }}>
                <Calendar size={14} />
                {new Date(selectedExam.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>

            {/* Syllabus Checklist */}
            <div>
              <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: 8 }}>
                Syllabus Checklist
              </h4>

              {selectedExam.syllabus_checklist.length === 0 ? (
                <EmptyState title="No topics yet" body="No syllabus topics added for this exam." />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {selectedExam.syllabus_checklist.map((item, idx) => (
                    <div
                      key={idx}
                      onClick={() => toggleSyllabusItem(selectedExam.id, idx)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: 10,
                        backgroundColor: 'var(--surface-glass)',
                        backdropFilter: 'blur(var(--blur-glass))',
                        WebkitBackdropFilter: 'blur(var(--blur-glass))',
                        borderRadius: 'var(--radius-squircle)',
                        border: '1px solid var(--surface-glass-border)',
                        cursor: 'pointer',
                        opacity: item.completed ? 0.6 : 1,
                      }}
                    >
                      <span
                        style={{
                          width: 20,
                          height: 20,
                          borderRadius: 7,
                          border: item.completed ? 'none' : '2px solid var(--color-border)',
                          backgroundColor: item.completed ? 'var(--color-success)' : 'transparent',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'var(--color-on-accent)',
                          flexShrink: 0,
                        }}
                      >
                        {item.completed && <Check size={12} />}
                      </span>
                      <span style={{ fontSize: '0.85rem', textDecoration: item.completed ? 'line-through' : 'none', color: 'var(--color-text-primary)' }}>
                        {item.topic}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 'var(--space-xs)' }}>
              <GlassButton variant="danger" onClick={() => handleDeleteExam(selectedExam.id)}>
                <Trash2 size={15} /> Delete Exam
              </GlassButton>
              <GlassButton variant="ghost" onClick={() => setSelectedExamId(null)}>
                <BookOpen size={15} /> Close Details
              </GlassButton>
            </div>
          </div>
        )}
      </BottomSheet>
    </div>
  );
};
export default ExamsView;
