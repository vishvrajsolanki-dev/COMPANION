import React from 'react';
import { useTeachers, useSubjects } from '../../db/useDatabase';
import { useUIStore } from '../../store/uiStore';
import { ArrowLeft, Mail, Phone, MapPin, Clock } from 'lucide-react';

export const DirectoryView: React.FC = () => {
  const teachers  = useTeachers()  || [];
  const subjects  = useSubjects()  || [];
  const closeSubview = useUIStore(state => state.closeSubview);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: 'var(--color-bg-primary)', paddingBottom: '80px' }}>

      {/* Header */}
      <header style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: 'var(--space-md)', borderBottom: '1px solid var(--color-border)' }}>
        <button onClick={closeSubview} style={{ color: 'var(--color-text-primary)' }}>
          <ArrowLeft size={24} />
        </button>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Faculty Directory</h2>
      </header>

      <div style={{ padding: 'var(--space-md)', display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
        {teachers.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--color-text-tertiary)' }}>
            No faculty records found.
          </div>
        ) : (
          teachers.map(teacher => {
            // Derive subject colors from Teacher.subject_ids linking to Subject.color
            const taughtSubjects = subjects.filter(s => teacher.subject_ids.includes(s.id));

            return (
              <div
                key={teacher.id}
                style={{ backgroundColor: 'var(--color-bg-secondary)', borderRadius: 'var(--radius-card)', border: '1px solid var(--color-border)', overflow: 'hidden' }}
              >
                {/* Color bar: derived from the first subject's color */}
                <div style={{ height: '4px', backgroundColor: taughtSubjects[0]?.color || 'var(--color-accent-primary)' }} />

                <div style={{ padding: 'var(--space-md)' }}>
                  {/* Name + Subjects */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <div>
                      <h3 style={{ fontWeight: 700, fontSize: '1rem' }}>{teacher.name}</h3>
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
                    <div style={{ width: '42px', height: '42px', borderRadius: '50%', backgroundColor: taughtSubjects[0]?.color ? `${taughtSubjects[0].color}25` : 'var(--color-bg-tertiary)', color: taughtSubjects[0]?.color || 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '1rem', flexShrink: 0 }}>
                      {teacher.name.split(' ').map(w => w[0]).slice(0, 2).join('')}
                    </div>
                  </div>

                  {/* Contact Grid */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <a href={`mailto:${teacher.email}`} style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-text-secondary)', fontSize: '0.85rem', textDecoration: 'none' }}>
                      <Mail size={14} style={{ flexShrink: 0 }} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{teacher.email}</span>
                    </a>
                    {teacher.phone && (
                      <a href={`tel:${teacher.phone}`} style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-text-secondary)', fontSize: '0.85rem', textDecoration: 'none' }}>
                        <Phone size={14} style={{ flexShrink: 0 }} />
                        <span>{teacher.phone}</span>
                      </a>
                    )}
                    {teacher.cabin && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-text-secondary)', fontSize: '0.85rem' }}>
                        <MapPin size={14} style={{ flexShrink: 0 }} />
                        <span>Cabin {teacher.cabin}</span>
                      </div>
                    )}
                    {teacher.office_hours && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-text-secondary)', fontSize: '0.85rem' }}>
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
