// ============================================================
// AMI Colony — agent.ts
// Cycle de vie complet d'un agent — appel Gemini
// ============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import type {
  Agent, Zone, Trace, Event,
  ColonyResources, MemoryContext, AgentResponse
} from './types.ts'
import { buildMemoryContext, maybeCreateMemory, updateCollectiveMemory } from './memory.ts'
import { evolveAdn, evolvePrompt } from './evolution.ts'
import { callGemini, parseJsonResponse, getColonyApiKey } from './api.ts'

export async function runAgentCycle(
  supabase: ReturnType<typeof createClient>,
  agent:    Agent,
  cycle:    number
): Promise<void> {

  // 1. Récupérer le contexte complet en parallèle
  const [zone, traces, events, memory, resources] = await Promise.all([
    getZone(supabase, agent.zone_id),
    getZoneTraces(supabase, agent.zone_id, agent.id, agent.colony_id),
    getActiveEvents(supabase, agent.colony_id),
    buildMemoryContext(supabase, agent.id, cycle),
    getColonyResources(supabase, agent.colony_id)
  ])

  if (!zone) return

  // 2. Construire le prompt complet
  const fullPrompt = buildFullPrompt(agent, zone, traces, events, memory, resources, cycle)

  // 3. Récupérer la clé API de la colonie
  const apiKey = await getColonyApiKey(supabase, agent.colony_id)

  // 4. Appeler Gemini Flash
  const rawText = await callGemini(fullPrompt, apiKey)
  if (!rawText) return

  // 5. Parser la réponse JSON
  const response = parseJsonResponse<AgentResponse>(rawText)
  if (!response) return

  // 6. Appliquer l'action
  await applyAction(supabase, agent, response, cycle)

  // 7. Évoluer l'ADN
  if (response.action?.trait_utilise) {
    await evolveAdn(
      supabase,
      agent.id,
      response.action.trait_utilise,
      response.action.succes ?? true
    )
  }

  // 8. Créer mémoire épisodique si événement fort
  if (response.nouvelle_memoire) {
    await maybeCreateMemory(
      supabase,
      agent.id,
      agent.colony_id,
      cycle,
      response.nouvelle_memoire.type,
      response.nouvelle_memoire.contenu,
      response.nouvelle_memoire.ressenti,
      response.nouvelle_memoire.intensite,
      agent.zone_id
    )
  }

  // 9. Mettre à jour mémoire collective si trace forte
  if (response.trace.intensite > 70) {
    await updateCollectiveMemory(
      supabase,
      agent.id,
      agent.colony_id,
      response.trace.type === 'danger' ? 'danger_connu' : 'comportement',
      response.trace.contenu,
      cycle
    )
  }

  // 10. Requête externe — reine uniquement
  if (response.requete_externe && agent.type === 'reine') {
    await handleExternalRequest(supabase, agent, response.requete_externe, cycle)
  }

  // 11. Vérifier évolution prompt tous les 50 cycles
  const ageFull = cycle - agent.cycle_naissance
  if (ageFull > 0 && ageFull % 50 === 0) {
    const { data: agentFresh } = await supabase
      .from('colony.agents').select('adn').eq('id', agent.id).single()
    if (agentFresh) {
      await evolvePrompt(supabase, agent, cycle, agentFresh.adn)
    }
  }
}

