# ⚡ Modifications Gemini Flash — Edge Function
## Remplacement Claude API → Gemini 2.0 Flash

---

## 📄 api.ts — Module centralisé appels IA
*Nouveau fichier à créer*

```typescript
// supabase/functions/colony-cycle/api.ts

const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent'

// Récupère la clé API avec le moins d'utilisation aujourd'hui
export async function getBestApiKey(
  supabase: any
): Promise<string> {

  const { data } = await supabase
    .from('public.api_keys')
    .select('*')
    .eq('provider', 'gemini')
    .eq('actif', true)
    .order('used_today', { ascending: true })
    .limit(1)
    .single()

  if (!data) throw new Error('Aucune clé API disponible')

  // Incrémenter le compteur d'utilisation
  await supabase
    .from('public.api_keys')
    .update({ used_today: data.used_today + 1 })
    .eq('id', data.id)

  return data.key
}

// Appel Gemini Flash
export async function callGemini(
  prompt:  string,
  apiKey:  string,
  maxTokens: number = 1000
): Promise<string | null> {
  try {
    const response = await fetch(
      `${GEMINI_ENDPOINT}?key=${apiKey}`,
      {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }]
          }],
          generationConfig: {
            maxOutputTokens: maxTokens,
            temperature:     0.9,
            topP:            0.95,
          }
        })
      }
    )

    const data = await response.json()

    // Extraire le texte de la réponse Gemini
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text

    if (!text) {
      console.error('Gemini empty response:', JSON.stringify(data))
      return null
    }

    return text.trim()

  } catch (err) {
    console.error('Gemini API error:', err)
    return null
  }
}

// Parser JSON depuis réponse Gemini
// Gemini a tendance à ajouter des backticks markdown
export function parseJsonResponse<T>(text: string): T | null {
  try {
    const clean = text
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim()
    return JSON.parse(clean) as T
  } catch (err) {
    console.error('JSON parse error:', err)
    console.error('Raw text:', text)
    return null
  }
}

// Reset quotas à minuit
export async function resetDailyQuotas(supabase: any): Promise<void> {
  await supabase
    .from('public.api_keys')
    .update({ used_today: 0 })
    .eq('provider', 'gemini')
}
```

---

## 📄 agent.ts — Modifié pour Gemini

```typescript
// supabase/functions/colony-cycle/agent.ts

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import type {
  Agent, Zone, Trace, Event,
  MemoryContext, AgentResponse
} from './types.ts'
import { buildMemoryContext, maybeCreateMemory, updateCollectiveMemory } from './memory.ts'
import { evolveAdn } from './evolution.ts'
import { callGemini, parseJsonResponse, getBestApiKey } from './api.ts'

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

  // 2. Construire le prompt
  const fullPrompt = buildFullPrompt(agent, zone, traces, events, memory, cycle)

  // 3. Récupérer la meilleure clé API disponible
  const apiKey = await getBestApiKey(supabase)

  // 4. Appeler Gemini Flash
  const rawText = await callGemini(fullPrompt, apiKey)
  if (!rawText) return

  // 5. Parser la réponse JSON
  const response = parseJsonResponse<AgentResponse>(rawText)
  if (!response) return

  // 6. Appliquer l'action
  await applyAction(supabase, agent, response, zone, cycle)

  // 7. Évoluer l'ADN
  await evolveAdn(
    supabase,
    agent.id,
    response.action.trait_utilise,
    response.action.succes
  )

  // 8. Créer mémoire épisodique si événement fort
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

  // 9. Mettre à jour mémoire collective si trace forte
  if (response.trace.type === 'danger' && response.trace.intensite > 70) {
    await updateCollectiveMemory(
      supabase,
      agent.id,
      'danger_connu',
      response.trace.contenu,
      cycle
    )
  }

  // 10. Requête externe — reine uniquement
  if (response.requete_externe && agent.type === 'reine') {
    await handleExternalRequest(supabase, agent, response.requete_externe, cycle)
  }

  // 11. Effets événements sur vitalité
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
    "contenu": "Message pour les autres",
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
  zone:      Zone,
  cycle:     number
): Promise<void> {

  await supabase.from('colony.agent_states').insert({
    agent_id:         agent.id,
    cycle,
    vitalite:         agent.vitalite,
    zone_id:          agent.zone_id,
    perception:       response.perception,
    etat_interne:     response.etat_interne,
    decision:         response.decision,
    action_type:      response.action.type,
    action_zone:      response.action.zone_cible,
    action_intensite: response.action.intensite,
    action_succes:    response.action.succes,
    adn_snapshot:     agent.adn,
    raw_response:     response
  })

  if (
    response.action.type === 'deplacement' &&
    response.action.zone_cible !== agent.zone_id
  ) {
    await supabase.from('colony.agents')
      .update({ zone_id: response.action.zone_cible, updated_at: new Date().toISOString() })
      .eq('id', agent.id)
  }

  await supabase.from('colony.traces').insert({
    agent_id:   agent.id,
    zone_id:    agent.zone_id,
    type:       response.trace.type,
    contenu:    response.trace.contenu,
    intensite:  response.trace.intensite,
    expires_at: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString()
  })

  const vitaliteCost = response.action.succes ? 2 : 5
  const newVitalite  = Math.max(0, agent.vitalite - vitaliteCost)

  await supabase.from('colony.agents')
    .update({ vitalite: newVitalite, updated_at: new Date().toISOString() })
    .eq('id', agent.id)

  if (newVitalite === 0) {
    await killAgent(supabase, agent, 'vitalite_zero', cycle)
  }

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

  let delta = 0
  for (const event of events) {
    if (event.zone_id === null || event.zone_id === agent.zone_id) {
      switch (event.type) {
        case 'canicule':    delta -= Math.floor(event.intensite * 0.2);  break
        case 'tempete':     delta -= Math.floor(event.intensite * 0.15); break
        case 'neige':       delta -= Math.floor(event.intensite * 0.15); break
        case 'pluie_forte': delta -= Math.floor(event.intensite * 0.05); break
        case 'beau_temps':  delta += Math.floor(event.intensite * 0.05); break
        case 'abondance':   delta += Math.floor(event.intensite * 0.10); break
      }
    }
  }

  if (delta !== 0) {
    const newVitalite = Math.max(0, Math.min(100, agent.vitalite + delta))
    await supabase.from('colony.agents')
      .update({ vitalite: newVitalite })
      .eq('id', agent.id)

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
    description: 'La reine envoie un signal vers l\'entité externe',
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

  await supabase.from('colony.agents')
    .update({ vivant: false, cycle_mort: cycle })
    .eq('id', agent.id)

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

async function getZone(supabase: any, zoneId: number) {
  const { data } = await supabase.from('public.zones').select('*').eq('id', zoneId).single()
  return data
}

async function getZoneTraces(supabase: any, zoneId: number, agentId: string) {
  const { data } = await supabase
    .from('colony.traces').select('*')
    .eq('zone_id', zoneId).gt('intensite', 20).neq('agent_id', agentId)
    .order('intensite', { ascending: false }).limit(5)
  return data || []
}

async function getActiveEvents(supabase: any) {
  const { data } = await supabase.from('public.events').select('*').eq('actif', true)
  return data || []
}
```

