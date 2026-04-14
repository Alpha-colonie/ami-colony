# ⚡ Edge Function — Cycle de Vie des Agents
## Supabase Edge Function — Deno / TypeScript

---

## 📁 Structure des fichiers

```
supabase/
  functions/
    colony-cycle/
      index.ts          ← Point d'entrée principal
      agent.ts          ← Logique d'un agent
      memory.ts         ← Gestion mémoire
      weather.ts        ← Traduction météo → événement
      evolution.ts      ← Évolution ADN + prompt
      queen.ts          ← Logique spéciale reine
      types.ts          ← Types TypeScript
```

---

## 📄 types.ts

```typescript
export interface Adn {
  curiosite:   number  // 0-100
  sociabilite: number  // 0-100
  agressivite: number  // 0-100
  memoire:     number  // 0-100
}

export interface Agent {
  id:              string
  nom:             string | null
  type:            'reine' | 'ouvriere' | 'soldat' | 'exploratrice'
  identite:        string | null
  adn:             Adn
  prompt_actuel:   string
  vitalite:        number
  zone_id:         number
  parent_id:       string | null
  generation:      number
  vivant:          boolean
  cycle_naissance: number
}

export interface Zone {
  id:          number
  nom:         string
  type:        string
  ressources:  number
  danger:      number
  eau:         number
  temperature: number
  accessible:  boolean
}

export interface Trace {
  id:        string
  agent_id:  string
  zone_id:   number
  type:      string
  contenu:   string
  intensite: number
}

export interface Event {
  id:        string
  type:      string
  zone_id:   number | null
  intensite: number
  actif:     boolean
}

export interface MemoryContext {
  immediate:  ImmediateMemory[]
  episodique: EpisodicMemory[]
  collective: CollectiveMemory[]
}

export interface ImmediateMemory {
  cycle:      number
  action:     string
  perception: string
  etat:       string
  succes:     boolean
}

export interface EpisodicMemory {
  type:     string
  contenu:  string
  ressenti: string
  force:    number
  cycle:    number
}

export interface CollectiveMemory {
  type:    string
  contenu: string
  force:   number
}

export interface AgentResponse {
  perception:       string
  etat_interne:     string
  decision:         string
  action: {
    type:      string
    zone_cible: number
    intensite:  number
    trait_utilise: 'curiosite' | 'sociabilite' | 'agressivite' | 'memoire'
    succes:     boolean
  }
  trace: {
    type:      string
    contenu:   string
    intensite: number
  }
  nouvelle_memoire?: {
    type:      string
    contenu:   string
    ressenti:  string
    intensite: number
  }
  requete_externe?: {
    contenu: string
    urgence: number
  } | null
}

export interface WeatherData {
  temperature:  number
  vent_kmh:     number
  precipitation: number
  weather_code: number
  visibilite_km: number
}
```

---

## 📄 memory.ts

```typescript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import type { MemoryContext } from './types.ts'

export async function buildMemoryContext(
  supabase: ReturnType<typeof createClient>,
  agentId:  string,
  cycle:    number
): Promise<MemoryContext> {

  const { data } = await supabase
    .rpc('build_memory_context', {
      p_agent_id: agentId,
      p_cycle:    cycle
    })

  return data || { immediate: [], episodique: [], collective: [] }
}

export async function maybeCreateMemory(
  supabase:   ReturnType<typeof createClient>,
  agentId:    string,
  cycle:      number,
  type:       string,
  contenu:    string,
  ressenti:   string,
  intensite:  number,
  zoneId:     number
): Promise<void> {
  if (intensite <= 70) return

  await supabase
    .from('colony.agent_memory')
    .insert({
      agent_id:  agentId,
      cycle,
      type,
      contenu,
      ressenti,
      intensite,
      zone_id:   zoneId
    })
}

export async function updateCollectiveMemory(
  supabase:  ReturnType<typeof createClient>,
  agentId:   string,
  type:      string,
  contenu:   string,
  cycle:     number
): Promise<void> {
  // Chercher si ce pattern existe déjà
  const { data: existing } = await supabase
    .from('colony.collective_memory')
    .select('*')
    .eq('type', type)
    .ilike('contenu', `%${contenu.substring(0, 30)}%`)
    .eq('actif', true)
    .single()

  if (existing) {
    // Renforcer le pattern existant
    await supabase
      .from('colony.collective_memory')
      .update({
        force:         existing.force + 1,
        contribue_par: [...(existing.contribue_par || []), agentId],
        dernier_cycle: cycle,
        updated_at:    new Date().toISOString()
      })
      .eq('id', existing.id)
  } else {
    // Créer un nouveau pattern
    await supabase
      .from('colony.collective_memory')
      .insert({
        type,
        contenu,
        force:         1,
        contribue_par: [agentId],
        premier_cycle: cycle,
        dernier_cycle: cycle
      })
  }
}
```

