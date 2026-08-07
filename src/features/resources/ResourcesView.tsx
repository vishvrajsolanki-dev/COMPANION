import React, { useState } from 'react';
import { useResources, useSubjects } from '../../db/useDatabase';
import { db } from '../../db/index';
import { useUIStore } from '../../store/uiStore';
import { GlassButton, BottomSheet, EmptyState } from '../../components/ui';
import { ArrowLeft, Plus, ExternalLink, Github, FileText, Globe, Link, Trash2 } from 'lucide-react';

const TYPE_ICON = {
  pdf:    FileText,
  drive:  Link,
  github: Github,
  url:    Globe,
  other:  ExternalLink,
};

const TYPE_COLOR: Record<string, string> = {
  pdf:    'var(--color-danger)',
  drive:  'var(--color-info)',
  github: 'var(--color-secondary)',
  url:    'var(--color-success)',
  other:  'var(--color-warning)',
};

export const ResourcesView: React.FC = () => {
  const resources = useResources() || [];
  const subjects  = useSubjects()  || [];
  const closeSubview = useUIStore(state => state.closeSubview);

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
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: 'var(--bg-page)', paddingBottom: '80px' }}>

      {/* Header */}
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--space-md)', paddingTop: 'calc(var(--space-md) + env(safe-area-inset-top))', borderBottom: '1px solid var(--border-hairline)', backgroundColor: 'var(--bg-page)', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={closeSubview} style={{ color: 'var(--text-primary)' }}>
            <ArrowLeft size={24} />
          </button>
          <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--text-primary)' }}>Resources Shelf</h2>
        </div>
        <GlassButton size="sm" onClick={() => setIsAdding(true)}>
          <Plus size={16} /> Add
        </GlassButton>
      </header>

      {/* Subject filter pills */}
      <div style={{ padding: 'var(--space-md) var(--space-md) 0', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <button
          onClick={() => setFilterSubjectId('')}
          style={{ padding: '6px 12px', borderRadius: 'var(--radius-pill)', fontSize: '0.8rem', fontWeight: 600, backgroundColor: filterSubjectId === '' ? 'var(--color-primary)' : 'var(--bg-card)', color: filterSubjectId === '' ? '#ffffff' : 'var(--text-secondary)', border: filterSubjectId === '' ? '1px solid var(--color-primary)' : '1px solid var(--border-hairline)' }}
        >
          All
        </button>
        {subjects.map(s => (
          <button
            key={s.id}
            onClick={() => setFilterSubjectId(s.id)}
            style={{ padding: '6px 12px', borderRadius: 'var(--radius-pill)', fontSize: '0.8rem', fontWeight: 600, backgroundColor: filterSubjectId === s.id ? s.color : 'var(--bg-card)', color: filterSubjectId === s.id ? '#ffffff' : s.color, border: `1px solid ${s.color}40` }}
          >
            {s.code}
          </button>
        ))}
      </div>

      {/* Resource list grouped by subject */}
      <div style={{ padding: 'var(--space-md)', display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
        {Object.keys(grouped).length === 0 ? (
          <EmptyState
            icon={<Link size={40} />}
            title="No resources yet"
            body="Tap + to add course slides, GitHub links, or PDFs."
          />
        ) : (
          Object.entries(grouped).map(([subjectId, items]) => {
            const sub = subjects.find(s => s.id === subjectId);
            return (
              <div key={subjectId}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: sub?.color || 'var(--text-muted)' }} />
                  <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{sub?.name || 'Removed Subject'}</span>
                  {sub && (
                    <span style={{ fontFamily: 'var(--font-family-mono)', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{sub.code}</span>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {items.map(r => {
                    const Icon = TYPE_ICON[r.type] || ExternalLink;
                    const iconColor = TYPE_COLOR[r.type] || 'var(--text-secondary)';
                    return (
                      <div
                        key={r.id}
                        style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px var(--space-md)', backgroundColor: 'var(--bg-card)', borderRadius: 'var(--radius-card)', border: '1px solid var(--border-hairline)', boxShadow: 'var(--shadow-card)' }}
                      >
                        <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: 'var(--bg-card-tint)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Icon size={18} color={iconColor} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.title}</div>
                          {r.description && <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '1px' }}>{r.description}</div>}
                        </div>
                        <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                          <a
                            href={r.url_or_file_ref}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: 'var(--radius-pill)', backgroundColor: 'var(--bg-card-tint)', color: 'var(--color-primary)' }}
                          >
                            <ExternalLink size={15} />
                          </a>
                          <button
                            onClick={() => handleDelete(r.id)}
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: 'var(--radius-pill)', backgroundColor: 'var(--color-danger-bg)', color: 'var(--color-danger)' }}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
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
          <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>Add Resource</h3>

            <input type="text" placeholder="Resource title" value={newTitle} onChange={e => setNewTitle(e.target.value)} required className="input" />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Subject</label>
                <select value={newSubjectId} onChange={e => setNewSubjectId(e.target.value)} required className="input" style={{ marginTop: 4 }}>
                  <option value="">Select</option>
                  {subjects.map(s => <option key={s.id} value={s.id}>{s.code}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Type</label>
                <select value={newType} onChange={e => setNewType(e.target.value as any)} className="input" style={{ marginTop: 4 }}>
                  <option value="url">URL</option>
                  <option value="pdf">PDF</option>
                  <option value="drive">Drive</option>
                  <option value="github">GitHub</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            <input type="url" placeholder="https://..." value={newUrl} onChange={e => setNewUrl(e.target.value)} required className="input" />
            <input type="text" placeholder="Short description (optional)" value={newDesc} onChange={e => setNewDesc(e.target.value)} className="input" />

            {dbError && (
              <div style={{ padding: '10px', borderRadius: 'var(--radius-card)', backgroundColor: 'var(--color-danger-bg)', color: 'var(--color-danger)', fontSize: '0.85rem', fontWeight: 600 }}>
                {dbError}
              </div>
            )}

            <div style={{ display: 'flex', gap: '8px' }}>
              <GlassButton type="submit" style={{ flex: 1 }}>Save Resource</GlassButton>
              <GlassButton type="button" variant="ghost" onClick={() => setIsAdding(false)}>Cancel</GlassButton>
            </div>
          </form>
        </BottomSheet>
      )}
    </div>
  );
};
export default ResourcesView;
