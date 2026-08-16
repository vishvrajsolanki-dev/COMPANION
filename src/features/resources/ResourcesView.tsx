import React, { useState } from 'react';
import { useResources, useSubjects } from '../../db/useDatabase';
import { db } from '../../db/index';
import { navigateTo, CANONICAL_HASHES } from '../../hooks/useHashLocation';
import { Button, Card, BottomSheet, EmptyState } from '../../components/ui';
import { ArrowLeft, Plus, ExternalLink, Github, FileText, Globe, Link, Trash2 } from 'lucide-react';

const TYPE_ICON = {
  pdf:    FileText,
  drive:  Link,
  github: Github,
  url:    Globe,
  other:  ExternalLink,
};

const TYPE_COLOR: Record<string, string> = {
  pdf:    'var(--error, #ba1a1a)',
  drive:  'var(--primary, #001e4c)',
  github: 'var(--secondary, #5a54a4)',
  url:    'var(--success-attendance, #0f336d)',
  other:  'var(--color-warning, #d97706)',
};

export const ResourcesView: React.FC = () => {
  const resources = useResources() || [];
  const subjects  = useSubjects()  || [];
  const closeSubview = () => navigateTo(CANONICAL_HASHES.studyTasks);

  const [filterSubjectId, setFilterSubjectId] = useState<string>('');
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle]     = useState('');
  const [newSubjectId, setNewSubjectId] = useState('');
  const [newType, setNewType]       = useState<'pdf' | 'drive' | 'github' | 'url' | 'other'>('url');
  const [newUrl, setNewUrl]         = useState('');
  const [newDesc, setNewDesc]       = useState('');

  const filtered = resources.filter(r => {
    if (r.is_deleted) return false;
    if (filterSubjectId && r.subject_id !== filterSubjectId) return false;
    return true;
  });

  // Group by subject
  const grouped: Record<string, typeof filtered> = {};
  filtered.forEach(r => {
    if (!grouped[r.subject_id]) grouped[r.subject_id] = [];
    grouped[r.subject_id].push(r);
  });

  const [dbError, setDbError] = useState<string | null>(null);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newSubjectId || !newUrl.trim()) return;
    setDbError(null);

    try {
      await db.resources.add({
        id:               `res-${Date.now()}`,
        subject_id:       newSubjectId,
        title:            newTitle.trim(),
        type:             newType,
        url_or_file_ref:  newUrl.trim(),
        description:      newDesc.trim() || undefined,
        is_deleted:       false,
      });
      setNewTitle(''); setNewSubjectId(''); setNewType('url'); setNewUrl(''); setNewDesc('');
      setIsAdding(false);
    } catch (err) {
      console.error('Failed to add resource:', err);
      setDbError('Failed to save resource. Please try again.');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await db.resources.update(id, { is_deleted: true });
    } catch (err) {
      console.error('Failed to delete resource:', err);
      setDbError('Failed to delete resource. Please try again.');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-page)' }} data-testid="resources-view">
      <h1 className="sr-only">Resources Shelf</h1>

      {/* Header */}
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
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
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--on-surface, #1a1c1c)', fontFamily: 'var(--font-primary)' }}>Resources Shelf</h2>
        </div>
        <Button size="sm" variant="primary" onClick={() => setIsAdding(true)}>
          <Plus size={16} /> Add
        </Button>
      </header>

      {/* Subject filter pills */}
      <div style={{ padding: 'var(--stack-md, 16px) var(--stack-md, 16px) 0', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <button
          onClick={() => setFilterSubjectId('')}
          style={{
            padding: '8px 16px',
            borderRadius: 'var(--radius-full, 9999px)',
            fontSize: '0.8rem',
            fontWeight: 700,
            fontFamily: 'var(--font-primary)',
            backgroundColor: filterSubjectId === '' ? 'var(--primary, #001e4c)' : 'var(--surface-container-low, #f4f3f2)',
            color: filterSubjectId === '' ? 'var(--on-primary, #ffffff)' : 'var(--on-surface, #1a1c1c)',
            border: filterSubjectId === '' ? 'none' : '1px solid var(--outline-variant, #c4c6d1)',
            minHeight: '36px',
            cursor: 'pointer',
          }}
        >
          All
        </button>
        {subjects.map(s => (
          <button
            key={s.id}
            onClick={() => setFilterSubjectId(s.id)}
            style={{
              padding: '8px 16px',
              borderRadius: 'var(--radius-full, 9999px)',
              fontSize: '0.8rem',
              fontWeight: 600,
              fontFamily: 'var(--font-mono)',
              backgroundColor: filterSubjectId === s.id ? s.color : 'var(--surface-container-low, #f4f3f2)',
              color: filterSubjectId === s.id ? '#ffffff' : s.color,
              border: `1px solid ${s.color}40`,
              minHeight: '36px',
              cursor: 'pointer',
            }}
          >
            {s.code}
          </button>
        ))}
      </div>

      {/* Resource list grouped by subject */}
      <div style={{ padding: 'var(--stack-md, 16px)', display: 'flex', flexDirection: 'column', gap: 'var(--stack-lg, 32px)' }}>
        {Object.keys(grouped).length === 0 ? (
          <EmptyState
            icon={<Link size={40} />}
            title="No resources yet"
            body="Tap + Add to link course slides, GitHub links, or PDFs."
          />
        ) : (
          Object.entries(grouped).map(([subjectId, items]) => {
            const sub = subjects.find(s => s.id === subjectId);
            return (
              <div key={subjectId}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: sub?.color || 'var(--on-surface-variant, #444750)' }} />
                  <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--on-surface, #1a1c1c)', fontFamily: 'var(--font-primary)' }}>{sub?.name || 'Removed Subject'}</span>
                  {sub && (
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--on-surface-variant, #444750)' }}>{sub.code}</span>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--stack-sm, 8px)' }}>
                  {items.map(r => {
                    const Icon = TYPE_ICON[r.type] || ExternalLink;
                    const iconColor = TYPE_COLOR[r.type] || 'var(--on-surface-variant, #444750)';
                    return (
                      <Card
                        key={r.id}
                        style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', minHeight: '64px' }}
                      >
                        <div style={{ width: '38px', height: '38px', borderRadius: '10px', backgroundColor: 'var(--surface-container-low, #f4f3f2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Icon size={18} color={iconColor} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--on-surface, #1a1c1c)', fontFamily: 'var(--font-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.title}</div>
                          {r.description && <div style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant, #444750)', marginTop: '2px' }}>{r.description}</div>}
                        </div>
                        <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                          <a
                            href={r.url_or_file_ref}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: 44,
                              height: 44,
                              borderRadius: 'var(--radius-full, 9999px)',
                              color: 'var(--primary, #001e4c)',
                              textDecoration: 'none',
                            }}
                            aria-label={`Open link for ${r.title}`}
                          >
                            <ExternalLink size={18} />
                          </a>
                          <button
                            onClick={() => handleDelete(r.id)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: 44,
                              height: 44,
                              borderRadius: 'var(--radius-full, 9999px)',
                              color: 'var(--error, #ba1a1a)',
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                            }}
                            aria-label={`Delete resource ${r.title}`}
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add Resource Sheet */}
      {isAdding && (
        <BottomSheet open onClose={() => setIsAdding(false)}>
          <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--stack-md, 16px)' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--on-surface, #1a1c1c)', fontFamily: 'var(--font-primary)' }}>Add Resource</h3>

            <div>
              <label style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--on-surface-variant, #444750)', fontFamily: 'var(--font-mono)' }}>Title</label>
              <input type="text" placeholder="Resource title" value={newTitle} onChange={e => setNewTitle(e.target.value)} required className="input" style={{ marginTop: 6, width: '100%', minHeight: '44px' }} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 'var(--stack-md, 16px)' }}>
              <div>
                <label style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--on-surface-variant, #444750)', fontFamily: 'var(--font-mono)' }}>Subject</label>
                <select value={newSubjectId} onChange={e => setNewSubjectId(e.target.value)} required className="input" style={{ marginTop: 6, width: '100%', minHeight: '44px' }}>
                  <option value="">Select</option>
                  {subjects.map(s => <option key={s.id} value={s.id}>{s.code}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--on-surface-variant, #444750)', fontFamily: 'var(--font-mono)' }}>Type</label>
                <select value={newType} onChange={e => setNewType(e.target.value as any)} className="input" style={{ marginTop: 6, width: '100%', minHeight: '44px' }}>
                  <option value="url">URL</option>
                  <option value="pdf">PDF</option>
                  <option value="drive">Drive</option>
                  <option value="github">GitHub</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--on-surface-variant, #444750)', fontFamily: 'var(--font-mono)' }}>URL or File Reference</label>
              <input type="url" placeholder="https://..." value={newUrl} onChange={e => setNewUrl(e.target.value)} required className="input" style={{ marginTop: 6, width: '100%', minHeight: '44px' }} />
            </div>

            <div>
              <label style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--on-surface-variant, #444750)', fontFamily: 'var(--font-mono)' }}>Description (Optional)</label>
              <input type="text" placeholder="Short description" value={newDesc} onChange={e => setNewDesc(e.target.value)} className="input" style={{ marginTop: 6, width: '100%', minHeight: '44px' }} />
            </div>

            {dbError && (
              <div style={{ padding: '10px 14px', borderRadius: 'var(--radius-md, 8px)', backgroundColor: 'var(--error-container, #ffdad6)', color: 'var(--on-error-container, #93000a)', fontSize: '0.85rem', fontWeight: 600 }}>
                {dbError}
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
              <Button type="submit" variant="primary" style={{ flex: 1 }}>Save Resource</Button>
              <Button type="button" variant="ghost" onClick={() => setIsAdding(false)}>Cancel</Button>
            </div>
          </form>
        </BottomSheet>
      )}
    </div>
  );
};
export default ResourcesView;