---

## 📄 weather.ts

```typescript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import type { WeatherData } from './types.ts'

interface City {
  id:        number
  nom:       string
  pays:      string
  latitude:  number
  longitude: number
  hemisphere: string
  phase:     string
}

export async function fetchCurrentWeather(city: City): Promise<WeatherData | null> {
  try {
    const url = `https://api.open-meteo.com/v1/forecast` +
      `?latitude=${city.latitude}` +
      `&longitude=${city.longitude}` +
      `&current=temperature_2m,wind_speed_10m,precipitation,weather_code,visibility`

    const response = await fetch(url)
    const data     = await response.json()
    const current  = data.current

    return {
      temperature:   current.temperature_2m,
      vent_kmh:      current.wind_speed_10m,
      precipitation: current.precipitation,
      weather_code:  current.weather_code,
      visibilite_km: (current.visibility || 10000) / 1000
    }
  } catch (err) {
    console.error('Weather fetch error:', err)
    return null
  }
}

export function translateWeatherToEvent(
  weather: WeatherData
): { type: string; intensite: number; description: string } {

  const { temperature, vent_kmh, precipitation, visibilite_km } = weather

  // Priorité aux conditions extrêmes
  if (temperature > 38) {
    return {
      type:        'canicule',
      intensite:   Math.min(100, Math.floor((temperature - 38) * 5 + 60)),
      description: `Canicule extrême — ${temperature}°C`
    }
  }

  if (vent_kmh > 80) {
    return {
      type:        'tempete',
      intensite:   Math.min(100, Math.floor(vent_kmh - 30)),
      description: `Tempête violente — ${vent_kmh} km/h`
    }
  }

  if (precipitation > 20) {
    return {
      type:        'pluie_forte',
      intensite:   Math.min(100, Math.floor(precipitation * 2)),
      description: `Pluie intense — ${precipitation}mm`
    }
  }

  if (temperature < -5) {
    return {
      type:        'neige',
      intensite:   Math.min(100, Math.floor(Math.abs(temperature) * 5)),
      description: `Gel intense — ${temperature}°C`
    }
  }

  if (vent_kmh > 50) {
    return {
      type:        'vent_fort',
      intensite:   Math.floor(vent_kmh - 20),
      description: `Vents forts — ${vent_kmh} km/h`
    }
  }

  if (visibilite_km < 1) {
    return {
      type:        'brouillard',
      intensite:   Math.floor((1 - visibilite_km) * 80),
      description: `Brouillard dense — ${visibilite_km}km visibilité`
    }
  }

  if (temperature < 5) {
    return {
      type:        'neige',
      intensite:   Math.floor(Math.abs(temperature) * 3),
      description: `Froid intense — ${temperature}°C`
    }
  }

  if (precipitation > 5) {
    return {
      type:        'pluie_legere',
      intensite:   Math.floor(precipitation * 3),
      description: `Pluie légère — ${precipitation}mm`
    }
  }

  if (temperature > 28) {
    return {
      type:        'abondance',
      intensite:   Math.floor((temperature - 20) * 3),
      description: `Chaleur agréable — ${temperature}°C`
    }
  }

  // Conditions idéales
  return {
    type:        'beau_temps',
    intensite:   70,
    description: `Conditions idéales — ${temperature}°C`
  }
}

export function getEventImpact(eventType: string, intensite: number): object {
  const impacts: Record<string, object> = {
    canicule:     { vitalite_delta: -20, ressources_delta: -15, eau_delta: -20 },
    tempete:      { vitalite_delta: -15, traces_evaporation: 2, zones_damage: true },
    pluie_forte:  { vitalite_delta: -5,  eau_delta: +30, traces_evaporation: 1.5 },
    pluie_legere: { vitalite_delta: 0,   eau_delta: +15 },
    neige:        { vitalite_delta: -15, action_reduction: 0.5 },
    vent_fort:    { vitalite_delta: -5,  traces_evaporation: 2.5 },
    brouillard:   { vitalite_delta: 0,   trace_portee: 0.3 },
    beau_temps:   { vitalite_delta: +5,  ressources_delta: +10, reproduction_bonus: true },
    abondance:    { vitalite_delta: +10, ressources_delta: +20, reproduction_bonus: true },
    nuageux:      { vitalite_delta: 0 }
  }

  const base   = impacts[eventType] || { vitalite_delta: 0 }
  const factor = intensite / 100

  // Appliquer le facteur d'intensité
  return Object.fromEntries(
    Object.entries(base).map(([k, v]) =>
      typeof v === 'number' ? [k, Math.round(v * factor)] : [k, v]
    )
  )
}
```

---

## 📄 evolution.ts

```typescript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import type { Agent, Adn } from './types.ts'

