'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const COLONIES = [
  { id: 1, label: 'α Alpha',  color: '#f5c842', world: 'l\'enceinte' },
  { id: 2, label: 'β Beta',   color: '#5bcefa', world: 'le territoire' },
  { id: 3, label: 'γ Gamma',  color: '#ff6b4a', world: 'la sphère' },
  { id: 4, label: 'δ Delta',  color: '#a78bfa', world: 'la zone' },
]

interface ColonyData {
  cycle:       number
  agents:      number
  agentsVivants: { type: string; identite: string; vitalite: number; generation: number }[]
  nourriture:  number
  eau:         number
  energie:     number
  cohesion:    number
  naissances:  number
  morts:       number
  quotaUsed:   number
  quotaMax:    number
  lastTrace:   string
  queenSignal: { contenu: string; urgence: number } | null
  meteo:       string
}

const EMPTY: ColonyData = {
  cycle: 0, agents: 0, agentsVivants: [],
  nourriture: 0, eau: 0, energie: 0, cohesion: 0,
  naissances: 0, morts: 0, quotaUsed: 0, quotaMax: 1500,
  lastTrace: '', queenSignal: null, meteo: '—',
}

async function loadColony(id: number): Promise<ColonyData> {
  const [cycle, agents, resources, quota, births, deaths, trace, queen, meteo] = await Promise.all([
    supabase.from('cycle_counter').select('cycle_actuel').eq('colony_id', id).maybeSingle(),
    supabase.from('colony_agents_lab').select('type,identite,vitalite,generation').eq('colony_id', id).eq('vivant', true),
    supabase.from('colony_resources_lab').select('nourriture,eau,energie_collective,cohesion').eq('colony_id', id).maybeSingle(),
    supabase.from('api_keys_lab').select('used_today,quota_day').eq('colony_id', id).eq('provider', 'gemini').maybeSingle(),
    supabase.from('colony_history_lab').select('id', { count: 'exact', head: true }).eq('colony_id', id).eq('event_type', 'naissance'),
    supabase.from('colony_history_lab').select('id', { count: 'exact', head: true }).eq('colony_id', id).eq('event_type', 'mort'),
    supabase.from('traces_lab').select('contenu').eq('colony_id', id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('queen_requests_lab').select('contenu,urgence').eq('colony_id', id).eq('statut', 'envoyee').order('urgence', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('events').select('type').eq('colony_id', id).eq('actif', true).eq('source', 'meteo').maybeSingle(),
  ])

  const ag = agents.data || []
  return {
    cycle:       cycle.data?.cycle_actuel || 0,
    agents:      ag.length,
    agentsVivants: ag,
    nourriture:  resources.data?.nourriture || 0,
    eau:         resources.data?.eau || 0,
    energie:     resources.data?.energie_collective || 0,
    cohesion:    resources.data?.cohesion || 0,
    naissances:  births.count || 0,
    morts:       deaths.count || 0,
    quotaUsed:   quota.data?.used_today || 0,
    quotaMax:    quota.data?.quota_day || 1500,
    lastTrace:   trace.data?.contenu || '',
    queenSignal: queen.data || null,
    meteo:       meteo.data?.type || '—',
  }
}

export default function LabPage() {
  const router = useRouter()
  const [data, setData]       = useState<Record<number, ColonyData>>({ 1: EMPTY, 2: EMPTY, 3: EMPTY, 4: EMPTY })
  const [loading, setLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)
  const [intervention, setIntervention] = useState<{ colonyId: number; loading: boolean } | null>(null)

  async function refresh() {
    const results = await Promise.all(COLONIES.map(c => loadColony(c.id)))
    const next: Record<number, ColonyData> = {}
    COLONIES.forEach((c, i) => { next[c.id] = results[i] })
    setData(next)
    setLastRefresh(new Date())
    setLoading(false)
  }

  useEffect(() => {
    refresh()
    const interval = setInterval(refresh, 60_000) // refresh every minute
    return () => clearInterval(interval)
  }, [])

  async function logout() {
    await fetch('/api/lab-auth', { method: 'DELETE' })
    router.push('/')
  }

  async function triggerCycle(colonyId: number) {
    setIntervention({ colonyId, loading: true })
    try {
      await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/colony-cycle`, {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_LAB_SERVICE_KEY}`,
        },
        body: JSON.stringify({ colony_id: colonyId }),
      })
      await refresh()
    } finally {
      setIntervention(null)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#04060a', fontFamily: 'Space Mono, monospace', color: '#c8d0e0' }}>

      {/* Header */}
      <header style={{
        padding: '1rem 2rem',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '1rem', letterSpacing: '0.15em', color: '#fff' }}>
            AMI <span style={{ color: '#f5c842' }}>Colony</span>
            <span style={{ fontSize: '0.6rem', color: 'rgba(200,208,224,0.35)', marginLeft: '1rem', letterSpacing: '0.1em' }}>MÈRE NATURE</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', fontSize: '0.55rem', letterSpacing: '0.1em' }}>
          {lastRefresh && (
            <span style={{ color: 'rgba(200,208,224,0.3)' }}>
              Actualisé {lastRefresh.toLocaleTimeString('fr-FR')}
            </span>
          )}
          <button onClick={refresh} style={{ background: 'none', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '2px', padding: '0.3rem 0.8rem', color: 'rgba(200,208,224,0.5)', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.55rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            ↻ Refresh
          </button>
          <Link href="/" style={{ color: 'rgba(200,208,224,0.35)', textDecoration: 'none', textTransform: 'uppercase' }}>Public</Link>
          <button onClick={logout} style={{ background: 'none', border: 'none', color: 'rgba(200,208,224,0.3)', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.55rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            Déconnexion
          </button>
        </div>
      </header>

      {/* Grid 4 colonies */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1px', background: 'rgba(255,255,255,0.06)', minHeight: 'calc(100vh - 57px)' }}>
        {COLONIES.map(colony => {
          const d = data[colony.id]
          const foodPct    = Math.round(d.nourriture / 10)
          const waterPct   = Math.round(d.eau / 10)
          const energyPct  = Math.round(d.energie / 10)
          const quotaPct   = Math.round((d.quotaUsed / d.quotaMax) * 100)
          const isTrigger  = intervention?.colonyId === colony.id

          return (
            <div key={colony.id} style={{ background: '#04060a', padding: '1.5rem', position: 'relative' }}>

              {/* Colony header */}
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '1.2rem' }}>
                <div>
                  <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '1.1rem', color: colony.color }}>
                    {colony.label}
                  </span>
                  <span style={{ fontSize: '0.52rem', color: 'rgba(200,208,224,0.3)', marginLeft: '0.8rem', letterSpacing: '0.1em' }}>
                    {colony.world}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.55rem', color: 'rgba(200,208,224,0.35)', letterSpacing: '0.08em' }}>
                    cycle <span style={{ color: colony.color }}>{d.cycle}</span>
                  </span>
                  <span style={{ fontSize: '0.5rem', color: 'rgba(200,208,224,0.2)' }}>·</span>
                  <span style={{ fontSize: '0.52rem', color: 'rgba(200,208,224,0.35)' }}>{d.meteo}</span>
                </div>
              </div>

              {/* Signal urgence reine */}
              {d.queenSignal && (
                <div style={{
                  marginBottom: '1rem',
                  padding: '0.6rem 0.8rem',
                  border: `1px solid ${d.queenSignal.urgence >= 90 ? 'rgba(255,59,59,0.5)' : 'rgba(245,200,66,0.3)'}`,
                  borderRadius: '3px',
                  background: d.queenSignal.urgence >= 90 ? 'rgba(255,59,59,0.06)' : 'rgba(245,200,66,0.04)',
                  animation: d.queenSignal.urgence >= 90 ? 'pulse-live 2s ease-in-out infinite' : 'none',
                }}>
                  <div style={{ fontSize: '0.5rem', letterSpacing: '0.12em', color: d.queenSignal.urgence >= 90 ? '#ff3b3b' : '#f5c842', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                    ◈ Signal reine — urgence {d.queenSignal.urgence}
                  </div>
                  <div style={{ fontSize: '0.58rem', color: 'rgba(200,208,224,0.6)', fontStyle: 'italic', lineHeight: 1.4 }}>
                    {d.queenSignal.contenu.substring(0, 100)}…
                  </div>
                </div>
              )}

              {/* Stats agents */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', marginBottom: '1rem' }}>
                <MiniStat label="Agents" value={d.agents} color={colony.color} />
                <MiniStat label="Naissances" value={d.naissances} color="#30d158" />
                <MiniStat label="Morts" value={d.morts} color="#ff3b3b" />
              </div>

              {/* Agents list */}
              <div style={{ marginBottom: '1rem' }}>
                {d.agentsVivants.map((a, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.52rem', marginBottom: '0.3rem' }}>
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: AGENT_COLOR[a.type] || '#4ade80', flexShrink: 0 }} />
                    <span style={{ color: '#c8d0e0', flex: 1 }}>{a.identite}</span>
                    <VitalBar vitalite={a.vitalite} />
                  </div>
                ))}
              </div>

              {/* Ressources */}
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ fontSize: '0.5rem', letterSpacing: '0.12em', color: 'rgba(200,208,224,0.3)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Ressources</div>
                <ResourceBar label="Nourriture" value={d.nourriture} max={1000} color={foodPct < 20 ? '#ff3b3b' : foodPct < 40 ? '#ff9f0a' : '#30d158'} />
                <ResourceBar label="Eau"        value={d.eau}        max={1000} color={waterPct < 20 ? '#ff3b3b' : waterPct < 40 ? '#ff9f0a' : '#5bcefa'} />
                <ResourceBar label="Énergie"    value={d.energie}    max={1000} color="#a78bfa" />
                <ResourceBar label="Cohésion"   value={d.cohesion}   max={1000} color={colony.color} />
              </div>

              {/* Quota Gemini */}
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.5rem', color: 'rgba(200,208,224,0.3)', letterSpacing: '0.08em', marginBottom: '0.3rem' }}>
                  <span>QUOTA GEMINI</span>
                  <span style={{ color: quotaPct > 85 ? '#ff3b3b' : 'rgba(200,208,224,0.5)' }}>
                    {d.quotaUsed} / {d.quotaMax}
                  </span>
                </div>
                <div style={{ height: '3px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px' }}>
                  <div style={{ height: '100%', width: `${Math.min(100, quotaPct)}%`, background: quotaPct > 85 ? '#ff3b3b' : quotaPct > 60 ? '#ff9f0a' : colony.color, borderRadius: '2px', transition: 'width 0.5s' }} />
                </div>
              </div>

              {/* Dernière trace */}
              {d.lastTrace && (
                <div style={{ fontSize: '0.52rem', color: 'rgba(200,208,224,0.25)', fontStyle: 'italic', lineHeight: 1.4, borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '0.7rem', marginBottom: '1rem' }}>
                  {d.lastTrace.substring(0, 120)}{d.lastTrace.length > 120 ? '…' : ''}
                </div>
              )}

              {/* Actions */}
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={() => triggerCycle(colony.id)}
                  disabled={!!intervention}
                  style={{
                    flex: 1, padding: '0.5rem', background: 'rgba(255,255,255,0.03)',
                    border: `1px solid ${colony.color}33`, borderRadius: '2px',
                    color: isTrigger ? colony.color : 'rgba(200,208,224,0.4)',
                    fontFamily: 'Space Mono, monospace', fontSize: '0.5rem',
                    letterSpacing: '0.1em', textTransform: 'uppercase', cursor: intervention ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  {isTrigger ? '⟳ Cycle…' : '▶ Forcer cycle'}
                </button>
              </div>

              {loading && (
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(4,6,10,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.55rem', color: 'rgba(200,208,224,0.3)', letterSpacing: '0.1em' }}>
                  Chargement…
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

const AGENT_COLOR: Record<string, string> = {
  reine: '#f5c842', tisseuse: '#5bcefa', batisseuse: '#ff6b4a', gardienne: '#a78bfa',
}

function MiniStat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '0.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: '2px', border: '1px solid rgba(255,255,255,0.04)' }}>
      <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '1.2rem', color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: '0.45rem', color: 'rgba(200,208,224,0.3)', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: '0.2rem' }}>{label}</div>
    </div>
  )
}

function ResourceBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = Math.round((value / max) * 100)
  return (
    <div style={{ marginBottom: '0.4rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.48rem', color: 'rgba(200,208,224,0.35)', marginBottom: '0.15rem' }}>
        <span>{label}</span>
        <span>{value} <span style={{ opacity: 0.5 }}>/ {max}</span></span>
      </div>
      <div style={{ height: '3px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px' }}>
        <div style={{ height: '100%', width: `${Math.min(100, pct)}%`, background: color, borderRadius: '2px', transition: 'width 0.5s', opacity: 0.8 }} />
      </div>
    </div>
  )
}

function VitalBar({ vitalite }: { vitalite: number }) {
  const color = vitalite < 30 ? '#ff3b3b' : vitalite < 60 ? '#ff9f0a' : '#30d158'
  return (
    <div style={{ width: '40px', height: '3px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px' }}>
      <div style={{ height: '100%', width: `${vitalite}%`, background: color, borderRadius: '2px' }} />
    </div>
  )
}
