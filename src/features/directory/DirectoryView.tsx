import React from 'react';
import { useTeachers, useSubjects } from '../../db/useDatabase';
import { useUIStore } from '../../store/uiStore';
import { EmptyState } from '../../components/ui';
import { ArrowLeft, Mail, Phone, MapPin, Clock } from 'lucide-react';

/** Contact-grid row — shared so the mailto/tel links and the plain rows stay
 *  visually aligned AND get a ≥ 32px touch target on iOS (0.85rem text is only
 *  ~20px tall on its own). */
const contactRowStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: '8px',
  color: 'var(--text-secondary)', fontSize: '0.85rem',
  padding: '6px 2px', margin: '-2px 0',
};

export const DirectoryView: React.FC = () => {
  const teachers  = useTeachers()  || [];
  const subjects  = useSubjects()  || [];
  const closeSubview = useUIStore(state => state.closeSubview);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: 'var(--bg-page)', paddingBottom: '80px' }}>
      <h1 className="sr-only">Faculty Directory</h1>

      {/* Header */}
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--space-md)', paddingTop: 'calc(var(--space-md) + env(safe-area-inset-top))', borderBottom: '1px solid var(--border-hairline)', backgroundColor: 'var(--bg-page)', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={closeSubview} style={{ color: 'var(--text-primary)' }} aria-label="Go back">
            <ArrowLeft size={24} />
          </button>
          <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--text-primary)' }}>Faculty Directory</h2>
        </div>
      </header>

      <div style={{ padding: 'var(--space-md)', display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
        {teachers.length === 0 ? (
          <EmptyState title="No faculty records found" />
        ) : (
          teachers.map(teacher => {
            // Derive subject colors from Teacher.subject_ids linking to Subject.color
            const taughtSubjects = subjects.filter(s => teacher.subject_ids.includes(s.id));

            return (
              <div
                key={teacher.id}
                style={{ backgroundColor: 'var(--bg-card)', borderRadius: 'var(--radius-card)', border: '1px solid var(--border-hairline)', boxShadow: 'var(--shadow-card)', overflow: 'hidden' }}
              >
                {/* Color bar: derived from the first subject's color */}
                <div style={{ height: '4px', backgroundColor: taughtSubjects[0]?.color || 'var(--color-primary)' }} />

                <div style={{ padding: 'var(--space-md)' }}>
                  {/* Name + Subjects */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <div>
                      <h3 style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>{teacher.name}</h3>
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '4px' }}>
                        {taughtSubjects.map(s => (
                          <span
                            key={s.id}
                            style={{ fontFamily: 'var(--font-family-mono)', fontSize: '0.7rem', fontWeight: 700, color: s.color, backgroundColor: `${s.color}15`, padding: '2px 6px', borderRadius: '4px' }}
                          >
                            {s.code}
                          </span>
                        ))}
                      </div>
                    </div>
                    {/* Avatar initials */}
                    <div style={{ width: '42px', height: '42px', borderRadius: '50%', backgroundColor: taughtSubjects[0]?.color ? `${taughtSubjects[0].color}25` : 'var(--neutral-100)', color: taughtSubjects[0]?.color || 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '1rem', flexShrink: 0 }}>
                      {teacher.name.split(' ').map(w => w[0]).slice(0, 2).join('')}
                    </div>
                  </div>

                  {/* Contact Grid */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <a href={`mailto:${teacher.email}`} style={{ ...contactRowStyle, textDecoration: 'none' }}>
                      <Mail size={14} style={{ flexShrink: 0 }} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{teacher.email}</span>
                    </a>
                    {teacher.phone && (
                      <a href={`tel:${teacher.phone}`} style={{ ...contactRowStyle, textDecoration: 'none' }}>
                        <Phone size={14} style={{ flexShrink: 0 }} />
                        <span>{teacher.phone}</span>
                      </a>
                    )}
                    {teacher.cabin && (
                      <div style={contactRowStyle}>
                        <MapPin size={14} style={{ flexShrink: 0 }} />
                        <span>Cabin {teacher.cabin}</span>
                      </div>
                    )}
                    {teacher.office_hours && (
                      <div style={contactRowStyle}>
                        <Clock size={14} style={{ flexShrink: 0 }} />
                        <span>Office Hours: {teacher.office_hours}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
export default DirectoryView;
