'use client'

import type { Trace, QueenRequest } from '@/lib/types'

const COLORS: Record<string, string> = {
  reine:      '#f5c842',
  tisseuse:   '#5bcefa',
  batisseuse: '#ff6b4a',
  gardienne:  '#a78bfa',
  default:    '#4ade80',
}

function censorTrace(text: string): string {
  // Censure partielle : révèle le début, censure la fin ou inversement
  if (text.length < 30) return text
  const words = text.split(' ')
  return words.map((w, i) => {
    // Censure ~40% des mots (ceux au milieu)
    if (i > 1 && i < words.length - 1 && Math.sin(i * 7.3) > 0.2) {
      return `<span style="display:inline-block;background:rgba(255,255,255,0.06);color:transparent;border-radius:2px;user-select:none">${'█'.repeat(Math.max(3, w.length))}</span>`
    }
    return w
  }).join(' ')
}

interface Props {
  traces:       Trace[]
  queenRequest: QueenRequest | null
  cycle:        number
}

export default function TraceFeed({ traces, queenRequest, cycle }: Props) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>

      <div style={{
        padding: '1rem 1.5rem 0.6rem',
        fontSize: '0.55rem',
        letterSpacing: '0.15em',
        color: 'var(--text-faint)',
        textTransform: 'uppercase',
        borderBottom: '1px solid var(--border)',
        flexShrink: 0,
      }}>
        traces récentes — contenu partiel
      </div>

      <div style={{ flex: 1, overflowY: 'auto', scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.08) transparent' }}>

        {/* Signal reine */}
        {queenRequest && (
          <div style={{
            margin: '0.5rem 1rem',
            padding: '0.7rem 1rem',
            border: '1px solid rgba(245,200,66,0.25)',
            borderRadius: '3px',
            background: 'rgba(245,200,66,0.05)',
            animation: 'fadeIn 0.4s ease',
          }}>
            <div style={{
              fontSize: '0.55rem',
              letterSpacing: '0.12em',
              color: 'var(--queen)',
              textTransform: 'uppercase',
              marginBottom: '0.3rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}>
              <span>◈</span> Signal externe — cycle {queenRequest.cycle}
            </div>
            <div style={{ fontSize: '0.6rem', color: 'rgba(245,200,66,0.6)', fontStyle: 'italic' }}>
              {queenRequest.contenu.substring(0, 120)}…
            </div>
          </div>
        )}

        {/* Traces */}
        {traces.map(trace => {
          const agentType = trace.agents?.type || 'default'
          const color     = COLORS[agentType] || COLORS.default
          const censored  = censorTrace(trace.contenu)

          return (
            <div
              key={trace.id}
              style={{
                padding: '0.9rem 1.5rem',
                borderBottom: '1px solid var(--border)',
                display: 'grid',
                gridTemplateColumns: 'auto 1fr auto',
                gap: '0.75rem',
                alignItems: 'start',
                animation: 'fadeIn 0.4s ease',
              }}
            >
              <div style={{
                width: '8px', height: '8px',
                borderRadius: '50%',
                background: color,
                marginTop: '4px',
                flexShrink: 0,
              }} />
              <div style={{ minWidth: 0 }}>
                <div style={{
                  fontSize: '0.62rem',
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color,
                  marginBottom: '0.25rem',
                }}>
                  {trace.agents?.identite || agentType}
                </div>
                <div
                  style={{ fontSize: '0.6rem', color: 'var(--text-dim)', lineHeight: 1.5, fontStyle: 'italic' }}
                  dangerouslySetInnerHTML={{ __html: censored }}
                />
              </div>
              <div style={{ fontSize: '0.52rem', color: 'var(--text-faint)', whiteSpace: 'nowrap', marginTop: '2px' }}>
                #{cycle > 0 ? cycle : '—'}
              </div>
            </div>
          )
        })}

        {traces.length === 0 && (
          <div style={{ padding: '2rem 1.5rem', fontSize: '0.6rem', color: 'var(--text-faint)', fontStyle: 'italic' }}>
            En attente du premier cycle…
          </div>
        )}
      </div>

      {/* Légende */}
      <div style={{
        padding: '1rem 1.5rem',
        borderTop: '1px solid var(--border)',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '0.8rem',
        flexShrink: 0,
      }}>
        {Object.entries({ Reine: '#f5c842', Tisseuse: '#5bcefa', Bâtisseuse: '#ff6b4a', Gardienne: '#a78bfa' }).map(([label, color]) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.55rem', color: 'var(--text-dim)', letterSpacing: '0.06em' }}>
            <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: color, flexShrink: 0 }} />
            {label}
          </div>
        ))}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.55rem', color: 'var(--text-dim)', letterSpacing: '0.06em' }}>
          <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)', flexShrink: 0 }} />
          Taille = âge
        </div>
      </div>
    </div>
  )
}
