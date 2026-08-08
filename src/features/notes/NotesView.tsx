import React, { useState } from 'react';
import { useNotes, useSubjects } from '../../db/useDatabase';
import { db, Note } from '../../db/index';
import { useUIStore } from '../../store/uiStore';
import { GlassButton, useToast, ConfirmDialog } from '../../components/ui';
import {
  ArrowLeft, Search, Plus, Tag, Edit, Trash2,
  Eye, EyeOff, Paperclip, Save
} from 'lucide-react';

/**
 * §4.8 markdown preview: the raw source stays visible (`#`, `##`, `##`,
 * `**bold**` markers kept literally), but heading lines are colored primary
 * blue + bold. Body lines remain default text-primary. Visual-only — the
 * stored markdown is never modified.
 */
const renderMarkdownBody = (text: string) => {
  const lines = text.split('\n');
  return lines.map((line, i) => {
    const isHeading = /^(#{1,3})\s/.test(line);
    const styledLine = (
      <span
        key={i}
        style={isHeading ? { color: 'var(--color-primary)', fontWeight: 700 } : undefined}
      >
        {line}
      </span>
    );
    // Re-append the newline so line breaks survive in the pre-wrap container.
    return i < lines.length - 1
      ? <React.Fragment key={i}>{styledLine}{'\n'}</React.Fragment>
      : styledLine;
  });
};

export const NotesView: React.FC = () => {
  const notes = useNotes() || [];
  const subjects = useSubjects() || [];

  const closeSubview = useUIStore(state => state.closeSubview);
  const toast = useToast();

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

  const [dbError, setDbError] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const handleSave = async () => {
    if (!editTitle.trim()) return;
    setDbError(null);

    try {
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
    } catch (err) {
      console.error('Failed to save note:', err);
      setDbError('Failed to save note. Please try again.');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await db.notes.update(id, { is_deleted: true });
      if (editingNoteId === id) setEditingNoteId(null);
    } catch (err) {
      console.error('Failed to delete note:', err);
      setDbError('Failed to delete note. Please try again.');
    }
  };

  if (editingNoteId) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: 'var(--bg-page)' }}>
        {/* Editor Header */}
        <header
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: 'var(--space-md)',
            paddingTop: 'calc(var(--space-md) + env(safe-area-inset-top))',
            borderBottom: '1px solid var(--border-hairline)',
            backgroundColor: 'var(--bg-page)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button onClick={() => setEditingNoteId(null)} style={{ color: 'var(--text-primary)' }}>
              <ArrowLeft size={24} />
            </button>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              {editingNoteId === 'new' ? 'Create Note' : 'Edit Note'}
            </h3>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <GlassButton variant="ghost" size="sm" onClick={() => setIsPreview(!isPreview)}>
              {isPreview ? <Edit size={16} /> : <Eye size={16} />}
              <span>{isPreview ? 'Editor' : 'Preview'}</span>
            </GlassButton>

            <GlassButton size="sm" onClick={handleSave}>
              <Save size={16} />
              <span>Save</span>
            </GlassButton>
          </div>
        </header>

        {/* Editor Body */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 'var(--space-md)', overflowY: 'auto' }}>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: 'var(--space-md)' }}>
            {dbError && (
              <div style={{ padding: '10px', borderRadius: 'var(--radius-card)', backgroundColor: 'var(--color-danger-bg)', color: 'var(--color-danger)', fontSize: '0.85rem', fontWeight: 600 }}>
                {dbError}
              </div>
            )}

            <input
              type="text"
              placeholder="Note Title"
              value={editTitle}
              onChange={e => setEditTitle(e.target.value)}
              className="input"
              style={{ fontSize: '1.1rem', fontWeight: 700 }}
            />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
              <select
                value={editSubjectId}
                onChange={e => setEditSubjectId(e.target.value)}
                className="input"
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
                className="input"
              />
            </div>
          </div>

          {isPreview ? (
            <div style={{ flex: 1, padding: '12px', border: '1px solid var(--border-hairline)', borderRadius: 'var(--radius-card)', backgroundColor: 'var(--bg-page)', overflowY: 'auto' }}>
              <h3 style={{ marginBottom: '8px' }}>{editTitle || 'Untitled Note'}</h3>
              <p style={{ whiteSpace: 'pre-wrap', color: 'var(--text-primary)' }}>
                {editBody ? renderMarkdownBody(editBody) : 'No content written yet.'}
              </p>
            </div>
          ) : (
            <textarea
              placeholder="Start writing markdown content..."
              value={editBody}
              onChange={e => setEditBody(e.target.value)}
              className="input"
              style={{
                flex: 1,
                fontFamily: 'var(--font-family-mono)',
                fontSize: '0.95rem',
                resize: 'none',
                minHeight: '200px',
                backgroundColor: 'var(--bg-page)',
              }}
            />
          )}

          {/* CRITICAL RULE: Spacing between content and attachment strip must be >= 24px/space-lg */}
          <div style={{ marginTop: 'var(--space-lg)' }} />

          {/* Attachment Strip Block */}
          <div style={{ borderTop: '1px dashed var(--border-hairline)', paddingTop: '16px' }}>
            <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
              <Paperclip size={16} /> Attachments
            </h4>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={() => toast.show('Offline attachments are coming in the Phase 3 sync stack.', 'info')}
                style={{
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-pill)',
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--border-hairline)',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  color: 'var(--text-secondary)',
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
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: 'var(--bg-page)', paddingBottom: '80px' }}>
      <h1 className="sr-only">Notes</h1>

      {/* Screen header */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: 'var(--space-md)',
          paddingTop: 'calc(var(--space-md) + env(safe-area-inset-top))',
          borderBottom: '1px solid var(--border-hairline)',
          backgroundColor: 'var(--bg-page)',
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={closeSubview} style={{ color: 'var(--text-primary)' }} aria-label="Go back">
            <ArrowLeft size={24} />
          </button>
          <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--text-primary)' }}>Study Notes</h2>
        </div>

        <GlassButton size="sm" onClick={handleCreateNew}>
          <Plus size={16} /> New Note
        </GlassButton>
      </header>

      {/* Search and Tags */}
      <div style={{ padding: 'var(--space-md)', display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>

        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search notes body..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="input"
            style={{ paddingLeft: 38 }}
          />
        </div>

        {/* Tag chips */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', paddingBottom: '4px' }}>
          <button
            onClick={() => setSelectedTag(null)}
            style={{
              padding: '5px 12px',
              borderRadius: 'var(--radius-pill)',
              backgroundColor: selectedTag === null ? 'var(--color-primary)' : 'var(--bg-card)',
              border: selectedTag === null ? 'none' : '1px solid var(--border-hairline)',
              color: selectedTag === null ? '#ffffff' : 'var(--text-secondary)',
              fontSize: '0.8rem',
              fontWeight: 600,
            }}
          >
            All
          </button>
          {allTags.map(tag => (
            <button
              key={tag}
              onClick={() => setSelectedTag(tag)}
              style={{
                padding: '5px 12px',
                borderRadius: 'var(--radius-pill)',
                backgroundColor: selectedTag === tag ? 'var(--color-primary)' : 'var(--bg-card)',
                border: selectedTag === tag ? 'none' : '1px solid var(--border-hairline)',
                color: selectedTag === tag ? '#ffffff' : 'var(--text-secondary)',
                fontSize: '0.8rem',
                fontWeight: 600,
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
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
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
                  backgroundColor: 'var(--bg-card)',
                  borderRadius: 'var(--radius-card)',
                  border: '1px solid var(--border-hairline)',
                  boxShadow: 'var(--shadow-card)',
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h4 style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>{n.title}</h4>
                    {sub && (
                      <span
                        style={{
                          fontSize: '0.7rem',
                          fontFamily: 'var(--font-family-mono)',
                          fontWeight: 700,
                          color: sub.color,
                          backgroundColor: `${sub.color}1A`,
                          padding: '2px 8px',
                          borderRadius: 'var(--radius-pill)',
                        }}
                      >
                        {sub.code}
                      </span>
                    )}
                  </div>

                  {/* Tag strip inside card */}
                  <div style={{ display: 'flex', gap: '4px', marginTop: '6px' }}>
                    {n.tags.map(t => (
                      <span key={t} style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        #{t}
                      </span>
                    ))}
                  </div>

                  {/* Truncated body preview */}
                  {n.body_markdown.trim() && (
                    <p
                      style={{
                        marginTop: '6px',
                        fontSize: '0.78rem',
                        color: 'var(--text-muted)',
                        lineHeight: 1.4,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                      }}
                    >
                      {n.body_markdown.replace(/[#*_`>]/g, '').trim()}
                    </p>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '4px' }}>
                  <button onClick={() => handleStartEdit(n)} style={{ padding: '6px', color: 'var(--text-secondary)' }} aria-label="Edit note">
                    <Edit size={16} />
                  </button>
                  <button onClick={() => setPendingDeleteId(n.id)} style={{ padding: '6px', color: 'var(--color-danger)' }} aria-label="Delete note">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Delete confirmation */}
      <ConfirmDialog
        open={!!pendingDeleteId}
        title={`Delete "${notes.find(n => n.id === pendingDeleteId)?.title ?? 'this note'}"?`}
        message="This note will be permanently removed."
        confirmLabel="Delete Note"
        onConfirm={() => { if (pendingDeleteId) handleDelete(pendingDeleteId); setPendingDeleteId(null); }}
        onCancel={() => setPendingDeleteId(null)}
      />

    </div>
  );
};
export default NotesView;
