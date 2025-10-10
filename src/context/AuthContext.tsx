// src/context/AuthContext.tsx
import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { supabase } from "../lib/supabaseClient";
import type { User, Session } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (
    email: string,
    password: string,
    firstName?: string,
    lastName?: string
  ) => Promise<void>;
  signOut: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error) console.error("[Auth] getSession:", error);

      if (isMounted) {
        setSession(data.session);
        setUser(data.session?.user ?? null);
        setLoading(false);
      }
    };

    init();

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        if (!isMounted) return;
        setSession(newSession);
        setUser(newSession?.user ?? null);
        setLoading(false);
      }
    );

    return () => {
      isMounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
  }

  async function signUp(
    email: string,
    password: string,
    firstName?: string,
    lastName?: string
  ) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: [firstName, lastName].filter(Boolean).join(" "),
          firstName,
          lastName,
        },
      },
    });

    if (error) throw error;

    // ✅ Insert into your own "users" table after auth record is created
    if (data.user) {
      const { error: insertError } = await supabase.from("users").insert([
        {
          auth_id: data.user.id, // Link back to Supabase Auth user
          firstName,
          lastName,
        },
      ]);

      if (insertError) {
        console.error("Error inserting into users table:", insertError.message);
      } else {
        console.log("User inserted successfully into 'users' table");
      }
    }
  }

  async function signOut() {
    try {
      // Clear React state first
      setUser(null);
      setSession(null);

      // Check if Supabase has a session
      const { data } = await supabase.auth.getSession();

      if (data.session) {
        // ✅ Normal path: valid session exists
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        console.log("[AuthContext] Logged out cleanly via Supabase");
      } else {
        // ⚠️ Edge path: Supabase lost the session
        console.warn(
          "[AuthContext] No active session, clearing localStorage manually"
        );

        // Manually purge persisted Supabase auth keys
        for (const key in localStorage) {
          if (key.includes("supabase") || key.includes("budgetme.auth")) {
            localStorage.removeItem(key);
          }
        }

        sessionStorage.clear();
      }

      // Optional: reload the page to guarantee fresh state
      window.location.href = "/login";
    } catch (err) {
      console.error("[AuthContext] signOut failed:", err);
      // Fallback: hard clear just in case
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = "/login";
    }
  }

  async function signInWithGoogle() {
    const redirectUrl =
      import.meta.env.MODE === "development"
        ? "http://localhost:5173/login"
        : "https://lobbyx3.com/login";

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: redirectUrl,
        queryParams: {
          prompt: "select_account",
          access_type: "offline",
          // ✅ Remove manual code_challenge fields
          response_mode: "query", // ✅ still use query params instead of hash
        },
      },
    });

    if (error) {
      console.error("[AuthContext] Google sign-in failed:", error.message);
      throw error;
    } else {
      console.log("[AuthContext] Redirecting to Google login...");
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        signIn,
        signUp,
        signOut,
        signInWithGoogle,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