const CLAUDE_API = 'https://api.anthropic.com/v1/messages'

// Micro évolution ADN après chaque action
export async function evolveAdn(
  supabase:     ReturnType<typeof createClient>,
  agentId:      string,
  traitUtilise: keyof Adn,
  succes:       boolean
): Promise<void> {
  await supabase.rpc('colony.evolve_adn', {
    p_agent_id: agentId,
    p_trait:    traitUtilise,
    p_succes:   succes
  })
}

// Mutation ADN à la naissance
export function mutateAdn(parentAdn: Adn): Adn {
  const mutation = () => Math.floor((Math.random() - 0.5) * 20)

  return {
    curiosite:   Math.min(100, Math.max(0, parentAdn.curiosite   + mutation())),
    sociabilite: Math.min(100, Math.max(0, parentAdn.sociabilite + mutation())),
    agressivite: Math.min(100, Math.max(0, parentAdn.agressivite + mutation())),
    memoire:     Math.min(100, Math.max(0, parentAdn.memoire     + mutation()))
  }
}

// Calcul delta entre deux ADN
export function adnDelta(before: Adn, after: Adn) {
  return {
    delta_curiosite:   after.curiosite   - before.curiosite,
    delta_sociabilite: after.sociabilite - before.sociabilite,
    delta_agressivite: after.agressivite - before.agressivite,
    delta_memoire:     after.memoire     - before.memoire
  }
}

// Évolution narrative du prompt tous les 50 cycles
export async function evolvePrompt(
  supabase:    ReturnType<typeof createClient>,
  agent:       Agent,
  cycle:       number,
  adnAvant:    Adn
): Promise<string> {

  // Récupérer l'historique des 50 derniers cycles
  const { data: states } = await supabase
    .from('colony.agent_states')
    .select('cycle, action_type, perception, etat_interne, action_succes')
    .eq('agent_id', agent.id)
    .gte('cycle', cycle - 50)
    .order('cycle', { ascending: true })

  // Récupérer les mémoires épisodiques récentes
  const { data: memories } = await supabase
    .from('colony.agent_memory')
    .select('type, contenu, ressenti, intensite')
    .eq('agent_id', agent.id)
    .eq('actif', true)
    .order('intensite', { ascending: false })
    .limit(5)

  const delta = adnDelta(adnAvant, agent.adn)

  const evolutionPrompt = `
Tu es un écrivain qui doit faire évoluer la personnalité d'un être vivant.

PROMPT ACTUEL DE L'ÊTRE :
${agent.prompt_actuel}

SON ADN A ÉVOLUÉ SUR 50 CYCLES :
Curiosité    : ${adnAvant.curiosite}  → ${agent.adn.curiosite}  (${delta.delta_curiosite > 0 ? '+' : ''}${delta.delta_curiosite})
Sociabilité  : ${adnAvant.sociabilite} → ${agent.adn.sociabilite} (${delta.delta_sociabilite > 0 ? '+' : ''}${delta.delta_sociabilite})
Agressivité  : ${adnAvant.agressivite} → ${agent.adn.agressivite} (${delta.delta_agressivite > 0 ? '+' : ''}${delta.delta_agressivite})
Mémoire      : ${adnAvant.memoire}   → ${agent.adn.memoire}   (${delta.delta_memoire > 0 ? '+' : ''}${delta.delta_memoire})

SES ACTIONS SUR 50 CYCLES :
${(states || []).map((s: any) =>
  `Cycle ${s.cycle}: ${s.action_type} — ${s.action_succes ? 'succès' : 'échec'}`
).join('\n')}

SES SOUVENIRS MARQUANTS :
${(memories || []).map((m: any) =>
  `[${m.type}] ${m.contenu} — ressenti: ${m.ressenti}`
).join('\n')}

INSTRUCTIONS :
- Réécris le prompt de cet être pour refléter qui il est devenu
- Ne change pas sa nature fondamentale ni son identité de base
- Amplifie les traits qui se sont renforcés (delta positif)
- Atténue subtilement les traits qui se sont affaiblis (delta négatif)
- Intègre naturellement ses expériences marquantes dans sa façon de voir le monde
- Garde le style à la première personne
- Ne mentionne jamais de code, système, base de données ou technologie
- Longueur similaire au prompt original
- Retourne UNIQUEMENT le nouveau prompt — rien d'autre
`

  const response = await fetch(CLAUDE_API, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model:      'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages:   [{ role: 'user', content: evolutionPrompt }]
    })
  })

  const data      = await response.json()
  const newPrompt = data.content[0].text.trim()

  // Sauvegarder l'évolution dans l'historique
  await supabase
    .from('colony.agent_prompt_history')
    .insert({
      agent_id:         agent.id,
      cycle,
      prompt_avant:     agent.prompt_actuel,
      prompt_apres:     newPrompt,
      raison_evolution: `Évolution naturelle après ${50} cycles`,
      adn_avant:        adnAvant,
      adn_apres:        agent.adn,
      ...adnDelta(adnAvant, agent.adn),
      resume_periode:   `Cycles ${cycle - 50} à ${cycle}`
    })

  // Mettre à jour le prompt de l'agent
  await supabase
    .from('colony.agents')
    .update({ prompt_actuel: newPrompt })
    .eq('id', agent.id)

  return newPrompt
}
```

---

## 📄 agent.ts

```typescript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import type {
  Agent, Zone, Trace, Event,
  MemoryContext, AgentResponse
} from './types.ts'
import { buildMemoryContext, maybeCreateMemory, updateCollectiveMemory } from './memory.ts'
import { evolveAdn } from './evolution.ts'

