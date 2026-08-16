import React, { useState } from 'react';
import { useTeachers, useSubjects } from '../../db/useDatabase';
import { navigateTo, CANONICAL_HASHES } from '../../hooks/useHashLocation';
import { Card, EmptyState } from '../../components/ui';
import { ArrowLeft, Mail, Phone, MapPin, Clock, Search } from 'lucide-react';

const contactRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  color: 'var(--on-surface-variant, #444750)',
  fontSize: '0.85rem',
  padding: '8px 4px',
  minHeight: '44px',
  textDecoration: 'none',
};

export const DirectoryView: React.FC = () => {
  const teachers = useTeachers() || [];
  const subjects = useSubjects() || [];
  const [searchQuery, setSearchQuery] = useState('');

  const closeSubview = () => navigateTo(CANONICAL_HASHES.account);

  const filteredTeachers = teachers.filter(t => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    const nameMatch = t.name.toLowerCase().includes(q);
    const emailMatch = t.email.toLowerCase().includes(q);
    const cabinMatch = t.cabin?.toLowerCase().includes(q);
    const taughtSubjects = subjects.filter(s => t.subject_ids.includes(s.id));
    const subjectMatch = taughtSubjects.some(s => s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q));
    return nameMatch || emailMatch || cabinMatch || subjectMatch;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-page)' }} data-testid="directory-view">
      <h1 className="sr-only">Faculty Directory</h1>

      {/* Header */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: 'var(--stack-md, 16px)',
          paddingTop: 'calc(var(--stack-md, 16px) + env(safe-area-inset-top))',
          borderBottom: '1px solid var(--outline-variant, #c4c6d1)',
          backgroundColor: 'var(--surface-container-lowest, #ffffff)',
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}
      >
        <button
          data-testid="subview-back-button"
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
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--on-surface, #1a1c1c)', fontFamily: 'var(--font-primary)' }}>Faculty Directory</h2>
          <div style={{ fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--on-surface-variant, #444750)', fontFamily: 'var(--font-mono)' }}>
            ADIT Academic Contacts
          </div>
        </div>
      </header>

      <div style={{ padding: 'var(--stack-md, 16px)', display: 'flex', flexDirection: 'column', gap: 'var(--stack-md, 16px)' }}>
        {/* Search Input */}
        <div style={{ position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--on-surface-variant, #444750)' }} />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search faculty by name, subject, or email…"
            aria-label="Search faculty directory"
            style={{
              width: '100%',
              minHeight: 44,
              paddingLeft: 42,
              paddingRight: 16,
              borderRadius: 'var(--radius-full, 9999px)',
              border: '1px solid var(--outline-variant, #c4c6d1)',
              backgroundColor: 'var(--surface-container-lowest, #ffffff)',
              color: 'var(--on-surface, #1a1c1c)',
              fontSize: '0.85rem',
              outline: 'none',
            }}
          />
        </div>

        {filteredTeachers.length === 0 ? (
          <EmptyState title="No faculty records found" />
        ) : (
          filteredTeachers.map(teacher => {
            const taughtSubjects = subjects.filter(s => teacher.subject_ids.includes(s.id));
            const primaryColor = taughtSubjects[0]?.color || 'var(--primary, #001e4c)';

            return (
              <Card
                key={teacher.id}
                style={{ overflow: 'hidden', padding: 0 }}
              >
                {/* 4px top color accent bar */}
                <div style={{ height: '4px', backgroundColor: primaryColor }} />

                <div style={{ padding: 'var(--stack-md, 16px)' }}>
                  {/* Name + Subjects + Avatar */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <div>
                      <h3 style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--on-surface, #1a1c1c)', fontFamily: 'var(--font-primary)' }}>{teacher.name}</h3>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
                        {taughtSubjects.map(s => (
                          <span
                            key={s.id}
                            style={{
                              fontFamily: 'var(--font-mono)',
                              fontSize: '0.7rem',
                              fontWeight: 700,
                              color: s.color,
                              backgroundColor: 'var(--surface-container-low, #f4f3f2)',
                              border: '1px solid var(--outline-variant, #c4c6d1)',
                              padding: '2px 8px',
                              borderRadius: 'var(--radius-sm, 4px)',
                            }}
                          >
                            {s.code}
                          </span>
                        ))}
                      </div>
                    </div>
                    {/* Initials Avatar */}
                    <div
                      style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: '50%',
                        backgroundColor: 'var(--surface-container-low, #f4f3f2)',
                        border: '1px solid var(--outline-variant, #c4c6d1)',
                        color: primaryColor,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: '1rem',
                        flexShrink: 0,
                        fontFamily: 'var(--font-primary)',
                      }}
                    >
                      {teacher.name.split(' ').map(w => w[0]).slice(0, 2).join('')}
                    </div>
                  </div>

                  {/* Contact Grid */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <a href={`mailto:${teacher.email}`} style={contactRowStyle}>
                      <Mail size={16} style={{ flexShrink: 0, color: 'var(--primary, #001e4c)' }} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{teacher.email}</span>
                    </a>
                    {teacher.phone && (
                      <a href={`tel:${teacher.phone}`} style={contactRowStyle}>
                        <Phone size={16} style={{ flexShrink: 0, color: 'var(--primary, #001e4c)' }} />
                        <span>{teacher.phone}</span>
                      </a>
                    )}
                    {teacher.cabin && (
                      <div style={contactRowStyle}>
                        <MapPin size={16} style={{ flexShrink: 0, color: 'var(--on-surface-variant, #444750)' }} />
                        <span>Cabin {teacher.cabin}</span>
                      </div>
                    )}
                    {teacher.office_hours && (
                      <div style={contactRowStyle}>
                        <Clock size={16} style={{ flexShrink: 0, color: 'var(--on-surface-variant, #444750)' }} />
                        <span>Office Hours: {teacher.office_hours}</span>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
};
export default DirectoryView;