---

## 📄 evolution.ts — Modifié pour Gemini

```typescript
// supabase/functions/colony-cycle/evolution.ts

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import type { Agent, Adn } from './types.ts'
import { callGemini, parseJsonResponse, getBestApiKey } from './api.ts'

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

export function mutateAdn(parentAdn: Adn): Adn {
  const mutation = () => Math.floor((Math.random() - 0.5) * 20)
  return {
    curiosite:   Math.min(100, Math.max(0, parentAdn.curiosite   + mutation())),
    sociabilite: Math.min(100, Math.max(0, parentAdn.sociabilite + mutation())),
    agressivite: Math.min(100, Math.max(0, parentAdn.agressivite + mutation())),
    memoire:     Math.min(100, Math.max(0, parentAdn.memoire     + mutation()))
  }
}

export function adnDelta(before: Adn, after: Adn) {
  return {
    delta_curiosite:   after.curiosite   - before.curiosite,
    delta_sociabilite: after.sociabilite - before.sociabilite,
    delta_agressivite: after.agressivite - before.agressivite,
    delta_memoire:     after.memoire     - before.memoire
  }
}

export async function evolvePrompt(
  supabase:  ReturnType<typeof createClient>,
  agent:     Agent,
  cycle:     number,
  adnAvant:  Adn
): Promise<string> {

  const { data: states } = await supabase
    .from('colony.agent_states')
    .select('cycle, action_type, perception, etat_interne, action_succes')
    .eq('agent_id', agent.id)
    .gte('cycle', cycle - 50)
    .order('cycle', { ascending: true })

  const { data: memories } = await supabase
    .from('colony.agent_memory')
    .select('type, contenu, ressenti, intensite')
    .eq('agent_id', agent.id)
    .eq('actif', true)
    .order('intensite', { ascending: false })
    .limit(5)

  const delta = adnDelta(adnAvant, agent.adn)

  const prompt = `Tu es un auteur qui fait évoluer la personnalité d'un être vivant.

PROMPT ACTUEL :
${agent.prompt_actuel}

