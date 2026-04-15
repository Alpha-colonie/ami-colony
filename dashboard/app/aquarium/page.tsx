'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { supabase, COLONY_ID } from '@/lib/supabase'
import type { Agent, Trace } from '@/lib/types'

const HexAquarium = dynamic(() => import('@/components/HexAquarium'), { ssr: false })

const COLORS: Record<string, string> = {
  reine:      '#f5c842',
  tisseuse:   '#5bcefa',
  batisseuse: '#ff6b4a',
  gardienne:  '#a78bfa',
}

interface AgentHover {
  identite: string; type: string; vitalite: number; generation: number
  nodeId: number; x: number; y: number
}

export default function AquariumPage() {
  const [agents,    setAgents]    = useState<Agent[]>([])
  const [traces,    setTraces]    = useState<Trace[]>([])
  const [cycle,     setCycle]     = useState(0)
  const [hovered,   setHovered]   = useState<AgentHover | null>(null)
  const [tooltipPos,setTooltipPos]= useState({ x: 0, y: 0 })
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function load() {
      const { data: ag } = await supabase
        .from('agents_public')
        .select('*')
        .eq('colony_id', COLONY_ID)
      if (ag) setAgents(ag as Agent[])

      const { data: tr } = await supabase
        .from('traces_public')
        .select('*, agents:agent_id(identite, type)')
        .eq('colony_id', COLONY_ID)
        .order('created_at', { ascending: false })
        .limit(30)
      if (tr) setTraces(tr as unknown as Trace[])

      const { data: cc } = await supabase
        .from('cycle_counter')
        .select('cycle_actuel')
        .eq('colony_id', COLONY_ID)
        .maybeSingle()
      if (cc) setCycle(cc.cycle_actuel)
    }
    load()
  }, [])

  useEffect(() => {
    const channel = supabase
      .channel(`aquarium-${COLONY_ID}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'traces_public',
        filter: `colony_id=eq.${COLONY_ID}`,
      }, async (payload) => {
        const { data: ag } = await supabase
          .from('agents_public')
          .select('identite, type')
          .eq('id', payload.new.agent_id)
          .maybeSingle()
        const trace = { ...payload.new, agents: ag || undefined } as unknown as Trace
        setTraces(prev => [trace, ...prev].slice(0, 30))
        setCycle(prev => payload.new.cycle || prev)
      })
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'agents_public',
        filter: `colony_id=eq.${COLONY_ID}`,
      }, async () => {
        const { data } = await supabase.from('agents_public').select('*').eq('colony_id', COLONY_ID)
        if (data) setAgents(data as Agent[])
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  const agentsAlive = agents.filter(a => a.vivant)

  const handleHover = (agent: AgentHover | null) => {
    setHovered(agent)
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!wrapRef.current) return
    const rect = wrapRef.current.getBoundingClientRect()
    setTooltipPos({ x: e.clientX - rect.left + 16, y: e.clientY - rect.top + 16 })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#04060a' }}>

      {/* Header */}
      <header style={{
        padding: '0.8rem 1.5rem',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '0.9rem', letterSpacing: '0.15em', color: '#fff' }}>
          AMI <span style={{ color: '#f5c842' }}>Colony</span> — Aquarium
        </div>

        <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
          <span style={{ fontSize: '0.58rem', color: 'var(--text-dim)', letterSpacing: '0.08em' }}>
            Cycle <strong style={{ color: '#fff' }}>{cycle || '—'}</strong>
          </span>
          <span style={{ fontSize: '0.58rem', color: 'var(--text-dim)', letterSpacing: '0.08em' }}>
            Agents <strong style={{ color: '#fff' }}>{agentsAlive.length || '—'}</strong>
          </span>
          <span style={{ fontSize: '0.58rem', color: 'var(--text-dim)', letterSpacing: '0.08em' }}>
            Traces <strong style={{ color: '#fff' }}>{traces.length || '—'}</strong>
          </span>
        </div>

        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
          {/* Only colony Alpha is public */}
          <div style={{
            padding: '0.2rem 0.6rem', borderRadius: '10px', fontSize: '0.5rem',
            letterSpacing: '0.1em', fontWeight: 700, border: '1px solid #f5c842',
            background: 'rgba(255,255,255,0.06)', color: '#f5c842',
          }}>α</div>
          {['β','γ','δ'].map(l => (
            <div key={l} title="Données privées" style={{
              padding: '0.2rem 0.6rem', borderRadius: '10px', fontSize: '0.5rem',
              letterSpacing: '0.1em', fontWeight: 700, border: '1px solid transparent',
              color: 'var(--text-faint)', cursor: 'not-allowed',
            }}>{l}</div>
          ))}
          <Link href="/" style={{
            marginLeft: '1rem',
            fontSize: '0.58rem', color: 'var(--text-dim)',
            textDecoration: 'none', letterSpacing: '0.1em', textTransform: 'uppercase',
          }}>
            ← Observatoire
          </Link>
        </div>
      </header>

      {/* Content */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 260px', overflow: 'hidden' }}>

        {/* Canvas */}
        <div
          ref={wrapRef}
          style={{ position: 'relative', overflow: 'hidden' }}
          onMouseMove={handleMouseMove}
        >
          <HexAquarium agents={agentsAlive} traces={traces} onHover={handleHover as any} />

          {/* Tooltip */}
          {hovered && (
            <div style={{
              position: 'absolute',
              left: tooltipPos.x, top: tooltipPos.y,
              background: 'rgba(10,15,25,0.92)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '3px',
              padding: '0.6rem 0.8rem',
              fontSize: '0.58rem',
              pointerEvents: 'none',
              zIndex: 10,
              minWidth: '140px',
            }}>
              <div style={{ fontWeight: 700, fontFamily: 'Syne, sans-serif', fontSize: '0.7rem', marginBottom: '0.3rem', color: COLORS[hovered.type] || '#fff' }}>
                {hovered.identite}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', color: 'var(--text-dim)', marginTop: '0.15rem' }}>
                <span>Vitalité</span><strong style={{ color: 'var(--text)' }}>{hovered.vitalite}%</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', color: 'var(--text-dim)', marginTop: '0.15rem' }}>
                <span>Génération</span><strong style={{ color: 'var(--text)' }}>{hovered.generation}</strong>
              </div>
            </div>
          )}
        </div>

        {/* Side panel */}
        <div style={{ borderLeft: '1px solid var(--border)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* Node legend */}
          <div style={{ borderBottom: '1px solid var(--border)', padding: '0.9rem 1rem' }}>
            <div style={{ fontSize: '0.5rem', letterSpacing: '0.14em', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '0.7rem' }}>Noeuds</div>
            {[
              { color: '#f5c842', shadow: '0 0 6px #f5c842', label: 'Nid central' },
              { color: 'rgba(48,209,88,0.7)',  label: 'Ressources (anneau 1)' },
              { color: 'rgba(91,206,250,0.5)', label: 'Exploration (anneau 2)' },
              { color: 'rgba(255,100,60,0.4)', label: 'Frontières (anneau 3)' },
            ].map(n => (
              <div key={n.label} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.58rem', color: 'var(--text-dim)', marginBottom: '0.5rem' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: n.color, boxShadow: n.shadow, flexShrink: 0 }} />
                {n.label}
              </div>
            ))}
          </div>

          {/* Agents list */}
          <div style={{ borderBottom: '1px solid var(--border)', padding: '0.9rem 1rem' }}>
            <div style={{ fontSize: '0.5rem', letterSpacing: '0.14em', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '0.7rem' }}>Agents vivants</div>
            {agentsAlive.map(a => (
              <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.58rem', marginBottom: '0.45rem' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: COLORS[a.type] || '#4ade80', flexShrink: 0 }} />
                <span style={{ color: 'var(--text)', flex: 1 }}>{a.identite}</span>
                <span style={{ color: 'var(--text-dim)', fontSize: '0.52rem' }}>{a.vitalite}%</span>
              </div>
            ))}
            {agentsAlive.length === 0 && (
              <div style={{ fontSize: '0.55rem', color: 'var(--text-faint)', fontStyle: 'italic' }}>En attente…</div>
            )}
          </div>

          {/* Pheromone legend */}
          <div style={{ borderBottom: '1px solid var(--border)', padding: '0.9rem 1rem' }}>
            <div style={{ fontSize: '0.5rem', letterSpacing: '0.14em', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '0.7rem' }}>Phéromones</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.56rem', color: 'var(--text-dim)', marginBottom: '0.5rem' }}>
              <div style={{ width: '30px', height: '2px', background: 'repeating-linear-gradient(90deg,rgba(255,255,255,0.7) 0px,rgba(255,255,255,0.7) 4px,transparent 4px,transparent 8px)' }} />
              Trace active — intensité forte
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.56rem', color: 'var(--text-dim)', opacity: 0.4 }}>
              <div style={{ width: '30px', height: '2px', background: 'repeating-linear-gradient(90deg,rgba(255,255,255,0.7) 0px,rgba(255,255,255,0.7) 4px,transparent 4px,transparent 8px)' }} />
              Trace en évaporation
            </div>
          </div>

          {/* Interactions log */}
          <div style={{ fontSize: '0.5rem', letterSpacing: '0.14em', color: 'var(--text-dim)', textTransform: 'uppercase', padding: '0.7rem 1rem 0.3rem', borderTop: '1px solid var(--border)' }}>
            Traces récentes
          </div>
          <div style={{ flex: 1, overflowY: 'auto', scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.06) transparent' }}>
            {traces.map(trace => {
              const agentType = trace.agents?.type || 'default'
              const color     = COLORS[agentType] || '#4ade80'
              return (
                <div key={trace.id} style={{ padding: '0.55rem 1rem', borderBottom: '1px solid var(--border)', fontSize: '0.55rem', color: 'var(--text-dim)', lineHeight: 1.5, animation: 'fadeSlide 0.3s ease' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.15rem' }}>
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: color }} />
                    <span style={{ color, fontSize: '0.52rem', fontWeight: 700 }}>{trace.agents?.identite || agentType}</span>
                  </div>
                  <div style={{ fontSize: '0.5rem', color: 'var(--text-dim)', fontStyle: 'italic' }}>
                    {trace.type}
                  </div>
                  <div style={{ marginTop: '0.1rem' }}>
                    {trace.contenu.substring(0, 80)}{trace.contenu.length > 80 ? '…' : ''}
                  </div>
                </div>
              )
            })}
            {traces.length === 0 && (
              <div style={{ padding: '1rem', fontSize: '0.55rem', color: 'var(--text-faint)', fontStyle: 'italic' }}>En attente du premier cycle…</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