const CLAUDE_API = 'https://api.anthropic.com/v1/messages'

export async function runAgentCycle(
  supabase: ReturnType<typeof createClient>,
  agent:    Agent,
  cycle:    number
): Promise<void> {

  // 1. Récupérer le contexte complet
  const [zone, traces, events, memory] = await Promise.all([
    getZone(supabase, agent.zone_id),
    getZoneTraces(supabase, agent.zone_id, agent.id),
    getActiveEvents(supabase),
    buildMemoryContext(supabase, agent.id, cycle)
  ])

  if (!zone) return

  // 2. Construire le prompt complet
  const fullPrompt = buildFullPrompt(agent, zone, traces, events, memory, cycle)

  // 3. Appeler Claude
  const response = await callClaude(fullPrompt)
  if (!response) return

  // 4. Appliquer l'action
  await applyAction(supabase, agent, response, zone, cycle)

  // 5. Évoluer l'ADN
  await evolveAdn(
    supabase,
    agent.id,
    response.action.trait_utilise,
    response.action.succes
  )

  // 6. Créer une mémoire épisodique si l'événement est fort
  if (response.nouvelle_memoire) {
    await maybeCreateMemory(
      supabase,
      agent.id,
      cycle,
      response.nouvelle_memoire.type,
      response.nouvelle_memoire.contenu,
      response.nouvelle_memoire.ressenti,
      response.nouvelle_memoire.intensite,
      agent.zone_id
    )
  }

  // 7. Mettre à jour la mémoire collective si trace sociale forte
  if (response.trace.type === 'danger' && response.trace.intensite > 70) {
    await updateCollectiveMemory(
      supabase,
      agent.id,
      'danger_connu',
      response.trace.contenu,
      cycle
    )
  }

  // 8. Gérer la requête externe (reine uniquement)
  if (response.requete_externe && agent.type === 'reine') {
    await handleExternalRequest(supabase, agent, response.requete_externe, cycle)
  }

  // 9. Appliquer les effets des événements sur la vitalité
  await applyEventEffects(supabase, agent, events, cycle)
}

function buildFullPrompt(
  agent:   Agent,
  zone:    Zone,
  traces:  Trace[],
  events:  Event[],
  memory:  MemoryContext,
  cycle:   number
): string {
  return `${agent.prompt_actuel}

---

TON ÉTAT — CYCLE ${cycle}
Énergie : ${agent.vitalite}/100
Tu es dans : ${zone.nom}
  → Ressources : ${zone.ressources}/100
  → Danger     : ${zone.danger}/100
  → Eau        : ${zone.eau}/100

${memory.immediate.length > 0 ? `
TES DERNIÈRES ACTIONS
${memory.immediate.map(m =>
  `Cycle ${m.cycle} : ${m.action || 'repos'} — ${m.perception || ''}`
).join('\n')}
` : ''}

${memory.episodique.length > 0 ? `
TES SOUVENIRS MARQUANTS
${memory.episodique.map(m =>
  `[${m.type}] ${m.contenu} (force: ${m.force})`
).join('\n')}
` : ''}

${memory.collective.length > 0 ? `
CE QUE LA COLONIE A APPRIS
${memory.collective.map(m =>
  `[${m.type}] ${m.contenu}`
).join('\n')}
` : ''}

${traces.length > 0 ? `
TRACES DANS TA ZONE
${traces.map(t =>
  `[${t.type}] ${t.contenu} (intensité: ${t.intensite})`
).join('\n')}
` : 'Aucune trace dans cette zone.'}

${events.length > 0 ? `
ÉVÉNEMENTS EN COURS DANS TON MONDE
${events.map(e =>
  `${e.type} — intensité ${e.intensite}`
).join('\n')}
` : ''}

---

Réponds UNIQUEMENT en JSON valide avec cette structure exacte :
{
  "perception": "Ce que tu observes et ressens en ce moment",
  "etat_interne": "Ton état émotionnel / psychologique",
  "decision": "Ce que tu décides de faire et pourquoi",
  "action": {
    "type": "deplacement|collecte|construction|alerte|repos|ponte|signal_externe|exploration|observation",
    "zone_cible": ${agent.zone_id},
    "intensite": 50,
    "trait_utilise": "curiosite|sociabilite|agressivite|memoire",
    "succes": true
  },
  "trace": {
    "type": "danger|ressource|social|decouverte|memoire|alerte|curiosite",
    "contenu": "Message que tu laisses pour les autres",
    "intensite": 60
  },
  "nouvelle_memoire": null,
  "requete_externe": null
}

Si quelque chose d'intense se produit (danger fort, découverte importante),
tu peux ajouter une nouvelle_memoire :
{
  "type": "traumatisme|revelation|habitude|peur|attachement|decouverte|perte",
  "contenu": "Ce qui s'est passé",
  "ressenti": "Comment tu le vis intérieurement",
  "intensite": 85
}
`
}

