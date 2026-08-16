import React from 'react';
import { useUIStore } from '../../store/uiStore';
import { ArrowLeft, Home, Search, User, Pencil, Settings, Award, Shield, Bell } from 'lucide-react';

/**
 * "Academic Core" style-guide screen — a live design-tokens page.
 * Spec: DESIGN_SYSTEM.md §5 (locked). Every value is a canonical token;
 * nothing here is invented. This is a documentation device, so the only
 * "gradient"-looking surface is the color-ramp strips (solid token swatches,
 * dark → light), which §5 explicitly calls for.
 */

const overline: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  fontSize: 'var(--text-2xs)',
  fontWeight: 700,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: 'var(--text-muted)',
};
const overlineBar: React.CSSProperties = {
  width: 3,
  height: 14,
  borderRadius: 2,
  background: 'var(--color-primary)',
  flexShrink: 0,
};

const section = {
  display: 'flex',
  flexDirection: 'column' as const,
  gap: 'var(--space-md)',
};

const card: React.CSSProperties = {
  backgroundColor: 'var(--bg-card)',
  borderRadius: 'var(--radius-card)',
  border: '1px solid var(--border-hairline)',
  boxShadow: 'var(--shadow-card)',
};

// ── §5.1 Color ramp data (dark → light, from the locked 10-step ramps) ──────
interface Ramp {
  name: string;
  hex: string;
  base: string;
  steps: string[];
}
const RAMPS: Ramp[] = [
  {
    name: 'Primary',
    hex: '#2563EB',
    base: 'var(--primary-600)',
    steps: ['var(--primary-900)', 'var(--primary-800)', 'var(--primary-700)', 'var(--primary-600)',
            'var(--primary-500)', 'var(--primary-400)', 'var(--primary-300)', 'var(--primary-200)',
            'var(--primary-100)', 'var(--primary-50)'],
  },
  {
    name: 'Secondary',
    hex: '#7C3AED',
    base: 'var(--secondary-600)',
    steps: ['var(--secondary-900)', 'var(--secondary-800)', 'var(--secondary-700)', 'var(--secondary-600)',
            'var(--secondary-500)', 'var(--secondary-400)', 'var(--secondary-300)', 'var(--secondary-200)',
            'var(--secondary-100)', 'var(--secondary-50)'],
  },
  {
    name: 'Tertiary',
    hex: '#BC4800',
    base: 'var(--tertiary-600)',
    steps: ['var(--tertiary-900)', 'var(--tertiary-800)', 'var(--tertiary-700)', 'var(--tertiary-600)',
            'var(--tertiary-500)', 'var(--tertiary-400)', 'var(--tertiary-300)', 'var(--tertiary-200)',
            'var(--tertiary-100)', 'var(--tertiary-50)'],
  },
  {
    name: 'Neutral',
    hex: '#64748B',
    base: 'var(--neutral-500)',
    steps: ['var(--neutral-900)', 'var(--neutral-800)', 'var(--neutral-700)', 'var(--neutral-600)',
            'var(--neutral-500)', 'var(--neutral-400)', 'var(--neutral-300)', 'var(--neutral-200)',
            'var(--neutral-100)', 'var(--neutral-50)'],
  },
];

// ── §5.2 Typography specimens ────────────────────────────────────────────────
const TYPO_SPECIMENS = [
  { name: 'Headline', style: { fontWeight: 700, fontSize: '2rem', lineHeight: 1.15 } },
  { name: 'Body',     style: { fontWeight: 500, fontSize: '0.95rem', lineHeight: 1.4 } },
  { name: 'Label',    style: { fontWeight: 600, fontSize: '0.72rem', letterSpacing: '0.05em', textTransform: 'uppercase' } },
];

