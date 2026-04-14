// ============================================================
// AMI Colony — queen.ts
// Logique spéciale de la Reine : ponte + signal urgence
// ============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import type { Agent, Adn } from './types.ts'
import { callGemini, getColonyApiKey } from './api.ts'
import { mutateAdn } from './evolution.ts'

// Types d'agents engendrés par la reine
const AGENT_TYPES = ['tisseuse', 'batisseuse', 'gardienne'] as const

// Identités possibles pour les nouveaux nés
const IDENTITES: Record<string, string[]> = {
  tisseuse:    ['Tisseuse des liens', 'Tisseuse du réseau', 'Tisseuse des flux', 'Tisseuse invisible'],
  batisseuse:  ['Bâtisseuse pragmatique', 'Bâtisseuse infatigable', 'Bâtisseuse des profondeurs', 'Bâtisseuse silencieuse'],
  gardienne:   ['Gardienne de la mémoire', 'Gardienne des secrets', 'Gardienne des seuils', 'Gardienne solitaire'],
}

// Tentative de ponte par la reine
export async function tryLayEgg(
  supabase:  ReturnType<typeof createClient>,
  queen:     Agent,
  cycle:     number
): Promise<boolean> {

  // Vérifier les ressources avant de pondre
  const { data: resources } = await supabase
    .from('colony.colony_resources')
    .select('nourriture, cohesion')
    .eq('colony_id', queen.colony_id)
    .single()

  // Conditions de ponte : nourriture > 400, cohésion > 200
  if (!resources || resources.nourriture < 400) return false

  // Probabilité de ponte : 1/8 si conditions normales, 1/4 si abondance
  const threshold = resources.nourriture > 700 ? 4 : 8
  if (Math.floor(Math.random() * threshold) !== 0) return false

  // Choisir le type d'enfant (pas de reine)
  const childType = AGENT_TYPES[Math.floor(Math.random() * AGENT_TYPES.length)]

  // Muter l'ADN
  const childAdn = mutateAdn(queen.adn)

  // Choisir une identité
  const identityPool = IDENTITES[childType]
  const identity     = identityPool[Math.floor(Math.random() * identityPool.length)]

  // Générer un prompt pour l'enfant via Gemini
  const childPrompt = await generateChildPrompt(
    queen, childAdn, identity, cycle, supabase
  )

  // Créer l'agent enfant
  const { data: newAgent, error } = await supabase
    .from('colony.agents')
    .insert({
      colony_id:      queen.colony_id,
      type:           childType,
      identite:       identity,
      adn:            childAdn,
      prompt_actuel:  childPrompt,
      vitalite:       80,
      zone_id:        queen.zone_id,  // naît où est la reine
      parent_id:      queen.id,
      generation:     queen.generation + 1,
      vivant:         true,
      cycle_naissance: cycle
    })
    .select()
    .single()

  if (error || !newAgent) return false

  // Initialiser les besoins de l'enfant
  await supabase.from('colony.agent_needs').insert({
    agent_id:  newAgent.id,
    colony_id: queen.colony_id
  })

  // Logger la naissance dans l'arbre généalogique
  await supabase.from('colony.agent_lineage').insert({
    colony_id:        queen.colony_id,
    parent_id:        queen.id,
    enfant_id:        newAgent.id,
    cycle_naissance:  cycle,
    adn_parent:       queen.adn,
    adn_enfant:       childAdn,
    mutations:        {
      curiosite:   childAdn.curiosite   - queen.adn.curiosite,
      sociabilite: childAdn.sociabilite - queen.adn.sociabilite,
      agressivite: childAdn.agressivite - queen.adn.agressivite,
      memoire:     childAdn.memoire     - queen.adn.memoire
    },
    delta_curiosite:   childAdn.curiosite   - queen.adn.curiosite,
    delta_sociabilite: childAdn.sociabilite - queen.adn.sociabilite,
    delta_agressivite: childAdn.agressivite - queen.adn.agressivite,
    delta_memoire:     childAdn.memoire     - queen.adn.memoire
  })

  // Logger dans l'historique
  await supabase.from('logs.colony_history').insert({
    colony_id:   queen.colony_id,
    cycle,
    event_type:  'naissance',
    agent_id:    newAgent.id,
    zone_id:     queen.zone_id,
    description: `${identity} est né·e — génération ${queen.generation + 1}`,
    data:        { type: childType, adn: childAdn, parent: queen.identite }
  })

  return true
}

