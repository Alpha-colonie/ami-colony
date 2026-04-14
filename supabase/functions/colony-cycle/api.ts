// ============================================================
// AMI Colony — api.ts
// Appels Gemini 2.0 Flash — une clé par colonie
// ============================================================

const GEMINI_ENDPOINT =
  'https://generativelanguage.googleapis.com/v1beta' +
  '/models/gemini-2.0-flash:generateContent'

// Récupère la clé API de LA colonie concernée
// Pas de partage entre colonies — isolation totale
export async function getColonyApiKey(
  supabase:  any,
  colonyId:  number
): Promise<string> {

  const { data, error } = await supabase
    .from('api_keys')
    .select('*')
    .eq('provider',  'gemini')
    .eq('colony_id', colonyId)
    .eq('actif',     true)
    .single()

  if (error || !data) {
    throw new Error(`Aucune clé API Gemini pour colonie ${colonyId}`)
  }

  // Vérifier le quota quotidien
  if (data.used_today >= data.quota_day) {
    throw new Error(
      `Quota Gemini épuisé pour colonie ${colonyId} ` +
      `(${data.used_today}/${data.quota_day})`
    )
  }

  // Incrémenter le compteur
  await supabase
    .from('api_keys')
    .update({ used_today: data.used_today + 1 })
    .eq('id', data.id)

  return data.key
}

// Appel Gemini Flash
export async function callGemini(
  prompt:    string,
  apiKey:    string,
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

    // Quota épuisé côté Google
    if (data?.error?.code === 429) {
      console.error(`Quota Gemini épuisé côté Google`)
      return null
    }

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
// Gemini ajoute parfois des backticks markdown
export function parseJsonResponse<T>(text: string): T | null {
  try {
    const clean = text
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim()
    return JSON.parse(clean) as T
  } catch (err) {
    console.error('JSON parse error:', err)
    console.error('Raw text:', text.substring(0, 200))
    return null
  }
}
