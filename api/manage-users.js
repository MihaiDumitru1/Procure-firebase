import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin (only once)
if (!getApps().length) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY || '{}');
  initializeApp({
    credential: cert(serviceAccount),
  });
}

const adminAuth = getAuth();
const adminDb = getFirestore();

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'authorization, content-type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    // Verify caller's Firebase ID token
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const idToken = authHeader.split('Bearer ')[1];
    const decoded = await adminAuth.verifyIdToken(idToken);
    const callerUid = decoded.uid;

    // Check caller is app-admin
    const callerDoc = await adminDb.collection('users').doc(callerUid).get();
    if (!callerDoc.exists || callerDoc.data()?.role !== 'app-admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { action, ...body } = req.body;

    // ── LIST ──────────────────────────────────────────────────────────────
    if (action === 'list') {
      const listResult = await adminAuth.listUsers(1000);
      const usersSnap = await adminDb.collection('users').get();
      const usersMap = {};
      usersSnap.docs.forEach(d => { usersMap[d.id] = d.data(); });

      const result = listResult.users
        .filter(u => usersMap[u.uid]) // Only users with a profile
        .map(u => ({
          id: u.uid,
          email: u.email,
          full_name: usersMap[u.uid]?.full_name ?? '',
          role: usersMap[u.uid]?.role ?? null,
          company: usersMap[u.uid]?.company ?? '',
          created_at: u.metadata.creationTime,
        }));

      return res.json(result);
    }

    // ── CREATE ────────────────────────────────────────────────────────────
    if (action === 'create') {
      const { email, password, full_name, role, company } = body;
      if (!email || !password || !role) {
        return res.status(400).json({ error: 'Missing fields' });
      }

      const userRecord = await adminAuth.createUser({
        email,
        password,
        displayName: full_name || company || '',
        emailVerified: true,
      });

      // Store user profile + role in Firestore
      await adminDb.collection('users').doc(userRecord.uid).set({
        email,
        full_name: full_name || '',
        role,
        company: company || '',
        created_at: new Date().toISOString(),
      });

      return res.json({ success: true, user: { id: userRecord.uid, email: userRecord.email } });
    }

    // ── UPDATE ────────────────────────────────────────────────────────────
    if (action === 'update') {
      const { user_id, full_name, role, password, company } = body;
      if (!user_id) return res.status(400).json({ error: 'Missing user_id' });

      const updateData = {};
      if (full_name !== undefined) updateData.displayName = full_name;
      if (password) updateData.password = password;

      if (Object.keys(updateData).length > 0) {
        await adminAuth.updateUser(user_id, updateData);
      }

      // Update Firestore profile
      const profileUpdate = {};
      if (full_name !== undefined) profileUpdate.full_name = full_name;
      if (role) profileUpdate.role = role;
      if (company !== undefined) profileUpdate.company = company;

      if (Object.keys(profileUpdate).length > 0) {
        await adminDb.collection('users').doc(user_id).set(profileUpdate, { merge: true });
      }

      return res.json({ success: true });
    }

    // ── DELETE ────────────────────────────────────────────────────────────
    if (action === 'delete') {
      const { user_id } = body;
      if (!user_id) return res.status(400).json({ error: 'Missing user_id' });

      await adminAuth.deleteUser(user_id);
      await adminDb.collection('users').doc(user_id).delete();

      return res.json({ success: true });
    }

    return res.status(400).json({ error: 'Unknown action' });
  } catch (e) {
    console.error('manage-users error:', e);
    return res.status(500).json({ error: String(e) });
  }
}
