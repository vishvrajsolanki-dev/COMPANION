import React, { useState } from 'react';
import { useNotes, useSubjects } from '../../db/useDatabase';
import { db, Note } from '../../db/index';
import { navigateTo, CANONICAL_HASHES } from '../../hooks/useHashLocation';
import { Button, Card, Chip, useToast, ConfirmDialog } from '../../components/ui';
import {
  ArrowLeft, Search, Plus, Edit, Trash2,
  Eye, Paperclip, Save
} from 'lucide-react';

/**
 * Markdown preview: the raw source stays visible (`#`, `##`, `**bold**`),
 * heading lines are styled in primary blue + bold.
 */
const renderMarkdownBody = (text: string) => {
  const lines = text.split('\n');
  return lines.map((line, i) => {
    const isHeading = /^(#{1,3})\s/.test(line);
    const styledLine = (
      <span
        key={i}
        style={isHeading ? { color: 'var(--primary, #001e4c)', fontWeight: 700 } : undefined}
      >
        {line}
      </span>
    );
    return i < lines.length - 1
      ? <React.Fragment key={i}>{styledLine}{'\n'}</React.Fragment>
      : styledLine;
  });
};

export const NotesView: React.FC = () => {
  const notes = useNotes() || [];
  const subjects = useSubjects() || [];

  const closeSubview = () => navigateTo(CANONICAL_HASHES.studyTasks);
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
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%', backgroundColor: 'var(--bg-page)' }} data-testid="note-editor">
        {/* Editor Header */}
        <header
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: 'var(--stack-md, 16px)',
            paddingTop: 'calc(var(--stack-md, 16px) + env(safe-area-inset-top))',
            borderBottom: '1px solid var(--outline-variant, #c4c6d1)',
            backgroundColor: 'var(--surface-container-lowest, #ffffff)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              onClick={() => setEditingNoteId(null)}
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
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--on-surface, #1a1c1c)', fontFamily: 'var(--font-primary)' }}>
              {editingNoteId === 'new' ? 'Create Note' : 'Edit Note'}
            </h3>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <Button variant="subtle" size="sm" onClick={() => setIsPreview(!isPreview)}>
              {isPreview ? <Edit size={16} /> : <Eye size={16} />}
              <span>{isPreview ? 'Editor' : 'Preview'}</span>
            </Button>

            <Button size="sm" variant="primary" onClick={handleSave}>
              <Save size={16} />
              <span>Save</span>
            </Button>
          </div>
        </header>

        {/* Editor Body */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 'var(--stack-md, 16px)', overflowY: 'auto' }}>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: 'var(--stack-md, 16px)' }}>
            {dbError && (
              <div style={{ padding: '10px 14px', borderRadius: 'var(--radius-md, 8px)', backgroundColor: 'var(--error-container, #ffdad6)', color: 'var(--on-error-container, #93000a)', fontSize: '0.85rem', fontWeight: 600 }}>
                {dbError}
              </div>
            )}

            <input
              type="text"
              placeholder="Note Title"
              value={editTitle}
              onChange={e => setEditTitle(e.target.value)}
              className="input"
              style={{ fontSize: '1.1rem', fontWeight: 700, minHeight: '44px' }}
            />

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 'var(--stack-md, 16px)' }}>
              <select
                value={editSubjectId}
                onChange={e => setEditSubjectId(e.target.value)}
                className="input"
                style={{ minHeight: '44px' }}
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
                style={{ minHeight: '44px' }}
              />
            </div>
          </div>

          {isPreview ? (
            <div style={{ flex: 1, padding: '16px', border: '1px solid var(--outline-variant, #c4c6d1)', borderRadius: 'var(--radius-lg, 12px)', backgroundColor: 'var(--surface-container-lowest, #ffffff)', overflowY: 'auto' }}>
              <h3 style={{ marginBottom: '12px', fontSize: '1.25rem', fontWeight: 700, color: 'var(--on-surface, #1a1c1c)', fontFamily: 'var(--font-primary)' }}>{editTitle || 'Untitled Note'}</h3>
              <p style={{ whiteSpace: 'pre-wrap', color: 'var(--on-surface, #1a1c1c)', lineHeight: 1.6 }}>
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
                fontFamily: 'var(--font-mono, monospace)',
                fontSize: '0.95rem',
                resize: 'none',
                minHeight: '200px',
                backgroundColor: 'var(--surface-container-lowest, #ffffff)',
                padding: '12px 16px',
                lineHeight: 1.5,
              }}
            />
          )}

          {/* Attachment Strip Block */}
          <div style={{ marginTop: 'var(--stack-lg, 32px)', borderTop: '1px dashed var(--outline-variant, #c4c6d1)', paddingTop: '16px' }}>
            <h4 style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--on-surface-variant, #444750)', fontFamily: 'var(--font-mono)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
              <Paperclip size={16} /> Attachments & Resources
            </h4>
            <div style={{ display: 'flex', gap: '8px' }}>
              <Button
                type="button"
                variant="subtle"
                size="sm"
                onClick={() => toast.show('Offline attachments are coming in the Phase 3 sync stack.', 'info')}
              >
                + Link Resource
              </Button>
            </div>
          </div>

        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-page)' }} data-testid="notes-view">
      <h1 className="sr-only">Notes</h1>

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
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--on-surface, #1a1c1c)', fontFamily: 'var(--font-primary)' }}>Study Notes</h2>
        </div>

        <Button size="sm" variant="primary" onClick={handleCreateNew}>
          <Plus size={16} /> New Note
        </Button>
      </header>

      {/* Search and Tags */}
      <div style={{ padding: 'var(--stack-md, 16px)', display: 'flex', flexDirection: 'column', gap: 'var(--stack-sm, 8px)' }}>

        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <Search size={18} style={{ position: 'absolute', left: '14px', color: 'var(--on-surface-variant, #444750)' }} />
          <input
            type="text"
            placeholder="Search notes content..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="input"
            style={{ paddingLeft: 42, minHeight: '44px', width: '100%' }}
          />
        </div>

        {/* Tag chips using Chip component */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', paddingTop: '4px' }}>
          <Chip
            active={selectedTag === null}
            onClick={() => setSelectedTag(null)}
          >
            All Notes
          </Chip>
          {allTags.map(tag => (
            <Chip
              key={tag}
              active={selectedTag === tag}
              onClick={() => setSelectedTag(tag)}
            >
              #{tag}
            </Chip>
          ))}
        </div>
      </div>

      {/* Note List */}
      <div style={{ padding: '0 var(--stack-md, 16px)', display: 'flex', flexDirection: 'column', gap: 'var(--stack-sm, 8px)' }}>
        {filteredNotes.length === 0 ? (
          <Card style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--on-surface-variant, #444750)', fontSize: '0.9rem' }}>
            No study notes found. Tap "+ New Note" to write one.
          </Card>
        ) : (
          filteredNotes.map(n => {
            const sub = subjects.find(s => s.id === n.subject_id);

            return (
              <Card
                key={n.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: 'var(--stack-md, 16px)',
                  gap: '12px',
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <h4 style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--on-surface, #1a1c1c)', fontFamily: 'var(--font-primary)' }}>{n.title}</h4>
                    {sub && (
                      <span
                        style={{
                          fontSize: '0.7rem',
                          fontFamily: 'var(--font-mono)',
                          fontWeight: 700,
                          color: sub.color,
                          backgroundColor: `${sub.color}1A`,
                          padding: '2px 8px',
                          borderRadius: 'var(--radius-full, 9999px)',
                        }}
                      >
                        {sub.code}
                      </span>
                    )}
                  </div>

                  {/* Tag strip inside card */}
                  {n.tags.length > 0 && (
                    <div style={{ display: 'flex', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
                      {n.tags.map(t => (
                        <span key={t} style={{ fontSize: '0.72rem', color: 'var(--on-surface-variant, #444750)', fontFamily: 'var(--font-mono)' }}>
                          #{t}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Truncated body preview */}
                  {n.body_markdown.trim() && (
                    <p
                      style={{
                        marginTop: '6px',
                        fontSize: '0.8rem',
                        color: 'var(--on-surface-variant, #444750)',
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

                <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                  <button
                    onClick={() => handleStartEdit(n)}
                    style={{
                      width: 44,
                      height: 44,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: 'var(--radius-md, 8px)',
                      color: 'var(--on-surface-variant, #444750)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                    aria-label="Edit note"
                  >
                    <Edit size={18} />
                  </button>
                  <button
                    onClick={() => setPendingDeleteId(n.id)}
                    style={{
                      width: 44,
                      height: 44,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: 'var(--radius-md, 8px)',
                      color: 'var(--error, #ba1a1a)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                    aria-label="Delete note"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </Card>
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