ÉVOLUTION ADN SUR 50 CYCLES :
Curiosité    : ${adnAvant.curiosite} → ${agent.adn.curiosite} (${delta.delta_curiosite > 0 ? '+' : ''}${delta.delta_curiosite})
Sociabilité  : ${adnAvant.sociabilite} → ${agent.adn.sociabilite} (${delta.delta_sociabilite > 0 ? '+' : ''}${delta.delta_sociabilite})
Agressivité  : ${adnAvant.agressivite} → ${agent.adn.agressivite} (${delta.delta_agressivite > 0 ? '+' : ''}${delta.delta_agressivite})
Mémoire      : ${adnAvant.memoire} → ${agent.adn.memoire} (${delta.delta_memoire > 0 ? '+' : ''}${delta.delta_memoire})

ACTIONS SUR 50 CYCLES :
${(states || []).map((s: any) =>
  `Cycle ${s.cycle}: ${s.action_type} — ${s.action_succes ? 'succès' : 'échec'}`
).join('\n')}

SOUVENIRS MARQUANTS :
${(memories || []).map((m: any) =>
  `[${m.type}] ${m.contenu} — ressenti: ${m.ressenti}`
).join('\n')}

INSTRUCTIONS :
- Réécris le prompt pour refléter qui cet être est devenu
- Garde la première personne
- Ne mentionne jamais code, système ou technologie
- Amplifie les traits renforcés, atténue les affaiblis
- Intègre les souvenirs marquants naturellement
- Longueur similaire au prompt original
- Retourne UNIQUEMENT le nouveau prompt — aucun texte avant ou après`

  const apiKey   = await getBestApiKey(supabase)
  const newPrompt = await callGemini(prompt, apiKey, 800)

  if (!newPrompt) return agent.prompt_actuel

  await supabase.from('colony.agent_prompt_history').insert({
    agent_id:         agent.id,
    cycle,
    prompt_avant:     agent.prompt_actuel,
    prompt_apres:     newPrompt,
    raison_evolution: `Évolution naturelle après 50 cycles`,
    adn_avant:        adnAvant,
    adn_apres:        agent.adn,
    ...adnDelta(adnAvant, agent.adn),
    resume_periode:   `Cycles ${cycle - 50} à ${cycle}`
  })

  await supabase.from('colony.agents')
    .update({ prompt_actuel: newPrompt })
    .eq('id', agent.id)

  return newPrompt
}
```

---

## 📄 queen.ts — Modifié pour Gemini

```typescript
// Seule la fonction generateChildPrompt change

async function generateChildPrompt(
  queen:    Agent,
  childAdn: any,
  identity: string,
  cycle:    number,
  supabase: any
): Promise<string> {

  const prompt = `Tu es un auteur qui crée la personnalité d'un nouvel être vivant.

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
- Ne mentionne jamais code, système ou technologie
- Termine par ses obligations de cycle
- Retourne UNIQUEMENT le prompt — aucun texte avant ou après`

  const apiKey = await getBestApiKey(supabase)
  const result = await callGemini(prompt, apiKey, 600)
  return result || `Je suis un être nouveau. Je vis. J'observe. J'agis.`
}
```

---

## 🗄️ Table SQL à ajouter dans Supabase

```sql
-- Dans public schema
create table public.api_keys (
  id          serial primary key,
  provider    text not null check (provider in ('gemini', 'claude')),
  label       text,
  key         text not null,
  quota_day   integer default 1500,
  used_today  integer default 0,
  actif       boolean default true,
  created_at  timestamptz default now()
);

-- Reset quotas à minuit
select cron.schedule(
  'reset-api-quotas',
  '0 0 * * *',
  $$ update public.api_keys set used_today = 0 $$
);
```

---

## 🔑 Insérer ta clé Gemini

```sql
insert into public.api_keys (provider, label, key, quota_day)
values ('gemini', 'clé principale', 'TON_API_KEY_GEMINI', 1500);
```

Pour ajouter une deuxième clé plus tard :
```sql
insert into public.api_keys (provider, label, key, quota_day)
values ('gemini', 'clé secondaire', 'DEUXIEME_KEY', 1500);
```

Le système bascule automatiquement sur la moins utilisée.

---

## 📊 Quota estimé

| Agents | Cycles/jour | Appels/jour | Clés nécessaires |
|--------|-------------|-------------|------------------|
| 4      | 48          | 192         | 1 ✅ |
| 10     | 48          | 480         | 1 ✅ |
| 20     | 48          | 960         | 1 ✅ |
| 35     | 48          | 1680        | 2 ✅ |
| 50     | 48          | 2400        | 2 ✅ |
| 100    | 48          | 4800        | 4 ✅ |

*Gemini Flash gratuit = 1500 req/jour/clé*

---

## 🔑 Obtenir une clé Gemini gratuite

```
1 → Aller sur https://aistudio.google.com
2 → Se connecter avec un compte Google
3 → Cliquer "Get API Key"
4 → Créer une clé gratuite
5 → Copier la clé
6 → L'insérer dans la table api_keys
```

---

*Modification v1.0 — Claude API → Gemini 2.0 Flash*
*Fichiers modifiés : api.ts (nouveau), agent.ts, evolution.ts, queen.ts*
