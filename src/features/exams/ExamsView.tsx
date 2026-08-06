import React, { useState } from 'react';
import { useExams, useSubjects } from '../../db/useDatabase';
import { db, Exam, Subject } from '../../db/index';
import { useUIStore } from '../../store/uiStore';
import { ArrowLeft, Plus, Calendar, Clock, AlertTriangle, CheckSquare, Trash2 } from 'lucide-react';

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
  const [newDate, setNewDate] = useState('2026-08-15T10:00:00');
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
      setNewDate('2026-08-15T10:00:00');
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

  // Filter exams based on Simulated Time (August 5, 2026 11:30 AM)
  const simulatedNowStr = '2026-08-05T11:30:00';
  
  const filteredExams = exams.filter(e => {
    if (e.is_deleted) return false;
    if (activeFilter === 'upcoming') {
      return e.date >= simulatedNowStr;
    } else {
      return e.date < simulatedNowStr;
    }
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: 'var(--color-bg-primary)', paddingBottom: '80px' }}>
      
      {/* Header */}
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--space-md)', borderBottom: '1px solid var(--color-border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={closeSubview} style={{ color: 'var(--color-text-primary)' }}>
            <ArrowLeft size={24} />
          </button>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Exams & Quizzes</h2>
        </div>

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
          <Plus size={16} /> Add Exam
        </button>
      </header>

      {/* Filter Tabs */}
      <div style={{ padding: 'var(--space-md)' }}>
        <div style={{ display: 'flex', backgroundColor: 'var(--color-bg-tertiary)', borderRadius: '10px', padding: '3px', gap: '2px' }}>
          {(['upcoming', 'past'] as const).map(f => (
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
      </div>

      {/* Exam Cards Grid */}
      <div style={{ padding: '0 var(--space-md)', display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
        {filteredExams.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-tertiary)' }}>
            No exams scheduled.
          </div>
        ) : (
          filteredExams.map(exam => {
            const sub = subjects.find(s => s.id === exam.subject_id);
            if (!sub) return null;

            // Countdown calculation
            const examTime = new Date(exam.date).getTime();
            const nowTime = new Date(simulatedNowStr).getTime();
            const diffHours = (examTime - nowTime) / (1000 * 60 * 60);

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
                  padding: 'var(--space-md)',
                  backgroundColor: 'var(--color-bg-secondary)',
                  borderRadius: 'var(--radius-card)',
                  border: '1px solid var(--color-border)',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span 
                      style={{ 
                        fontFamily: 'var(--font-family-mono)', 
                        fontSize: '0.75rem', 
                        fontWeight: 700, 
                        color: sub.color,
                        backgroundColor: `${sub.color}15`,
                        padding: '1px 6px',
                        borderRadius: '4px'
                      }}
                    >
                      {sub.code}
                    </span>
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'capitalize', color: 'var(--color-text-secondary)' }}>
                      {exam.type}
                    </span>
                  </div>
                  <h4 style={{ fontWeight: 700, fontSize: '1rem', marginTop: '4px' }}>{sub.name}</h4>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', fontFamily: 'var(--font-family-mono)', marginTop: '2px' }}>
                    {new Date(exam.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>

                {activeFilter === 'upcoming' && (
                  <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                    <span style={{ fontFamily: 'var(--font-family-mono)', fontSize: '0.9rem', fontWeight: 700, color: countdownColor }}>
                      {diffHours > 0 ? `${Math.floor(diffHours)}h left` : 'Starting now'}
                    </span>
                    {isClose && <AlertTriangle size={14} color={countdownColor} />}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Add Exam Dialog */}
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
            onSubmit={handleCreateExam}
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
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Add Exam / Quiz</h3>

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
                    borderRadius: 'var(--radius-card)',
                    border: '1px solid var(--color-border)',
                    backgroundColor: 'var(--color-bg-secondary)',
                    color: 'var(--color-text-primary)',
                    fontSize: '0.95rem',
                    marginTop: '4px'
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
                    borderRadius: 'var(--radius-card)',
                    border: '1px solid var(--color-border)',
                    backgroundColor: 'var(--color-bg-secondary)',
                    color: 'var(--color-text-primary)',
                    fontSize: '0.95rem',
                    marginTop: '4px'
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
                  borderRadius: 'var(--radius-card)',
                  border: '1px solid var(--color-border)',
                  backgroundColor: 'var(--color-bg-secondary)',
                  color: 'var(--color-text-primary)',
                  fontSize: '0.95rem',
                  marginTop: '4px'
                }}
              />
            </div>

            {dbError && (
              <div style={{ padding: '10px', borderRadius: 'var(--radius-card)', backgroundColor: 'var(--color-danger-bg)', color: 'var(--color-danger)', fontSize: '0.85rem', fontWeight: 600 }}>
                {dbError}
              </div>
            )}

            <div style={{ display: 'flex', gap: '8px', marginTop: 'var(--space-xs)' }}>
              <button type="submit" style={{ flex: 1, padding: '12px', borderRadius: 'var(--radius-card)', backgroundColor: 'var(--color-accent-primary)', color: '#ffffff', fontWeight: 600, fontSize: '0.9rem' }}>
                Add Exam
              </button>
              <button type="button" onClick={() => setIsAdding(false)} style={{ padding: '12px 20px', borderRadius: 'var(--radius-card)', backgroundColor: 'var(--color-bg-tertiary)', fontWeight: 600, fontSize: '0.9rem' }}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Exam Details Sheet w/ Syllabus Checklist */}
      {selectedExamId && selectedExam && (
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
          onClick={() => setSelectedExamId(null)}
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
              gap: 'var(--space-md)',
              maxHeight: '90vh',
              overflowY: 'auto'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ width: '36px', height: '4px', borderRadius: '2px', backgroundColor: 'var(--color-border)', alignSelf: 'center' }} />

            <div>
              <span style={{ fontSize: '0.8rem', fontFamily: 'var(--font-family-mono)', color: selectedExamSubject?.color, fontWeight: 700 }}>
                {selectedExamSubject?.code} — {selectedExam.type.toUpperCase()}
              </span>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>{selectedExamSubject?.name}</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: 'var(--color-text-secondary)', fontFamily: 'var(--font-family-mono)', marginTop: '4px' }}>
                <Calendar size={14} />
                {new Date(selectedExam.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>

            {/* Syllabus Checklist */}
            <div>
              <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: '8px' }}>
                Syllabus Checklist
              </h4>
              
              {selectedExam.syllabus_checklist.length === 0 ? (
                <div style={{ fontSize: '0.85rem', color: 'var(--color-text-tertiary)' }}>No topics added yet.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {selectedExam.syllabus_checklist.map((item, idx) => (
                    <div 
                      key={idx}
                      onClick={() => toggleSyllabusItem(selectedExam.id, idx)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '10px',
                        backgroundColor: 'var(--color-bg-secondary)',
                        borderRadius: '8px',
                        border: '1px solid var(--color-border)',
                        cursor: 'pointer',
                        opacity: item.completed ? 0.6 : 1
                      }}
                    >
                      <button
                        style={{
                          width: '18px',
                          height: '18px',
                          borderRadius: '4px',
                          border: item.completed ? 'none' : '2px solid var(--color-border)',
                          backgroundColor: item.completed ? 'var(--color-success)' : 'transparent',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#ffffff'
                        }}
                      >
                        {item.completed && <CheckSquare size={12} />}
                      </button>
                      <span style={{ fontSize: '0.85rem', textDecoration: item.completed ? 'line-through' : 'none' }}>
                        {item.topic}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={() => handleDeleteExam(selectedExam.id)}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: 'var(--radius-card)',
                backgroundColor: 'var(--color-danger-bg)',
                color: 'var(--color-danger)',
                fontWeight: 600,
                fontSize: '0.9rem',
                marginTop: 'var(--space-xs)'
              }}
            >
              <Trash2 size={15} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} /> Delete Exam
            </button>
            <button
              onClick={() => setSelectedExamId(null)}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: 'var(--radius-card)',
                backgroundColor: 'var(--color-bg-tertiary)',
                fontWeight: 600,
                fontSize: '0.9rem',
                marginTop: 'var(--space-xs)'
              }}
            >
              Close Details
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
export default ExamsView;
