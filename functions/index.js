const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

initializeApp();

/**
 * Proxy for Anthropic Claude API — generates photo description + tags.
 * Called from owner.html photo upload queue.
 * API key is read server-side from Firestore config/claude.api_key.
 */
exports.generatePhotoDescription = onCall({ region: 'us-central1' }, async (request) => {
  // Auth check — must be a signed-in user
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Must be signed in');
  }

  const db = getFirestore();

  // Admin check — must exist in admins collection
  const adminDoc = await db.doc(`admins/${request.auth.uid}`).get();
  if (!adminDoc.exists) {
    throw new HttpsError('permission-denied', 'Admin access required');
  }

  // Read Claude API key from Firestore (never exposed to client)
  const configDoc = await db.doc('config/claude').get();
  if (!configDoc.exists || !configDoc.data().api_key) {
    throw new HttpsError('failed-precondition', 'Claude API key not configured in Firestore config/claude');
  }
  const apiKey = configDoc.data().api_key;

  const { metadata, prompt } = request.data;
  if (!metadata) {
    throw new HttpsError('invalid-argument', 'metadata is required');
  }

  const descPrompt = prompt || 'Generate a concise, poetic description of this photography. Focus on mood, lighting, and what story the technical settings tell about the moment captured.';

  const anthropicBody = {
    model: 'claude-sonnet-4-20250514',
    max_tokens: 400,
    system: 'You are a photography description specialist. Respond ONLY with valid JSON — no markdown, no explanation, no code fences.',
    messages: [{
      role: 'user',
      content: `Based on the photo metadata below, generate a JSON object with exactly two fields:\n- "description": ${descPrompt}\n- "tags": 4-6 comma-separated tags describing the photo (subjects, mood, lighting conditions, location type, elements like water/ice/sky/fire/earth)\n\nPhoto metadata: ${JSON.stringify(metadata)}`
    }]
  };

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify(anthropicBody)
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new HttpsError('internal', err.error?.message || `Anthropic error ${res.status}`);
  }

  const data = await res.json();
  const text = data.content[0].text.trim();

  try {
    const parsed = JSON.parse(text);
    return { description: parsed.description || '', tags: parsed.tags || '' };
  } catch {
    // If Claude didn't return clean JSON, return the raw text as description
    return { description: text, tags: '' };
  }
});
