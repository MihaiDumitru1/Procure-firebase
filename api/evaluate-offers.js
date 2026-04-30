import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

if (!getApps().length) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY || '{}');
  initializeApp({ credential: cert(serviceAccount) });
}

const adminAuth = getAuth();
const adminDb = getFirestore();

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'authorization, content-type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    // Verify caller
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const idToken = authHeader.split('Bearer ')[1];
    const decoded = await adminAuth.verifyIdToken(idToken);
    const callerUid = decoded.uid;

    // Check role
    const callerDoc = await adminDb.collection('users').doc(callerUid).get();
    const role = callerDoc.data()?.role;
    if (!['app-admin', 'tender-organizer'].includes(role)) {
      return res.status(403).json({ error: 'Forbidden: insufficient permissions' });
    }

    const { tenderTitle, tenderDescription, tenderCategory, selectionCriteria, offers, currency = 'EUR' } = req.body;

    if (!offers || offers.length === 0) {
      return res.status(400).json({ error: 'No offers provided for evaluation' });
    }

    // Use OpenAI-compatible API or any LLM provider
    const AI_API_KEY = process.env.AI_API_KEY;
    const AI_API_URL = process.env.AI_API_URL || 'https://api.openai.com/v1/chat/completions';
    const AI_MODEL = process.env.AI_MODEL || 'gpt-4o-mini';

    if (!AI_API_KEY) {
      return res.status(500).json({ error: 'AI_API_KEY is not configured' });
    }

    const minAmount = Math.min(...offers.map(o => o.amount));
    const maxAmount = Math.max(...offers.map(o => o.amount));

    const systemPrompt = `You are an expert procurement evaluator for a facility management company. 
Your task is to objectively evaluate supplier offers for a tender based on the provided selection criteria.
Analyze each offer carefully and provide fair, data-driven scores (0-100) for each criterion, along with justifications.
Be precise, professional, and base your analysis on the provided data.
Always respond with valid JSON only, no markdown or extra text.`;

    const userPrompt = `Evaluate the following tender offers:

TENDER: ${tenderTitle}
CATEGORY: ${tenderCategory}
DESCRIPTION: ${tenderDescription}

SELECTION CRITERIA (must sum to 100%):
${selectionCriteria.map(c => `- ${c.name} (weight: ${c.weight}%)${c.description ? `: ${c.description}` : ''}`).join('\n')}

OFFERS TO EVALUATE:
${offers.map(o => `
Offer ID: ${o.offerId}
Supplier: ${o.supplierName}
Amount: ${currency} ${o.amount.toLocaleString()} (min: ${currency} ${minAmount.toLocaleString()}, max: ${currency} ${maxAmount.toLocaleString()})
Documents: ${o.documentNames?.length > 0 ? o.documentNames.join(', ') : 'None'}
Round: ${o.round}`).join('\n')}

Return a JSON array with one object per offer:
[
  {
    "offerId": "string",
    "supplierName": "string",
    "scores": [{ "criterionId": "string", "score": number, "justification": "string" }],
    "overallComment": "string",
    "recommendWinner": false
  }
]

Set "recommendWinner": true for the offer with the highest weighted total.`;

    const aiResponse = await fetch(AI_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${AI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: AI_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) return res.status(429).json({ error: 'Rate limit exceeded.' });
      const errText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errText);
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content;
    if (!content) throw new Error('Empty AI response');

    const cleaned = content.replace(/```json\n?|\n?```/g, '').trim();
    let evaluations;
    try {
      evaluations = JSON.parse(cleaned);
    } catch {
      console.error('Failed to parse AI response:', cleaned);
      throw new Error('AI returned invalid JSON');
    }

    // Compute weighted totals and set recommendWinner
    const withTotals = evaluations.map(ev => {
      const total = ev.scores.reduce((sum, s) => {
        const crit = selectionCriteria.find(c => c.id === s.criterionId);
        return sum + (s.score * (crit?.weight ?? 0)) / 100;
      }, 0);
      return { ...ev, _total: total };
    });

    const bestTotal = Math.max(...withTotals.map(e => e._total));
    const result = withTotals.map(({ _total, ...ev }) => ({
      ...ev,
      recommendWinner: Math.abs(_total - bestTotal) < 0.01,
    }));

    return res.json({ evaluations: result });
  } catch (error) {
    console.error('evaluate-offers error:', error);
    return res.status(500).json({ error: error.message || 'Unknown error' });
  }
}