// ── §5.3 Button specimens ────────────────────────────────────────────────────
const BUTTONS = [
  { name: 'Primary',   style: { backgroundColor: 'var(--color-primary)', color: '#FFFFFF' } },
  { name: 'Secondary', style: { backgroundColor: 'var(--color-info-bg)', color: 'var(--color-primary)' } },
  { name: 'Inverted',  style: { backgroundColor: 'var(--neutral-900)', color: '#FFFFFF' } },
  { name: 'Outlined',  style: { backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border-hairline)' } },
];

// ── §5.8 Semantic icon buttons (blue/violet/rust/red) ────────────────────────
const SEMANTIC_ICONS = [
  { Icon: Settings, bg: 'var(--color-primary)',   label: 'Settings icon specimen' },
  { Icon: Award,    bg: 'var(--color-secondary)', label: 'Award icon specimen' },
  { Icon: Shield,   bg: 'var(--color-tertiary)',  label: 'Shield icon specimen' },
  { Icon: Bell,     bg: 'var(--color-danger)',    label: 'Bell icon specimen' },
];

const circleBtn = (bg: string, size = 44): React.CSSProperties => ({
  width: size,
  height: size,
  borderRadius: '50%',
  backgroundColor: bg,
  color: '#FFFFFF',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
});

const outlineCircleBtn: React.CSSProperties = {
  width: 44,
  height: 44,
  borderRadius: '50%',
  backgroundColor: 'var(--bg-card)',
  border: '1px solid var(--border-hairline)',
  color: 'var(--text-primary)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
};

const specLabel: React.CSSProperties = {
  fontSize: 'var(--text-2xs)',
  fontWeight: 600,
  letterSpacing: '0.05em',
  textTransform: 'uppercase',
  color: 'var(--text-muted)',
};

export const StyleGuideView: React.FC = () => {
  const closeSubview = useUIStore(state => state.closeSubview);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-page)' }}>
      <h1 className="sr-only">Design System</h1>

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
          <div>
            <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.15 }}>
              Academic Core
            </h2>
            <p style={{ fontSize: 'var(--text-2xs)', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
              Design System · Live Tokens
            </p>
          </div>
        </div>
      </header>

      <div style={{ padding: 'var(--space-md)', display: 'flex', flexDirection: 'column', gap: 'var(--space-xl)' }}>

        {/* ── §5.1 Color ramps ── */}
        <div style={section}>
          <div style={overline}>
            <span style={overlineBar} />
            Color Ramps
          </div>
          {RAMPS.map(ramp => (
            <div key={ramp.name} style={{ ...card, overflow: 'hidden', padding: 0 }}>
              {/* Solid color header block */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px var(--space-md)',
                  backgroundColor: ramp.base,
                }}
              >
                <span style={{ color: '#FFFFFF', fontWeight: 700, fontSize: '0.85rem', letterSpacing: '0.02em' }}>
                  {ramp.name}
                </span>
                <span style={{ color: 'rgba(255,255,255,0.92)', fontFamily: 'var(--font-family-mono)', fontSize: '0.7rem' }}>
                  {ramp.hex}
                </span>
              </div>
              {/* 10-step ramp strip, dark → light */}
              <div style={{ display: 'flex', height: 30, borderTop: '1px solid var(--border-hairline)' }}>
                {ramp.steps.map(step => (
                  <div key={step} style={{ flex: 1, backgroundColor: step }} />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* ── §5.2 Typography specimens ── */}
        <div style={section}>
          <div style={overline}>
            <span style={overlineBar} />
            Typography · Inter
          </div>
          <div
            style={{
              backgroundColor: 'var(--bg-card-tint)',
              borderRadius: 'var(--radius-card)',
              border: '1px solid var(--border-hairline)',
              padding: 'var(--space-md)',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-md)',
            }}
          >
            {TYPO_SPECIMENS.map((spec, i) => (
              <div key={spec.name}>
                {i > 0 && (
                  <div style={{ height: 1, backgroundColor: 'var(--border-hairline)', marginBottom: 'var(--space-md)' }} />
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span style={specLabel}>{spec.name}</span>
                  <span style={{ ...specLabel, color: 'var(--text-muted)' }}>Inter</span>
                </div>
                <div style={{ color: 'var(--text-primary)', marginTop: 6, ...spec.style } as React.CSSProperties}>
                  Aa
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── §5.3 Button specimens ── */}
        <div style={section}>
          <div style={overline}>
            <span style={overlineBar} />
            Buttons
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
            {BUTTONS.map(btn => (
              <div key={btn.name} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <button
                  type="button"
                  style={{
                    width: '100%',
                    padding: '10px 0',
                    borderRadius: 'var(--radius-pill)',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    ...btn.style,
                  }}
                >
                  {btn.name}
                </button>
                <span style={{ ...specLabel, textAlign: 'center' }}>{btn.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── §5.4 Search input specimen ── */}
        <div style={section}>
          <div style={overline}>
            <span style={overlineBar} />
            Search Input
          </div>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Search size={16} style={{ position: 'absolute', left: 14, color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search"
              readOnly
              style={{
                width: '100%',
                padding: '10px 14px 10px 40px',
                borderRadius: 'var(--radius-pill)',
                border: '1px solid var(--neutral-300)',
                backgroundColor: 'var(--neutral-100)',
                fontSize: '0.9rem',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-family)',
              }}
            />
          </div>
        </div>

        {/* ── §5.5 Divider / rule specimens ── */}
        <div style={section}>
          <div style={overline}>
            <span style={overlineBar} />
            Divider / Rule Tokens
          </div>
          <div style={card}>
            <div style={{ padding: 'var(--space-md)', display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
              <div style={{ height: 1, backgroundColor: 'var(--color-primary)' }} />
              <div style={{ height: 2, backgroundColor: 'var(--color-secondary)' }} />
              <div style={{ height: 4, backgroundColor: 'var(--color-tertiary)' }} />
            </div>
          </div>
        </div>

        {/* ── §5.6 Nav / icon-button row specimen ── */}
        <div style={section}>
          <div style={overline}>
            <span style={overlineBar} />
            Nav & Icon Buttons
          </div>
          <div style={{ ...card, display: 'flex', alignItems: 'center', gap: 'var(--space-md)', padding: 'var(--space-md)' }}>
            <button type="button" style={circleBtn('var(--color-primary)')} aria-label="Home icon button specimen">
              <Home size={20} />
            </button>
            <button type="button" style={outlineCircleBtn} aria-label="Search icon button specimen">
              <Search size={20} />
            </button>
            <button type="button" style={outlineCircleBtn} aria-label="User icon button specimen">
              <User size={20} />
            </button>
          </div>
        </div>

        {/* ── §5.7 Small action button specimens ── */}
        <div style={section}>
          <div style={overline}>
            <span style={overlineBar} />
            Action Buttons
          </div>
          <div style={{ ...card, display: 'flex', alignItems: 'center', gap: 'var(--space-md)', padding: 'var(--space-md)' }}>
            <button
              type="button"
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                backgroundColor: 'var(--color-tertiary)',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
              aria-label="Edit icon button specimen"
            >
              <Pencil size={20} />
            </button>
            <button
              type="button"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '10px 18px',
                borderRadius: 'var(--radius-pill)',
                backgroundColor: 'var(--color-primary)',
                color: '#FFFFFF',
                fontSize: '0.9rem',
                fontWeight: 600,
              }}
            >
              <Pencil size={15} /> Label
            </button>
          </div>
        </div>

        {/* ── §5.8 Semantic icon-button row ── */}
        <div style={section}>
          <div style={overline}>
            <span style={overlineBar} />
            Semantic Icon Buttons
          </div>
          <div style={{ ...card, display: 'flex', alignItems: 'center', gap: 'var(--space-md)', padding: 'var(--space-md)' }}>
            {SEMANTIC_ICONS.map(({ Icon, bg, label }) => (
              <button key={bg} type="button" style={circleBtn(bg, 38)} aria-label={label}>
                <Icon size={17} />
              </button>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};
export default StyleGuideView;
