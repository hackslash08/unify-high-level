import { defineStore } from "pinia";
import { ref, computed } from "vue";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  type User,
} from "firebase/auth";
import { firebaseAuth } from "@/lib/firebase";
import { doc, setDoc } from "firebase/firestore";
import { firestore } from "@/lib/firebase";

export const useAuthStore = defineStore("auth", () => {
  const user = ref<User | null>(null);
  const loading = ref(true);
  const error = ref<string | null>(null);

  const isAuthenticated = computed(() => !!user.value);

  onAuthStateChanged(firebaseAuth, (u) => {
    user.value = u;
    loading.value = false;
  });

  async function signIn(email: string, password: string) {
    error.value = null;
    try {
      await signInWithEmailAndPassword(firebaseAuth, email, password);
    } catch (e) {
      error.value = e instanceof Error ? e.message : "Sign in failed";
      throw e;
    }
  }

  async function signUp(email: string, password: string) {
    error.value = null;
    try {
      const cred = await createUserWithEmailAndPassword(firebaseAuth, email, password);
      await setDoc(doc(firestore, "users", cred.user.uid), {
        email,
        createdAt: new Date().toISOString(),
      });
    } catch (e) {
      error.value = e instanceof Error ? e.message : "Sign up failed";
      throw e;
    }
  }

  async function signOut() {
    await firebaseSignOut(firebaseAuth);
  }

  async function getIdToken(): Promise<string> {
    if (!user.value) throw new Error("Not authenticated");
    return user.value.getIdToken();
  }

  return { user, loading, error, isAuthenticated, signIn, signUp, signOut, getIdToken };
});