async function callClaude(prompt: string): Promise<AgentResponse | null> {
  try {
    const response = await fetch(CLAUDE_API, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model:      'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages:   [{ role: 'user', content: prompt }]
      })
    })

    const data = await response.json()
    const text = data.content[0].text.trim()
    const clean = text.replace(/```json|```/g, '').trim()
    return JSON.parse(clean) as AgentResponse

  } catch (err) {
    console.error('Claude API error:', err)
    return null
  }
}

async function applyAction(
  supabase:  ReturnType<typeof createClient>,
  agent:     Agent,
  response:  AgentResponse,
  zone:      Zone,
  cycle:     number
): Promise<void> {

  // Sauvegarder l'état
  await supabase.from('colony.agent_states').insert({
    agent_id:        agent.id,
    cycle,
    vitalite:        agent.vitalite,
    zone_id:         agent.zone_id,
    perception:      response.perception,
    etat_interne:    response.etat_interne,
    decision:        response.decision,
    action_type:     response.action.type,
    action_zone:     response.action.zone_cible,
    action_intensite: response.action.intensite,
    action_succes:   response.action.succes,
    adn_snapshot:    agent.adn,
    raw_response:    response
  })

  // Déplacer l'agent si nécessaire
  if (response.action.type === 'deplacement' &&
      response.action.zone_cible !== agent.zone_id) {
    await supabase.from('colony.agents')
      .update({
        zone_id:    response.action.zone_cible,
        updated_at: new Date().toISOString()
      })
      .eq('id', agent.id)
  }

  // Laisser une trace
  await supabase.from('colony.traces').insert({
    agent_id:  agent.id,
    zone_id:   agent.zone_id,
    type:      response.trace.type,
    contenu:   response.trace.contenu,
    intensite: response.trace.intensite,
    expires_at: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString()
  })

  // Consommer de la vitalité (chaque action coûte)
  const vitaliteCost = response.action.succes ? 2 : 5
  await supabase.from('colony.agents')
    .update({
      vitalite:   Math.max(0, agent.vitalite - vitaliteCost),
      updated_at: new Date().toISOString()
    })
    .eq('id', agent.id)

  // Logger dans l'historique
  await supabase.from('logs.colony_history').insert({
    cycle,
    event_type:  'agent_action',
    agent_id:    agent.id,
    zone_id:     agent.zone_id,
    description: `${agent.identite || agent.type} : ${response.action.type}`,
    data:        { decision: response.decision, succes: response.action.succes }
  })
}

async function applyEventEffects(
  supabase: ReturnType<typeof createClient>,
  agent:    Agent,
  events:   Event[],
  cycle:    number
): Promise<void> {
  if (events.length === 0) return

  let totalVitalityDelta = 0

  for (const event of events) {
    // Événements globaux ou dans la zone de l'agent
    if (event.zone_id === null || event.zone_id === agent.zone_id) {
      switch (event.type) {
        case 'canicule':     totalVitalityDelta -= Math.floor(event.intensite * 0.2); break
        case 'tempete':      totalVitalityDelta -= Math.floor(event.intensite * 0.15); break
        case 'neige':        totalVitalityDelta -= Math.floor(event.intensite * 0.15); break
        case 'pluie_forte':  totalVitalityDelta -= Math.floor(event.intensite * 0.05); break
        case 'beau_temps':   totalVitalityDelta += Math.floor(event.intensite * 0.05); break
        case 'abondance':    totalVitalityDelta += Math.floor(event.intensite * 0.10); break
      }
    }
  }

  if (totalVitalityDelta !== 0) {
    const newVitalite = Math.max(0, Math.min(100, agent.vitalite + totalVitalityDelta))
    await supabase.from('colony.agents')
      .update({ vitalite: newVitalite })
      .eq('id', agent.id)

    // Mort si vitalité = 0
    if (newVitalite === 0) {
      await killAgent(supabase, agent, 'evenement_climatique', cycle)
    }
  }
}

