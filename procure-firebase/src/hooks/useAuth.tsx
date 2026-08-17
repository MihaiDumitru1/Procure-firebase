import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, onAuthStateChanged, signInWithEmailAndPassword, signOut as firebaseSignOut, updatePassword as firebaseUpdatePassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/integrations/firebase/client';

type AppRole = 'app-admin' | 'tender-organizer' | 'procurement-officer' | 'supplier' | null;

interface AuthContextType {
  user: User | null;
  role: AppRole;
  fullName: string;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  updatePassword: (password: string) => Promise<{ error: Error | null }>;
  refreshRole: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<AppRole>(null);
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchUserData = async (uid: string) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        setRole((data.role as AppRole) ?? null);
        setFullName(data.full_name ?? '');
      } else {
        setRole(null);
        setFullName('');
      }
    } catch (err) {
      console.error('Error fetching user data:', err);
      setRole(null);
      setFullName('');
    }
  };

  const refreshRole = async () => {
    if (user) await fetchUserData(user.uid);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        await fetchUserData(firebaseUser.uid);
      } else {
        setRole(null);
        setFullName('');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  };

  const signOutFn = async () => {
    await firebaseSignOut(auth);
  };

  const updatePasswordFn = async (password: string) => {
    try {
      if (!auth.currentUser) throw new Error('Not authenticated');
      await firebaseUpdatePassword(auth.currentUser, password);
      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  };

  return (
    <AuthContext.Provider value={{ user, role, fullName, loading, signIn, signOut: signOutFn, updatePassword: updatePasswordFn, refreshRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
