import React, { useState } from 'react';
import { useNotes, useSubjects } from '../../db/useDatabase';
import { db, Note, Subject } from '../../db/index';
import { useUIStore } from '../../store/uiStore';
import { 
  ArrowLeft, Search, Plus, Tag, Edit, BookOpen, Trash2, 
  Eye, EyeOff, Paperclip, Save
} from 'lucide-react';

export const NotesView: React.FC = () => {
  const notes = useNotes() || [];
  const subjects = useSubjects() || [];

  const closeSubview = useUIStore(state => state.closeSubview);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  
  // Editor State
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editBody, setEditBody] = useState('');
  const [editSubjectId, setEditSubjectId] = useState('');
  const [editTagsString, setEditTagsString] = useState('');
  const [isPreview, setIsPreview] = useState(false);

  // Filter notes
  const filteredNotes = notes.filter(n => {
    if (n.is_deleted) return false;
    
    const matchesSearch = n.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          n.body_markdown.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesTag = selectedTag ? n.tags.includes(selectedTag) : true;
    
    return matchesSearch && matchesTag;
  });

  // Extract all tags for filter chips
  const allTags = Array.from(
    new Set(notes.filter(n => !n.is_deleted).flatMap(n => n.tags))
  );

  const handleStartEdit = (note: Note) => {
    setEditingNoteId(note.id);
    setEditTitle(note.title);
    setEditBody(note.body_markdown);
    setEditSubjectId(note.subject_id || '');
    setEditTagsString(note.tags.join(', '));
    setIsPreview(false);
  };

  const handleCreateNew = () => {
    setEditingNoteId('new');
    setEditTitle('');
    setEditBody('');
    setEditSubjectId('');
    setEditTagsString('');
    setIsPreview(false);
  };

  const handleSave = async () => {
    if (!editTitle.trim()) return;

    const parsedTags = editTagsString
      .split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0);

    if (editingNoteId === 'new') {
      await db.notes.add({
        id: `note-${Date.now()}`,
        subject_id: editSubjectId || undefined,
        title: editTitle,
        body_markdown: editBody,
        tags: parsedTags,
        is_deleted: false
      });
    } else if (editingNoteId) {
      await db.notes.update(editingNoteId, {
        subject_id: editSubjectId || undefined,
        title: editTitle,
        body_markdown: editBody,
        tags: parsedTags
      });
    }

    setEditingNoteId(null);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this note?')) {
      await db.notes.update(id, { is_deleted: true });
      if (editingNoteId === id) setEditingNoteId(null);
    }
  };

  if (editingNoteId) {
    const activeSubject = subjects.find(s => s.id === editSubjectId);

    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: 'var(--color-bg-primary)' }}>
        {/* Editor Header */}
        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--space-md)', borderBottom: '1px solid var(--color-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button onClick={() => setEditingNoteId(null)} style={{ color: 'var(--color-text-primary)' }}>
              <ArrowLeft size={24} />
            </button>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>
              {editingNoteId === 'new' ? 'Create Note' : 'Edit Note'}
            </h3>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              onClick={() => setIsPreview(!isPreview)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 12px',
                borderRadius: 'var(--radius-chip)',
                backgroundColor: 'var(--color-bg-secondary)',
                fontSize: '0.85rem',
                fontWeight: 600
              }}
            >
              {isPreview ? <Edit size={16} /> : <Eye size={16} />}
              <span>{isPreview ? 'Editor' : 'Preview'}</span>
            </button>

            <button 
              onClick={handleSave}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                borderRadius: 'var(--radius-chip)',
                backgroundColor: 'var(--color-accent-primary)',
                color: '#ffffff',
                fontSize: '0.85rem',
                fontWeight: 600
              }}
            >
              <Save size={16} />
              <span>Save</span>
            </button>
          </div>
        </header>

        {/* Editor Body */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 'var(--space-md)', overflowY: 'auto' }}>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: 'var(--space-md)' }}>
            <input
              type="text"
              placeholder="Note Title"
              value={editTitle}
              onChange={e => setEditTitle(e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-card)',
                backgroundColor: 'var(--color-bg-secondary)',
                color: 'var(--color-text-primary)',
                fontSize: '1.1rem',
                fontWeight: 700
              }}
            />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
              <select
                value={editSubjectId}
                onChange={e => setEditSubjectId(e.target.value)}
                style={{
                  padding: '10px',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-card)',
                  backgroundColor: 'var(--color-bg-secondary)',
                  color: 'var(--color-text-primary)',
                  fontSize: '0.9rem'
                }}
              >
                <option value="">General Subject</option>
                {subjects.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                ))}
              </select>

              <input
                type="text"
                placeholder="tags (comma separated)"
                value={editTagsString}
                onChange={e => setEditTagsString(e.target.value)}
                style={{
                  padding: '10px',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-card)',
                  backgroundColor: 'var(--color-bg-secondary)',
                  color: 'var(--color-text-primary)',
                  fontSize: '0.9rem'
                }}
              />
            </div>
          </div>

          {isPreview ? (
            <div style={{ flex: 1, padding: '12px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-card)', backgroundColor: 'var(--color-bg-secondary)', overflowY: 'auto' }}>
              <h3 style={{ marginBottom: '8px' }}>{editTitle || 'Untitled Note'}</h3>
              <p style={{ whiteSpace: 'pre-wrap' }}>{editBody || 'No content written yet.'}</p>
            </div>
          ) : (
            <textarea
              placeholder="Start writing markdown content..."
              value={editBody}
              onChange={e => setEditBody(e.target.value)}
              style={{
                flex: 1,
                padding: '12px',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-card)',
                backgroundColor: 'var(--color-bg-secondary)',
                color: 'var(--color-text-primary)',
                fontFamily: 'var(--font-family-mono)',
                fontSize: '0.95rem',
                resize: 'none',
                minHeight: '200px'
              }}
            />
          )}

          {/* CRITICAL RULE: Spacing between content and attachment strip must be >= 24px/space-lg */}
          <div style={{ marginTop: 'var(--space-lg)' }} />

          {/* Attachment Strip Block */}
          <div style={{ borderTop: '1px dashed var(--color-border)', paddingTop: '16px' }}>
            <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
              <Paperclip size={16} /> Attachments
            </h4>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                type="button"
                onClick={() => alert('Offline attachment uploading will be implemented in Phase 3 sync stack')}
                style={{
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-chip)',
                  backgroundColor: 'var(--color-bg-secondary)',
                  border: '1px solid var(--color-border)',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  color: 'var(--color-text-secondary)'
                }}
              >
                + Link Resource
              </button>
            </div>
          </div>

        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: 'var(--color-bg-primary)', paddingBottom: '80px' }}>
      
      {/* Header */}
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--space-md)', borderBottom: '1px solid var(--color-border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={closeSubview} style={{ color: 'var(--color-text-primary)' }}>
            <ArrowLeft size={24} />
          </button>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Study Notes</h2>
        </div>

        <button 
          onClick={handleCreateNew}
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
          <Plus size={16} /> New Note
        </button>
      </header>

      {/* Search and Tags Grid */}
      <div style={{ padding: 'var(--space-md)', display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
        
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', color: 'var(--color-text-tertiary)' }} />
          <input
            type="text"
            placeholder="Search notes body..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 10px 10px 38px',
              borderRadius: 'var(--radius-card)',
              border: '1px solid var(--color-border)',
              backgroundColor: 'var(--color-bg-secondary)',
              color: 'var(--color-text-primary)',
              fontSize: '0.9rem'
            }}
          />
        </div>

        {/* Tag chips */}
        <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px' }}>
          <button
            onClick={() => setSelectedTag(null)}
            style={{
              padding: '4px 12px',
              borderRadius: 'var(--radius-chip)',
              backgroundColor: selectedTag === null ? 'var(--color-accent-primary)' : 'var(--color-bg-secondary)',
              color: selectedTag === null ? '#ffffff' : 'var(--color-text-secondary)',
              fontSize: '0.8rem',
              fontWeight: 600
            }}
          >
            All
          </button>
          {allTags.map(tag => (
            <button
              key={tag}
              onClick={() => setSelectedTag(tag)}
              style={{
                padding: '4px 12px',
                borderRadius: 'var(--radius-chip)',
                backgroundColor: selectedTag === tag ? 'var(--color-accent-primary)' : 'var(--color-bg-secondary)',
                color: selectedTag === tag ? '#ffffff' : 'var(--color-text-secondary)',
                fontSize: '0.8rem',
                fontWeight: 600
              }}
            >
              #{tag}
            </button>
          ))}
        </div>
      </div>

      {/* Note List */}
      <div style={{ padding: '0 var(--space-md)', display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
        {filteredNotes.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-tertiary)' }}>
            No study notes found.
          </div>
        ) : (
          filteredNotes.map(n => {
            const sub = subjects.find(s => s.id === n.subject_id);

            return (
              <div
                key={n.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: 'var(--space-md)',
                  backgroundColor: 'var(--color-bg-secondary)',
                  borderRadius: 'var(--radius-card)',
                  border: '1px solid var(--color-border)',
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h4 style={{ fontWeight: 700, fontSize: '0.95rem' }}>{n.title}</h4>
                    {sub && (
                      <span 
                        style={{ 
                          fontSize: '0.7rem', 
                          fontFamily: 'var(--font-family-mono)', 
                          fontWeight: 700, 
                          color: sub.color,
                          backgroundColor: `${sub.color}18`, // 12% opacity color backgrounds per closeout list #1
                          padding: '1px 6px',
                          borderRadius: '4px'
                        }}
                      >
                        {sub.code}
                      </span>
                    )}
                  </div>
                  
                  {/* Tag strip inside card */}
                  <div style={{ display: 'flex', gap: '4px', marginTop: '6px' }}>
                    {n.tags.map(t => (
                      <span key={t} style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                        #{t}
                      </span>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '4px' }}>
                  <button onClick={() => handleStartEdit(n)} style={{ padding: '6px', color: 'var(--color-text-secondary)' }}>
                    <Edit size={16} />
                  </button>
                  <button onClick={() => handleDelete(n.id)} style={{ padding: '6px', color: 'var(--color-danger)' }}>
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

    </div>
  );
};
export default NotesView;