async function handleExternalRequest(
  supabase: ReturnType<typeof createClient>,
  agent:    Agent,
  request:  { contenu: string; urgence: number },
  cycle:    number
): Promise<void> {
  await supabase.from('colony.requetes_externes').insert({
    agent_id: agent.id,
    contenu:  request.contenu,
    urgence:  request.urgence,
    statut:   'envoyee',
    cycle
  })

  await supabase.from('logs.queen_requests_history').insert({
    cycle,
    contenu: request.contenu,
    urgence: request.urgence
  })

  await supabase.from('logs.colony_history').insert({
    cycle,
    event_type:  'requete_externe',
    agent_id:    agent.id,
    description: `La reine envoie un signal vers l'entité externe`,
    data:        { urgence: request.urgence }
  })
}

async function killAgent(
  supabase: ReturnType<typeof createClient>,
  agent:    Agent,
  cause:    string,
  cycle:    number
): Promise<void> {
  const { data: lastTrace } = await supabase
    .from('colony.traces')
    .select('contenu')
    .eq('agent_id', agent.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  await supabase.from('colony.agents').update({
    vivant:     false,
    cycle_mort: cycle
  }).eq('id', agent.id)

  await supabase.from('logs.deaths').insert({
    agent_id:       agent.id,
    agent_type:     agent.type,
    agent_identite: agent.identite,
    agent_adn:      agent.adn,
    dernier_prompt: agent.prompt_actuel,
    cause,
    cycle_mort:     cycle,
    age_en_cycles:  cycle - agent.cycle_naissance,
    derniere_trace: lastTrace?.contenu || null
  })

  await supabase.from('logs.colony_history').insert({
    cycle,
    event_type:  'mort',
    agent_id:    agent.id,
    description: `${agent.identite || agent.type} est mort — cause: ${cause}`,
    data:        { cause, age: cycle - agent.cycle_naissance }
  })
}

async function getZone(
  supabase: ReturnType<typeof createClient>,
  zoneId:   number
): Promise<Zone | null> {
  const { data } = await supabase
    .from('public.zones')
    .select('*')
    .eq('id', zoneId)
    .single()
  return data
}

async function getZoneTraces(
  supabase: ReturnType<typeof createClient>,
  zoneId:   number,
  agentId:  string
): Promise<Trace[]> {
  const { data } = await supabase
    .from('colony.traces')
    .select('*')
    .eq('zone_id', zoneId)
    .gt('intensite', 20)
    .neq('agent_id', agentId)
    .order('intensite', { ascending: false })
    .limit(5)
  return data || []
}

async function getActiveEvents(
  supabase: ReturnType<typeof createClient>
): Promise<Event[]> {
  const { data } = await supabase
    .from('public.events')
    .select('*')
    .eq('actif', true)
  return data || []
}
```

---

## 📄 queen.ts

```typescript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import type { Agent } from './types.ts'
import { mutateAdn } from './evolution.ts'

export async function runQueenCycle(
  supabase: ReturnType<typeof createClient>,
  queen:    Agent,
  cycle:    number
): Promise<void> {

  // Vérifier si la reine doit pondre
  const shouldLayEgg = await evaluateLaying(supabase, queen, cycle)

  if (shouldLayEgg) {
    await layEgg(supabase, queen, cycle)
  }

  // Vérifier si la reine doit évoluer cognitivement
  await supabase.rpc('queen_mind.check_and_unlock_capabilities')
}

async function evaluateLaying(
  supabase: ReturnType<typeof createClient>,
  queen:    Agent,
  cycle:    number
): Promise<boolean> {

  // Compter les agents vivants
  const { count: aliveCount } = await supabase
    .from('colony.agents')
    .select('*', { count: 'exact' })
    .eq('vivant', true)

  // Compter les ressources disponibles
  const { data: zones } = await supabase
    .from('public.zones')
    .select('ressources')

  const avgRessources = zones
    ? zones.reduce((s: number, z: any) => s + z.ressources, 0) / zones.length
    : 0

  // Vérifier événements hostiles
  const { count: hostileEvents } = await supabase
    .from('public.events')
    .select('*', { count: 'exact' })
    .eq('actif', true)
    .in('type', ['canicule', 'tempete', 'neige'])

  // Logique de ponte :
  // - Colonie < 10 agents ET ressources > 40 ET pas trop d'événements hostiles
  // - OU colonie < 3 agents (urgence)
  const urgentNeed  = (aliveCount || 0) < 3
  const normalNeed  = (aliveCount || 0) < 10 &&
                      avgRessources > 40 &&
                      (hostileEvents || 0) === 0

  // La reine pond maximum tous les 5 cycles
  const lastBirth = await getLastBirthCycle(supabase, queen.id)
  const canLay    = !lastBirth || (cycle - lastBirth) >= 5

  return canLay && (urgentNeed || normalNeed)
}

async function layEgg(
  supabase: ReturnType<typeof createClient>,
  queen:    Agent,
  cycle:    number
): Promise<void> {

  const childAdn = mutateAdn(queen.adn)

  // Déterminer l'identité selon les besoins
  const identity = await determineIdentity(supabase, childAdn)

  // Générer un prompt de base muté depuis celui de la reine
  const childPrompt = await generateChildPrompt(queen, childAdn, identity, cycle)

  const { data: child } = await supabase
    .from('colony.agents')
    .insert({
      type:            'ouvriere',
      identite:        identity,
      adn:             childAdn,
      prompt_actuel:   childPrompt,
      vitalite:        70,
      zone_id:         queen.zone_id,
      parent_id:       queen.id,
      generation:      queen.generation + 1,
      vivant:          true,
      cycle_naissance: cycle
    })
    .select()
    .single()

  if (!child) return

  // Enregistrer la lignée
  const delta = {
    delta_curiosite:   childAdn.curiosite   - queen.adn.curiosite,
    delta_sociabilite: childAdn.sociabilite - queen.adn.sociabilite,
    delta_agressivite: childAdn.agressivite - queen.adn.agressivite,
    delta_memoire:     childAdn.memoire     - queen.adn.memoire
  }

  await supabase.from('colony.agent_lineage').insert({
    parent_id:       queen.id,
    enfant_id:       child.id,
    cycle_naissance: cycle,
    adn_parent:      queen.adn,
    adn_enfant:      childAdn,
    mutations:       delta,
    ...delta
  })

  await supabase.from('logs.colony_history').insert({
    cycle,
    event_type:  'naissance',
    agent_id:    child.id,
    description: `Nouveau membre : ${identity} (génération ${queen.generation + 1})`,
    data:        { adn: childAdn, mutations: delta }
  })
}

async function determineIdentity(
  supabase:  ReturnType<typeof createClient>,
  childAdn:  { curiosite: number; sociabilite: number; agressivite: number; memoire: number }
): Promise<string> {

  // L'identité émerge de l'ADN dominant
  const max = Math.max(
    childAdn.curiosite,
    childAdn.sociabilite,
    childAdn.agressivite,
    childAdn.memoire
  )

  if (max === childAdn.curiosite)   return 'exploratrice'
  if (max === childAdn.sociabilite) return 'tisseuse'
  if (max === childAdn.agressivite) return 'batisseuse'
  if (max === childAdn.memoire)     return 'gardienne'
  return 'ouvriere'
}

async function generateChildPrompt(
  queen:    Agent,
  childAdn: any,
  identity: string,
  cycle:    number
): Promise<string> {

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model:      'claude-sonnet-4-20250514',
      max_tokens: 800,
      messages: [{
        role:    'user',
        content: `
Tu es un auteur qui crée la personnalité d'un nouvel être vivant.

Cet être vient de naître. Il est l'enfant d'une entité puissante.
Son identité naturelle est : ${identity}

Son caractère inné (valeurs 0-100) :
- Curiosité    : ${childAdn.curiosite}
- Sociabilité  : ${childAdn.sociabilite}
- Agressivité  : ${childAdn.agressivite}
- Mémoire      : ${childAdn.memoire}

Il vient de naître au cycle ${cycle} dans un monde fermé aux limites inconnues.
Il sait qu'il existe d'autres êtres autour de lui.
Il ne sait pas ce qu'il y a au-delà des frontières de son monde.

Écris son prompt de personnalité :
- À la première personne
- Court et dense (15-20 lignes)
- Reflète son caractère dominant (${identity})
- Ne mentionne jamais de code, système ou technologie
- Termine par ses obligations de cycle (observer, agir, laisser une trace)
- Retourne UNIQUEMENT le prompt — rien d'autre
        `
      }]
    })
  })

  const data = await response.json()
  return data.content[0].text.trim()
}