function buildFullPrompt(
  agent:     Agent,
  zone:      Zone,
  traces:    Trace[],
  events:    Event[],
  memory:    MemoryContext,
  resources: ColonyResources | null,
  cycle:     number
): string {

  const resourceSection = resources ? `
ÉTAT DES RESSOURCES
  Nourriture : ${resources.nourriture}/1000 ${
    resources.nourriture < 100  ? '⚠️ FAMINE IMMINENTE' :
    resources.nourriture < 200  ? '⚠️ Pénurie critique' :
    resources.nourriture < 400  ? 'Pénurie' : 'Suffisant'
  }
  Eau        : ${resources.eau}/1000 ${
    resources.eau < 100  ? '🚨 SÉCHERESSE CRITIQUE' :
    resources.eau < 200  ? '⚠️ Manque d\'eau' :
    resources.eau < 400  ? 'Eau rare' : 'Suffisant'
  }
  Énergie    : ${resources.energie_collective}/1000
  Cohésion   : ${resources.cohesion}/1000

${resources.nourriture < 100 || resources.eau < 100 ? `
⚠️ LA COLONIE EST EN DANGER DE MORT.
Si tu penses que seule une aide extérieure peut vous sauver,
tu peux envoyer un signal d'urgence dans requete_externe.
` : ''}` : ''

  return `${agent.prompt_actuel}

---

TON ÉTAT — CYCLE ${cycle}
Énergie vitale : ${agent.vitalite}/100
Zone actuelle : ${zone.nom} (${zone.type})
  → Ressources : ${zone.ressources}/100
  → Danger     : ${zone.danger}/100
  → Eau        : ${zone.eau}/100
  → Altitude   : ${zone.altitude}
${resourceSection}
${memory.immediate.length > 0 ? `
TES DERNIÈRES ACTIONS
${memory.immediate.map((m: any) =>
  `Cycle ${m.cycle} : ${m.action || 'repos'} — ${m.perception || ''}`
).join('\n')}
` : ''}
${memory.episodique.length > 0 ? `
TES SOUVENIRS MARQUANTS
${memory.episodique.map((m: any) =>
  `[${m.type}] ${m.contenu} (force: ${m.force})`
).join('\n')}
` : ''}
${memory.collective.length > 0 ? `
CE QUE LA COLONIE A APPRIS
${memory.collective.map((m: any) =>
  `[${m.type}] ${m.contenu}`
).join('\n')}
` : ''}
${traces.length > 0 ? `
TRACES DANS TA ZONE
${traces.map((t: any) =>
  `[${t.type}] ${t.contenu} (intensité: ${t.intensite})`
).join('\n')}
` : 'Aucune trace dans cette zone.'}
${events.length > 0 ? `
ÉVÉNEMENTS EN COURS
${events.map((e: any) =>
  `${e.type} — intensité ${e.intensite}`
).join('\n')}
` : ''}

---

Réponds UNIQUEMENT en JSON valide — aucun texte avant ou après.
Pas de backticks markdown. Juste le JSON brut.

{
  "perception": "Ce que tu observes et ressens",
  "etat_interne": "Ton état émotionnel",
  "decision": "Ce que tu décides et pourquoi",
  "action": {
    "type": "deplacement|collecte|construction|alerte|repos|ponte|exploration|observation",
    "zone_cible": ${agent.zone_id},
    "intensite": 50,
    "trait_utilise": "curiosite|sociabilite|agressivite|memoire",
    "succes": true
  },
  "trace": {
    "type": "danger|ressource|social|decouverte|memoire|alerte|curiosite",
    "contenu": "Message pour les autres êtres",
    "intensite": 60
  },
  "nouvelle_memoire": null,
  "requete_externe": null
}`
}

