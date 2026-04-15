'use client'

interface Props {
  cycle:       number
  agents:      number
  naissances:  number
  morts:       number
  genMax:      number
}

export default function ColonyStats({ cycle, agents, naissances, morts, genMax }: Props) {
  const age = Math.floor(cycle / 48)

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      borderBottom: '1px solid var(--border)',
    }}>
      <Stat label="Cycle actuel" value={cycle || '—'} sub={`âge: ${age} jours`} />
      <Stat label="Agents vivants" value={agents || '—'} sub={`génération max: ${genMax || '—'}`} />
      <Stat label="Naissances" value={naissances || '—'} sub="total colonie" valueColor="var(--ok)" />
      <Stat label="Morts" value={morts || '—'} sub="total colonie" valueColor="var(--danger)" last />
    </div>
  )
}

function Stat({
  label, value, sub, valueColor, last
}: {
  label: string; value: number | string; sub: string; valueColor?: string; last?: boolean
}) {
  return (
    <div style={{
      padding: '1.2rem 1.5rem',
      borderRight: last ? 'none' : '1px solid var(--border)',
      borderTop: '1px solid var(--border)',
    }}>
      <div style={{ fontSize: '0.55rem', letterSpacing: '0.12em', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
        {label}
      </div>
      <div style={{
        fontFamily: 'Syne, sans-serif',
        fontSize: '1.6rem',
        fontWeight: 800,
        color: valueColor || '#fff',
        lineHeight: 1,
      }}>
        {value}
      </div>
      <div style={{ fontSize: '0.55rem', color: 'var(--text-dim)', marginTop: '0.25rem' }}>
        {sub}
      </div>
    </div>
  )
}