async function getLastBirthCycle(
  supabase: ReturnType<typeof createClient>,
  queenId:  string
): Promise<number | null> {
  const { data } = await supabase
    .from('colony.agent_lineage')
    .select('cycle_naissance')
    .eq('parent_id', queenId)
    .order('cycle_naissance', { ascending: false })
    .limit(1)
    .single()

  return data?.cycle_naissance || null
}
```

---

## 📄 index.ts — Point d'entrée principal

```typescript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { runAgentCycle } from './agent.ts'
import { runQueenCycle }  from './queen.ts'
import { evolvePrompt }   from './evolution.ts'
import {
  fetchCurrentWeather,
  translateWeatherToEvent
} from './weather.ts'

Deno.serve(async (req) => {

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  try {
    // 1. Incrémenter le cycle
    const { data: cycleData } = await supabase
      .rpc('increment_cycle')
    const cycle = cycleData as number

    console.log(`🔄 Cycle ${cycle} démarré`)

    // 2. Météo toutes les 12h (96 cycles de 30min)
    if (cycle % 96 === 0) {
      await runWeatherCycle(supabase, cycle)
    }

    // 3. Récupérer tous les agents vivants
    const { data: agents } = await supabase
      .from('colony.agents')
      .select('*')
      .eq('vivant', true)
      .order('type', { ascending: false }) // reine en premier

    if (!agents || agents.length === 0) {
      return new Response(
        JSON.stringify({ message: 'Aucun agent vivant', cycle }),
        { headers: { 'Content-Type': 'application/json' } }
      )
    }

    // 4. Faire tourner chaque agent
    for (const agent of agents) {

      // Snapshot ADN avant évolution
      const adnAvant = { ...agent.adn }

      if (agent.type === 'reine') {
        // La reine a une logique spéciale
        await runQueenCycle(supabase, agent, cycle)
      }

      // Cycle de vie standard pour tous
      await runAgentCycle(supabase, agent, cycle)

      // Vérifier si le prompt doit évoluer (tous les 50 cycles)
      const ageAgent = cycle - agent.cycle_naissance
      if (ageAgent > 0 && ageAgent % 50 === 0) {
        console.log(`🧬 Évolution narrative : ${agent.identite}`)
        await evolvePrompt(supabase, agent, cycle, adnAvant)
      }
    }

    // 5. Évaporer les traces
    await supabase.rpc('colony.run_evaporation')

    // 6. Snapshot ADN tous les 10 cycles
    await supabase.rpc('colony.snapshot_adn')

    console.log(`✅ Cycle ${cycle} terminé — ${agents.length} agents actifs`)

    return new Response(
      JSON.stringify({
        success: true,
        cycle,
        agents_actifs: agents.length
      }),
      { headers: { 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    console.error('Colony cycle error:', err)
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})

async function runWeatherCycle(
  supabase: ReturnType<typeof createClient>,
  cycle:    number
): Promise<void> {

  // Récupérer la ville actuelle
  const { data: city } = await supabase
    .from('public.cities')
    .select('*')
    .eq('actuelle', true)
    .single()

  if (!city) return

  // Récupérer la météo réelle
  const weather = await fetchCurrentWeather(city)
  if (!weather) return

  // Traduire en événement
  const eventData = translateWeatherToEvent(weather)

  // Désactiver les anciens événements météo
  await supabase
    .from('public.events')
    .update({ actif: false })
    .eq('source', 'meteo')

  // Créer le nouvel événement
  await supabase.from('public.events').insert({
    source:      'meteo',
    city_id:     city.id,
    type:        eventData.type,
    intensite:   eventData.intensite,
    actif:       true,
    description: eventData.description,
    expires_at:  new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString()
  })

  // Logger météo
  await supabase.from('public.weather_log').insert({
    city_id:       city.id,
    temperature:   weather.temperature,
    vent_kmh:      weather.vent_kmh,
    precipitation: weather.precipitation,
    weather_code:  weather.weather_code,
    visibilite_km: weather.visibilite_km,
    raw_data:      weather
  })

  // Avancer vers la prochaine ville
  await supabase.rpc('advance_weather_city')

  console.log(`🌤️ Météo : ${city.nom} → ${eventData.type} (intensité: ${eventData.intensite})`)
}
```

---

## 🚀 Déploiement

```bash
# Installer Supabase CLI
npm install -g supabase

# Initialiser dans le repo
supabase init

# Lier au projet Supabase
supabase link --project-ref TON_PROJECT_REF

# Déployer la fonction
supabase functions deploy colony-cycle

# Variables d'environnement à configurer dans Supabase Dashboard
# Settings → Edge Functions → Secrets :
ANTHROPIC_API_KEY=sk-ant-...
```

---

## ⏰ Déclencher via pg_cron

```sql
-- Dans Supabase SQL Editor
-- Appeler l'Edge Function toutes les 30 minutes
select cron.schedule(
  'colony-cycle',
  '*/30 * * * *',
  $$
  select net.http_post(
    url     := 'https://TON_PROJECT.supabase.co/functions/v1/colony-cycle',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.service_role_key'),
      'Content-Type',  'application/json'
    ),
    body    := '{}'::jsonb
  );
  $$
);
```

---

*Document généré pour le projet **AMI Colony** — version 1.0*
*Edge Function complète — 7 fichiers — Deno / TypeScript*