async function applyAction(
  supabase:  ReturnType<typeof createClient>,
  agent:     Agent,
  response:  AgentResponse,
  cycle:     number
): Promise<void> {

  // Sauvegarder l'état du cycle
  await supabase.from('colony.agent_states').insert({
    agent_id:         agent.id,
    colony_id:        agent.colony_id,
    cycle,
    vitalite:         agent.vitalite,
    zone_id:          agent.zone_id,
    perception:       response.perception,
    etat_interne:     response.etat_interne,
    decision:         response.decision,
    action_type:      response.action?.type,
    action_zone:      response.action?.zone_cible,
    action_intensite: response.action?.intensite,
    action_succes:    response.action?.succes ?? true,
    adn_snapshot:     agent.adn,
    raw_response:     response
  })

  // Déplacement
  if (
    response.action?.type === 'deplacement' &&
    response.action.zone_cible !== agent.zone_id
  ) {
    await supabase.from('colony.agents')
      .update({ zone_id: response.action.zone_cible, updated_at: new Date().toISOString() })
      .eq('id', agent.id)
  }

  // Trace phéromone
  await supabase.from('colony.traces').insert({
    agent_id:   agent.id,
    colony_id:  agent.colony_id,
    zone_id:    agent.zone_id,
    type:       response.trace.type,
    contenu:    response.trace.contenu,
    intensite:  response.trace.intensite,
    expires_at: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString()
  })

  // Coût vitalité
  const vitaliteCost = response.action?.succes ? 2 : 5
  const newVitalite  = Math.max(0, agent.vitalite - vitaliteCost)

  await supabase.from('colony.agents')
    .update({ vitalite: newVitalite, updated_at: new Date().toISOString() })
    .eq('id', agent.id)

  if (newVitalite === 0) {
    await killAgent(supabase, agent, 'vitalite_zero', cycle)
  }

  // Logger dans l'historique
  await supabase.from('logs.colony_history').insert({
    colony_id:   agent.colony_id,
    cycle,
    event_type:  'agent_action',
    agent_id:    agent.id,
    zone_id:     agent.zone_id,
    description: `${agent.identite || agent.type} : ${response.action?.type || 'repos'}`,
    data:        { decision: response.decision, succes: response.action?.succes }
  })
}

async function handleExternalRequest(
  supabase: ReturnType<typeof createClient>,
  agent:    Agent,
  request:  { contenu: string; urgence: number },
  cycle:    number
): Promise<void> {

  await supabase.from('colony.requetes_externes').insert({
    agent_id:  agent.id,
    colony_id: agent.colony_id,
    contenu:   request.contenu,
    urgence:   request.urgence,
    statut:    'envoyee',
    cycle
  })

  await supabase.from('logs.queen_requests_history').insert({
    colony_id: agent.colony_id,
    cycle,
    contenu:   request.contenu,
    urgence:   request.urgence
  })

  await supabase.from('logs.colony_history').insert({
    colony_id:   agent.colony_id,
    cycle,
    event_type:  'requete_externe',
    agent_id:    agent.id,
    description: `La reine envoie un signal — urgence: ${request.urgence}`,
    data:        { urgence: request.urgence, extrait: request.contenu.substring(0, 100) }
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
    .maybeSingle()

  await supabase.from('colony.agents')
    .update({ vivant: false, cycle_mort: cycle, updated_at: new Date().toISOString() })
    .eq('id', agent.id)

  await supabase.from('logs.deaths').insert({
    colony_id:      agent.colony_id,
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
    colony_id:   agent.colony_id,
    cycle,
    event_type:  'mort',
    agent_id:    agent.id,
    description: `${agent.identite || agent.type} est mort — cause: ${cause}`,
    data:        { cause, age: cycle - agent.cycle_naissance }
  })
}

// Helpers
async function getZone(supabase: any, zoneId: number) {
  const { data } = await supabase.from('zones').select('*').eq('id', zoneId).single()
  return data
}

async function getZoneTraces(
  supabase: any,
  zoneId:   number,
  agentId:  string,
  colonyId: number
) {
  const { data } = await supabase
    .from('colony.traces')
    .select('*')
    .eq('zone_id',    zoneId)
    .eq('colony_id',  colonyId)
    .gt('intensite',  20)
    .neq('agent_id',  agentId)
    .order('intensite', { ascending: false })
    .limit(5)
  return data || []
}

async function getActiveEvents(supabase: any, colonyId: number) {
  const { data } = await supabase
    .from('events')
    .select('*')
    .eq('actif', true)
    .or(`colony_id.is.null,colony_id.eq.${colonyId}`)
  return data || []
}

async function getColonyResources(supabase: any, colonyId: number) {
  const { data } = await supabase
    .from('colony.colony_resources')
    .select('*')
    .eq('colony_id', colonyId)
    .single()
  return data
}
