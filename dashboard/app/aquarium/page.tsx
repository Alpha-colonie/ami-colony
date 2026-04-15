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
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
        background: '#0a0d14',
      }}>
        <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '0.9rem', letterSpacing: '0.15em', color: '#fff' }}>
          AMI <span style={{ color: '#f5c842' }}>Colony</span>
          <span style={{ fontSize: '0.6rem', color: 'rgba(200,208,224,0.5)', marginLeft: '0.6rem', fontFamily: 'Space Mono, monospace', fontWeight: 400, letterSpacing: '0.08em' }}>— Aquarium</span>
        </div>

        <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
          {[
            { label: 'Cycle', value: cycle || '—' },
            { label: 'Agents', value: agentsAlive.length || '—' },
            { label: 'Traces', value: traces.length || '—' },
          ].map(s => (
            <span key={s.label} style={{ fontSize: '0.6rem', color: 'rgba(200,208,224,0.55)', letterSpacing: '0.08em' }}>
              {s.label} <strong style={{ color: '#fff', fontSize: '0.7rem' }}>{s.value}</strong>
            </span>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
          <div style={{
            padding: '0.25rem 0.7rem', borderRadius: '10px', fontSize: '0.55rem',
            letterSpacing: '0.12em', fontWeight: 700, border: '1px solid #f5c842',
            background: 'rgba(245,200,66,0.12)', color: '#f5c842',
          }}>α</div>
          {['β','γ','δ'].map(l => (
            <div key={l} title="Accès /lab" style={{
              padding: '0.25rem 0.7rem', borderRadius: '10px', fontSize: '0.55rem',
              letterSpacing: '0.12em', fontWeight: 700, border: '1px solid rgba(255,255,255,0.1)',
              color: 'rgba(200,208,224,0.25)', cursor: 'not-allowed',
            }}>{l}</div>
          ))}
          <Link href="/" style={{
            marginLeft: '1rem', fontSize: '0.58rem', color: 'rgba(200,208,224,0.55)',
            textDecoration: 'none', letterSpacing: '0.1em', textTransform: 'uppercase',
            transition: 'color 0.2s',
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
        <div style={{ borderLeft: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#0a0d14' }}>

          {/* Node legend */}
          <div style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '1rem 1.2rem' }}>
            <div style={{ fontSize: '0.52rem', letterSpacing: '0.14em', color: 'rgba(200,208,224,0.6)', textTransform: 'uppercase', marginBottom: '0.8rem', fontWeight: 700 }}>Noeuds</div>
            {[
              { color: '#f5c842', shadow: '0 0 8px rgba(245,200,66,0.6)', label: 'Nid central' },
              { color: '#30d158',  shadow: 'none', label: 'Ressources (anneau 1)' },
              { color: '#5bcefa', shadow: 'none', label: 'Exploration (anneau 2)' },
              { color: '#ff6b4a', shadow: 'none', label: 'Frontières (anneau 3)' },
            ].map(n => (
              <div key={n.label} style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', fontSize: '0.6rem', color: '#c8d0e0', marginBottom: '0.55rem' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: n.color, boxShadow: n.shadow, flexShrink: 0 }} />
                {n.label}
              </div>
            ))}
          </div>

          {/* Agents list */}
          <div style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '1rem 1.2rem' }}>
            <div style={{ fontSize: '0.52rem', letterSpacing: '0.14em', color: 'rgba(200,208,224,0.6)', textTransform: 'uppercase', marginBottom: '0.8rem', fontWeight: 700 }}>Agents vivants</div>
            {agentsAlive.map(a => (
              <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.6rem', marginBottom: '0.5rem' }}>
                <div style={{ width: '9px', height: '9px', borderRadius: '50%', background: COLORS[a.type] || '#4ade80', flexShrink: 0, boxShadow: `0 0 6px ${COLORS[a.type] || '#4ade80'}66` }} />
                <span style={{ color: '#e2e8f0', flex: 1, fontWeight: 500 }}>{a.identite}</span>
                <span style={{
                  color: a.vitalite < 30 ? '#ff3b3b' : a.vitalite < 60 ? '#ff9f0a' : '#30d158',
                  fontSize: '0.58rem', fontWeight: 700,
                }}>{a.vitalite}%</span>
              </div>
            ))}
            {agentsAlive.length === 0 && (
              <div style={{ fontSize: '0.58rem', color: 'rgba(200,208,224,0.35)', fontStyle: 'italic' }}>En attente…</div>
            )}
          </div>

          {/* Pheromone legend */}
          <div style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '1rem 1.2rem' }}>
            <div style={{ fontSize: '0.52rem', letterSpacing: '0.14em', color: 'rgba(200,208,224,0.6)', textTransform: 'uppercase', marginBottom: '0.8rem', fontWeight: 700 }}>Phéromones</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', fontSize: '0.6rem', color: '#c8d0e0', marginBottom: '0.55rem' }}>
              <div style={{ width: '30px', height: '2px', background: 'repeating-linear-gradient(90deg,rgba(255,255,255,0.8) 0px,rgba(255,255,255,0.8) 4px,transparent 4px,transparent 8px)', flexShrink: 0 }} />
              Trace active
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', fontSize: '0.6rem', color: 'rgba(200,208,224,0.4)', marginBottom: '0.55rem' }}>
              <div style={{ width: '30px', height: '2px', background: 'repeating-linear-gradient(90deg,rgba(255,255,255,0.3) 0px,rgba(255,255,255,0.3) 4px,transparent 4px,transparent 8px)', flexShrink: 0 }} />
              En évaporation
            </div>
          </div>

          {/* Traces log */}
          <div style={{ fontSize: '0.52rem', letterSpacing: '0.14em', color: 'rgba(200,208,224,0.6)', textTransform: 'uppercase', padding: '0.8rem 1.2rem 0.4rem', fontWeight: 700 }}>
            Traces récentes
          </div>
          <div style={{ flex: 1, overflowY: 'auto', scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}>
            {traces.map(trace => {
              const agentType = trace.agents?.type || 'default'
              const color     = COLORS[agentType] || '#4ade80'
              return (
                <div key={trace.id} style={{ padding: '0.65rem 1.2rem', borderBottom: '1px solid rgba(255,255,255,0.05)', animation: 'fadeSlide 0.3s ease' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.2rem' }}>
                    <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: color, flexShrink: 0 }} />
                    <span style={{ color, fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.04em' }}>{trace.agents?.identite || agentType}</span>
                    <span style={{ marginLeft: 'auto', fontSize: '0.48rem', color: 'rgba(200,208,224,0.35)', fontStyle: 'italic' }}>{trace.type}</span>
                  </div>
                  <div style={{ fontSize: '0.57rem', color: '#a0aec0', lineHeight: 1.5, paddingLeft: '1.1rem' }}>
                    {trace.contenu.substring(0, 90)}{trace.contenu.length > 90 ? '…' : ''}
                  </div>
                </div>
              )
            })}
            {traces.length === 0 && (
              <div style={{ padding: '1.5rem 1.2rem', fontSize: '0.58rem', color: 'rgba(200,208,224,0.35)', fontStyle: 'italic' }}>En attente du premier cycle…</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
