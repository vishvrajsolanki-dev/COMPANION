import React, { useState } from 'react';
import { useResources, useSubjects } from '../../db/useDatabase';
import { db } from '../../db/index';
import { useUIStore } from '../../store/uiStore';
import { ArrowLeft, Plus, ExternalLink, Github, FileText, Globe, Link, Trash2 } from 'lucide-react';

const TYPE_ICON = {
  pdf:    FileText,
  drive:  Link,
  github: Github,
  url:    Globe,
  other:  ExternalLink,
};

const TYPE_COLOR: Record<string, string> = {
  pdf:    '#EF4444',
  drive:  '#3B82F6',
  github: '#8B5CF6',
  url:    '#10B981',
  other:  '#F59E0B',
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

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newSubjectId || !newUrl.trim()) return;
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
  };

  const handleDelete = async (id: string) => {
    await db.resources.update(id, { is_deleted: true });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: 'var(--color-bg-primary)', paddingBottom: '80px' }}>
      
      {/* Header */}
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--space-md)', borderBottom: '1px solid var(--color-border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={closeSubview} style={{ color: 'var(--color-text-primary)' }}>
            <ArrowLeft size={24} />
          </button>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Resources Shelf</h2>
        </div>
        <button
          onClick={() => setIsAdding(true)}
          style={{ display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: 'var(--color-accent-primary)', color: '#ffffff', padding: '8px 12px', borderRadius: 'var(--radius-chip)', fontWeight: 600, fontSize: '0.85rem' }}
        >
          <Plus size={16} /> Add
        </button>
      </header>

      {/* Subject filter pills */}
      <div style={{ padding: 'var(--space-md) var(--space-md) 0', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <button
          onClick={() => setFilterSubjectId('')}
          style={{ padding: '6px 12px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 600, backgroundColor: filterSubjectId === '' ? 'var(--color-accent-primary)' : 'var(--color-bg-secondary)', color: filterSubjectId === '' ? '#ffffff' : 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}
        >
          All
        </button>
        {subjects.map(s => (
          <button
            key={s.id}
            onClick={() => setFilterSubjectId(s.id)}
            style={{ padding: '6px 12px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 600, backgroundColor: filterSubjectId === s.id ? s.color : 'var(--color-bg-secondary)', color: filterSubjectId === s.id ? '#ffffff' : s.color, border: `1px solid ${s.color}40` }}
          >
            {s.code}
          </button>
        ))}
      </div>

      {/* Resource list grouped by subject */}
      <div style={{ padding: 'var(--space-md)', display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
        {Object.keys(grouped).length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center' }}>
            <Link size={40} style={{ color: 'var(--color-text-tertiary)', marginBottom: '12px' }} />
            <p style={{ color: 'var(--color-text-tertiary)', fontSize: '0.9rem' }}>No resources yet. Tap + to add course slides, GitHub links, or PDFs.</p>
          </div>
        ) : (
          Object.entries(grouped).map(([subjectId, items]) => {
            const sub = subjects.find(s => s.id === subjectId);
            if (!sub) return null;
            return (
              <div key={subjectId}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: sub.color }} />
                  <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{sub.name}</span>
                  <span style={{ fontFamily: 'var(--font-family-mono)', fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>{sub.code}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {items.map(r => {
                    const Icon = TYPE_ICON[r.type] || ExternalLink;
                    const iconColor = TYPE_COLOR[r.type] || 'var(--color-text-secondary)';
                    return (
                      <div
                        key={r.id}
                        style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px var(--space-md)', backgroundColor: 'var(--color-bg-secondary)', borderRadius: 'var(--radius-card)', border: '1px solid var(--color-border)' }}
                      >
                        <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: `${iconColor}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Icon size={18} color={iconColor} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.title}</div>
                          {r.description && <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '1px' }}>{r.description}</div>}
                        </div>
                        <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                          <a
                            href={r.url_or_file_ref}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '8px', backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-accent-primary)' }}
                          >
                            <ExternalLink size={15} />
                          </a>
                          <button
                            onClick={() => handleDelete(r.id)}
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '8px', backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-danger)' }}
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
        <div
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', zIndex: 100, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
          onClick={() => setIsAdding(false)}
        >
          <form
            onSubmit={handleAdd}
            style={{ width: '100%', maxWidth: '500px', backgroundColor: 'var(--color-bg-primary)', borderTopLeftRadius: 'var(--radius-sheet)', borderTopRightRadius: 'var(--radius-sheet)', padding: 'var(--space-lg)', display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}
            onClick={e => e.stopPropagation()}
          >
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Add Resource</h3>

            <input type="text" placeholder="Resource title" value={newTitle} onChange={e => setNewTitle(e.target.value)} required style={{ width: '100%', padding: '12px', borderRadius: 'var(--radius-card)', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-secondary)', color: 'var(--color-text-primary)', fontSize: '0.95rem' }} />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Subject</label>
                <select value={newSubjectId} onChange={e => setNewSubjectId(e.target.value)} required style={{ width: '100%', padding: '12px', borderRadius: 'var(--radius-card)', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-secondary)', color: 'var(--color-text-primary)', fontSize: '0.9rem', marginTop: '4px' }}>
                  <option value="">Select</option>
                  {subjects.map(s => <option key={s.id} value={s.id}>{s.code}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Type</label>
                <select value={newType} onChange={e => setNewType(e.target.value as any)} style={{ width: '100%', padding: '12px', borderRadius: 'var(--radius-card)', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-secondary)', color: 'var(--color-text-primary)', fontSize: '0.9rem', marginTop: '4px' }}>
                  <option value="url">URL</option>
                  <option value="pdf">PDF</option>
                  <option value="drive">Drive</option>
                  <option value="github">GitHub</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            <input type="url" placeholder="https://..." value={newUrl} onChange={e => setNewUrl(e.target.value)} required style={{ width: '100%', padding: '12px', borderRadius: 'var(--radius-card)', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-secondary)', color: 'var(--color-text-primary)', fontSize: '0.9rem' }} />
            <input type="text" placeholder="Short description (optional)" value={newDesc} onChange={e => setNewDesc(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: 'var(--radius-card)', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-secondary)', color: 'var(--color-text-primary)', fontSize: '0.9rem' }} />

            <div style={{ display: 'flex', gap: '8px' }}>
              <button type="submit" style={{ flex: 1, padding: '12px', borderRadius: 'var(--radius-card)', backgroundColor: 'var(--color-accent-primary)', color: '#ffffff', fontWeight: 600, fontSize: '0.9rem' }}>Save Resource</button>
              <button type="button" onClick={() => setIsAdding(false)} style={{ padding: '12px 20px', borderRadius: 'var(--radius-card)', backgroundColor: 'var(--color-bg-tertiary)', fontWeight: 600 }}>Cancel</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
export default ResourcesView;
