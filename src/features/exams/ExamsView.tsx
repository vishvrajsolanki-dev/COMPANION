import React, { useState } from 'react';
import { useExams, useSubjects } from '../../db/useDatabase';
import { db } from '../../db/index';
import { todayISO, nowMinutes } from '../../utils/date';
import { navigateTo, CANONICAL_HASHES } from '../../hooks/useHashLocation';
import { BottomSheet, SegmentedControl, Button, Card, EmptyState, ConfirmDialog } from '../../components/ui';
import { ArrowLeft, Plus, Calendar, AlertTriangle, Trash2, Check, BookOpen } from 'lucide-react';

export const ExamsView: React.FC = () => {
  const exams = useExams() || [];
  const subjects = useSubjects() || [];

  const closeSubview = () => navigateTo(CANONICAL_HASHES.studyTasks);

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
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const handleCreateExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubjectId) return;
    if (!newDate) {
      setDbError('Please choose a date & time for the exam.');
      return;
    }
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
    try {
      await db.exams.update(examId, { is_deleted: true });
      setSelectedExamId(null);
      setPendingDeleteId(null);
    } catch (err) {
      console.error('Failed to delete exam:', err);
      setDbError('Failed to delete exam. Please try again.');
    }
  };

  const toggleSyllabusItem = async (examId: string, index: number) => {
    try {
      await db.exams.update(examId, (exam) => {
        exam.syllabus_checklist = (exam.syllabus_checklist || []).map((item, i) =>
          i === index ? { ...item, completed: !item.completed } : item
        );
      });
    } catch (err) {
      console.error('Failed to update syllabus:', err);
    }
  };

  // Real date engine
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
    <div style={{ display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-page)' }} data-testid="exams-view">
      <h1 className="sr-only">Exams</h1>

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
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={closeSubview}
            style={{
              width: 44,
              height: 44,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--on-surface, #1a1c1c)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
            }}
            aria-label="Go back"
          >
            <ArrowLeft size={24} />
          </button>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--on-surface, #1a1c1c)', fontFamily: 'var(--font-primary)' }}>Exams & Quizzes</h2>
        </div>

        <Button size="sm" variant="primary" onClick={() => setIsAdding(true)}>
          <Plus size={16} /> Add Exam
        </Button>
      </header>

      {/* Filter Tabs */}
      <div style={{ padding: 'var(--stack-sm, 8px) var(--stack-md, 16px)' }}>
        <SegmentedControl
          options={[
            { value: 'upcoming', label: 'Upcoming Exams' },
            { value: 'past', label: 'Past Exams' },
          ]}
          value={activeFilter}
          onChange={f => setActiveFilter(f as 'upcoming' | 'past')}
        />
      </div>

      {/* Exam Cards */}
      <div style={{ padding: '0 var(--stack-md, 16px)', display: 'flex', flexDirection: 'column', gap: 'var(--stack-sm, 8px)' }}>
        {filteredExams.length === 0 ? (
          <EmptyState
            title="No exams scheduled"
            body="Add an exam or quiz to start tracking your revision checklist."
          />
        ) : (
          filteredExams.map(exam => {
            const sub = subjects.find(s => s.id === exam.subject_id);
            if (!sub) return null;

            // Countdown
            const examTime = new Date(exam.date).getTime();
            const nowTime = new Date(nowStr).getTime();
            const diffHours = (examTime - nowTime) / (1000 * 60 * 60);
            const diffDays = Math.floor(diffHours / 24);

            let countdownColor = 'var(--on-surface-variant, #444750)';
            let isClose = false;

            if (activeFilter === 'upcoming') {
              if (diffHours < 24) {
                countdownColor = 'var(--error, #ba1a1a)';
                isClose = true;
              } else if (diffHours < 48) {
                countdownColor = 'var(--color-warning, #d97706)';
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
                  padding: 'var(--stack-md, 16px)',
                  paddingLeft: 'calc(var(--stack-md, 16px) + 4px)',
                  backgroundColor: 'var(--surface-container-lowest, #ffffff)',
                  borderRadius: 'var(--radius-lg, 12px)',
                  border: '1px solid var(--outline-variant, #c4c6d1)',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 'var(--stack-sm, 8px)',
                  minHeight: '64px',
                }}
              >
                {/* Left 4px accent bar in subject color */}
                <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, background: sub.color }} />

                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        color: sub.color,
                        backgroundColor: `${sub.color}1A`,
                        padding: '2px 8px',
                        borderRadius: 'var(--radius-full, 9999px)',
                      }}
                    >
                      {sub.code}
                    </span>
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'capitalize', color: 'var(--on-surface-variant, #444750)' }}>
                      {exam.type === 'midsem' ? 'Mid-Sem' : exam.type === 'endsem' ? 'End-Sem' : 'Quiz'}
                    </span>
                  </div>
                  <h4 style={{ fontWeight: 700, fontSize: '1rem', marginTop: 4, color: 'var(--on-surface, #1a1c1c)', fontFamily: 'var(--font-primary)' }}>{sub.name}</h4>
                  <div style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant, #444750)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
                    {exam.date ? new Date(exam.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'No date set'}
                  </div>
                </div>

                {activeFilter === 'upcoming' && (
                  <div
                    style={{
                      flexShrink: 0,
                      textAlign: 'center',
                      padding: '6px 12px',
                      borderRadius: 'var(--radius-full, 9999px)',
                      backgroundColor: isClose ? `${countdownColor}1A` : 'var(--surface-container-low, #f4f3f2)',
                      border: `1px solid ${isClose ? `${countdownColor}44` : 'var(--outline-variant, #c4c6d1)'}`,
                    }}
                  >
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', fontWeight: 700, color: isClose ? countdownColor : 'var(--primary, #001e4c)' }}>
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
          style={{ display: 'flex', flexDirection: 'column', gap: 'var(--stack-md, 16px)' }}
        >
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--on-surface, #1a1c1c)', fontFamily: 'var(--font-primary)' }}>Add Exam / Quiz</h3>

          <div>
            <label style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--on-surface-variant, #444750)', fontFamily: 'var(--font-mono)' }}>Subject Connection</label>
            <select
              value={newSubjectId}
              onChange={e => setNewSubjectId(e.target.value)}
              className="input"
              style={{ marginTop: 6, width: '100%', minHeight: '44px' }}
              required
            >
              <option value="">Select Subject</option>
              {subjects.map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 'var(--stack-md, 16px)' }}>
            <div>
              <label style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--on-surface-variant, #444750)', fontFamily: 'var(--font-mono)' }}>Exam Type</label>
              <select
                value={newType}
                onChange={e => setNewType(e.target.value as any)}
                className="input"
                style={{ marginTop: 6, width: '100%', minHeight: '44px' }}
              >
                <option value="midsem">Mid-Semester</option>
                <option value="endsem">End-Semester</option>
                <option value="quiz">Quiz</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--on-surface-variant, #444750)', fontFamily: 'var(--font-mono)' }}>Date & Time</label>
              <input
                type="datetime-local"
                value={newDate}
                onChange={e => setNewDate(e.target.value)}
                required
                className="input"
                style={{ marginTop: 6, width: '100%', minHeight: '44px' }}
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--on-surface-variant, #444750)', fontFamily: 'var(--font-mono)' }}>Syllabus Topics (comma separated)</label>
            <input
              type="text"
              placeholder="Topic A, Topic B, Topic C"
              value={newSyllabusInput}
              onChange={e => setNewSyllabusInput(e.target.value)}
              className="input"
              style={{ marginTop: 6, width: '100%', minHeight: '44px' }}
            />
          </div>

          {dbError && (
            <div style={{ padding: '10px 14px', borderRadius: 'var(--radius-md, 8px)', backgroundColor: 'var(--error-container, #ffdad6)', color: 'var(--on-error-container, #93000a)', fontSize: '0.85rem', fontWeight: 600 }}>
              {dbError}
            </div>
          )}

          <div style={{ display: 'flex', gap: 12, marginTop: '8px' }}>
            <Button type="submit" variant="primary" style={{ flex: 1 }}>
              Add Exam
            </Button>
            <Button type="button" variant="ghost" onClick={() => setIsAdding(false)}>
              Cancel
            </Button>
          </div>
        </form>
      </BottomSheet>

      {/* Exam Details Sheet w/ Syllabus Checklist */}
      <BottomSheet open={!!selectedExamId} onClose={() => setSelectedExamId(null)}>
        {selectedExam && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--stack-md, 16px)' }}>
            <div>
              <span style={{ fontSize: '0.8rem', fontFamily: 'var(--font-mono)', color: selectedExamSubject?.color, fontWeight: 700 }}>
                {selectedExamSubject?.code} — {selectedExam.type.toUpperCase()}
              </span>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--on-surface, #1a1c1c)', fontFamily: 'var(--font-primary)' }}>{selectedExamSubject?.name}</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', color: 'var(--on-surface-variant, #444750)', fontFamily: 'var(--font-mono)', marginTop: 4 }}>
                <Calendar size={14} />
                {selectedExam.date ? new Date(selectedExam.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'No date set'}
              </div>
            </div>

            {/* Syllabus Checklist */}
            <div>
              <h4 style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--on-surface-variant, #444750)', fontFamily: 'var(--font-mono)', marginBottom: 8 }}>
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
                        gap: 12,
                        padding: '12px 16px',
                        backgroundColor: 'var(--surface-container-low, #f4f3f2)',
                        borderRadius: 'var(--radius-md, 8px)',
                        border: '1px solid var(--outline-variant, #c4c6d1)',
                        cursor: 'pointer',
                        opacity: item.completed ? 0.6 : 1,
                        minHeight: '44px',
                      }}
                    >
                      <span
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: 6,
                          border: item.completed ? 'none' : '2px solid var(--outline, #747781)',
                          backgroundColor: item.completed ? 'var(--primary, #001e4c)' : 'transparent',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'var(--on-primary, #ffffff)',
                          flexShrink: 0,
                        }}
                      >
                        {item.completed && <Check size={14} strokeWidth={3} />}
                      </span>
                      <span style={{ fontSize: '0.85rem', textDecoration: item.completed ? 'line-through' : 'none', color: 'var(--on-surface, #1a1c1c)' }}>
                        {item.topic}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: '8px' }}>
              <Button variant="danger" onClick={() => setPendingDeleteId(selectedExam.id)}>
                <Trash2 size={15} /> Delete Exam
              </Button>
              <Button variant="ghost" onClick={() => setSelectedExamId(null)}>
                <BookOpen size={15} /> Close Details
              </Button>
            </div>
          </div>
        )}
      </BottomSheet>

      {/* Delete confirmation */}
      <ConfirmDialog
        open={!!pendingDeleteId}
        title={`Delete ${subjects.find(s => s.id === exams.find(e => e.id === pendingDeleteId)?.subject_id)?.name ?? 'this exam'}?`}
        message="The exam and its syllabus checklist will be permanently removed."
        confirmLabel="Delete Exam"
        onConfirm={() => { if (pendingDeleteId) handleDeleteExam(pendingDeleteId); }}
        onCancel={() => setPendingDeleteId(null)}
      />
    </div>
  );
};
export default ExamsView;