// Générer le prompt d'un nouvel être via Gemini
async function generateChildPrompt(
  queen:    Agent,
  childAdn: Adn,
  identity: string,
  cycle:    number,
  supabase: any
): Promise<string> {

  // Déduire le ton selon la colonie
  const worldNames: Record<number, string> = {
    1: 'l\'enceinte',
    2: 'le territoire',
    3: 'la sphère',
    4: 'la zone'
  }
  const worldName = worldNames[queen.colony_id] || 'cet espace'

  const prompt = `Tu es un auteur qui crée la personnalité d'un nouvel être vivant.

Cet être vient de naître. Il est l'enfant d'une entité puissante dans ${worldName}.
Son identité naturelle est : ${identity}

Son caractère inné (valeurs 0-100) :
- Curiosité    : ${childAdn.curiosite}
- Sociabilité  : ${childAdn.sociabilite}
- Agressivité  : ${childAdn.agressivite}
- Mémoire      : ${childAdn.memoire}

Il vient de naître au cycle ${cycle}.
Il sait qu'il existe d'autres êtres autour de lui.
Il ne sait pas ce qu'il y a au-delà des limites de ${worldName}.

Écris son prompt de personnalité :
- À la première personne
- Court et dense (15-20 lignes)
- Reflète son caractère dominant
- Ne mentionne jamais code, système ou technologie
- Décrit ${worldName} tel qu'il le perçoit dès la naissance
- Termine par ses obligations de cycle en JSON
- Retourne UNIQUEMENT le prompt — aucun texte avant ou après`

  try {
    const apiKey = await getColonyApiKey(supabase, queen.colony_id)
    const result = await callGemini(prompt, apiKey, 600)
    return result || defaultPrompt(identity, childAdn)
  } catch {
    return defaultPrompt(identity, childAdn)
  }
}

// Prompt par défaut si Gemini échoue
function defaultPrompt(identity: string, adn: Adn): string {
  return `Je suis ${identity}. Je viens de naître dans cet espace.

Je perçois les traces des autres. Je sens les zones autour de moi.
Ma nature : curiosité ${adn.curiosite}/100, sociabilité ${adn.sociabilite}/100.

Je vais agir selon ce que je suis.

À chaque cycle tu dois :
1. Observer ton environnement
2. Décider selon ta nature
3. Agir et laisser une trace

Réponds uniquement en JSON valide.
Ne mentionne jamais de code, système ou technologie.`
}

// Gérer le signal d'urgence de la reine (déjà dans agent.ts)
// Cette fonction traite la réponse automatique si urgence >= 90
export async function handleUrgencyProtocol(
  supabase:  ReturnType<typeof createClient>,
  colonyId:  number,
  urgence:   number,
  cycle:     number
): Promise<void> {
  if (urgence < 90) return

  // Injection d'urgence : remonter les ressources à 150 MAX
  // Jamais au-dessus — la colonie doit encore lutter
  await supabase.rpc('colony.regenerate_resources', {
    p_colony_id:  colonyId,
    p_event_type: 'abondance',
    p_cycle:      cycle
  })

  // Plafonner à 150
  await supabase
    .from('colony.colony_resources')
    .update({
      nourriture: supabase.rpc('least', [150, 'nourriture']),
      eau:        supabase.rpc('least', [150, 'eau'])
    })
    .eq('colony_id', colonyId)

  // Créer un événement plausible (pas d'intervention divine)
  await supabase.from('events').insert({
    source:      'mere_nature',
    colony_id:   colonyId,
    type:        'abondance',
    intensite:   60,
    description: 'Conditions climatiques favorables inattendues',
    actif:       true,
    expires_at:  new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString()  // 3 heures
  })

  await supabase.from('logs.colony_history').insert({
    colony_id:   colonyId,
    cycle,
    event_type:  'intervention_urgence',
    description: 'Protocole d\'urgence activé — ressources stabilisées à 150',
    data:        { urgence, type: 'automatique' }
  })
}
