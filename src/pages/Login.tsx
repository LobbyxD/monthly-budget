import { useState, FormEvent, ChangeEvent, useEffect } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabaseClient";
import "../style/login.css";

export default function Login() {
  const { signIn, signUp, signInWithGoogle, user } = useAuth();
  const navigate = useNavigate();

  // Core form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [flipped, setFlipped] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Google modal state
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [googleFirstName, setGoogleFirstName] = useState("");
  const [googleLastName, setGoogleLastName] = useState("");

  /* -----------------------------
     ✅ Email validation
  ------------------------------*/
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
  const isValidEmail = (value: string): boolean =>
    emailRegex.test(value.trim());
  const isEmailValid = isValidEmail(email);

  /* -----------------------------
     ✅ Password strength logic
  ------------------------------*/
  function getPasswordStrength(pw: string): number {
    if (!pw) return 0;
    let score = 0;
    if (pw.length >= 8) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(pw)) score++;
    if (pw.length >= 12) score++;
    return score;
  }
  function validatePassword(pw: string): boolean {
    return (
      pw.length >= 8 &&
      pw.length <= 16 &&
      /[A-Z]/.test(pw) &&
      /[!@#$%^&*(),.?":{}|<>]/.test(pw)
    );
  }
  const passwordStrength = getPasswordStrength(password);
  const isPasswordValid = validatePassword(password);

  /* -----------------------------
     🔐 Login & Signup handlers
  ------------------------------*/
  async function handleLogin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    if (!isEmailValid) return setError("Please enter a valid email address.");
    setLoading(true);
    try {
      await signIn(email.trim(), password);

      // ✅ Navigate to home after successful login
      navigate("/", { replace: true });
    } catch (err: any) {
      setError(err?.message ?? "Login failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleSignup(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    if (!isEmailValid) return setError("Please enter a valid email address.");
    if (!isPasswordValid)
      return setError(
        "Password must be 8–16 chars, include a capital letter and a special character."
      );

    setLoading(true);
    try {
      await signUp(email.trim(), password, firstName.trim(), lastName.trim());
      alert("Check your email for the confirmation link!");
      setFlipped(false);
    } catch (err: any) {
      setError(err?.message ?? "Sign-up failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleLogin() {
    try {
      await signInWithGoogle();
    } catch (err: any) {
      setError(err?.message ?? "Google sign-in failed");
    }
  }

  /* -----------------------------
     ☁️ Handle Google OAuth redirect
  ------------------------------*/
  const [checkingGoogleUser, setCheckingGoogleUser] = useState(true);

  useEffect(() => {
    const checkUser = async () => {
      if (!user) {
        setCheckingGoogleUser(false);
        return;
      }

      const { data, error } = await supabase
        .from("users")
        .select("auth_id, firstName, lastName")
        .eq("auth_id", user.id)
        .maybeSingle();

      if (error) console.error(error.message);

      if (!data || !data.firstName?.trim() || !data.lastName?.trim()) {
        setShowGoogleModal(true);
      } else {
        navigate("/", { replace: true });
      }

      setCheckingGoogleUser(false);
    };

    checkUser();
  }, [user, navigate]);

  // Add this near return()
  if (checkingGoogleUser) {
    return <div className="page center">Loading...</div>;
  }

  async function handleGoogleModalConfirm() {
    if (!googleFirstName.trim() || !googleLastName.trim()) {
      setError("Please enter your first and last name.");
      return;
    }

    if (user) {
      // Check if user already has a row; if yes, update; otherwise, insert.
      const { data: existingUser } = await supabase
        .from("users")
        .select("auth_id")
        .eq("auth_id", user.id)
        .maybeSingle();

      if (existingUser) {
        await supabase
          .from("users")
          .update({
            firstName: googleFirstName.trim(),
            lastName: googleLastName.trim(),
          })
          .eq("auth_id", user.id);
      } else {
        await supabase.from("users").insert([
          {
            auth_id: user.id,
            firstName: googleFirstName.trim(),
            lastName: googleLastName.trim(),
          },
        ]);
      }

      await supabase.auth.updateUser({
        data: {
          profile_completed: true,
          full_name: `${googleFirstName} ${googleLastName}`,
          firstName: googleFirstName,
          lastName: googleLastName,
        },
      });
    }
    setShowGoogleModal(false);
    navigate("/", { replace: true });
  }

  /* -----------------------------
     🧱 Render
  ------------------------------*/
  return (
    <div className="page center">
      {/* 🟦 Google name modal */}
      {showGoogleModal && (
        <div className="modal-overlay">
          <div className="modal" style={{ zIndex: 1000 }}>
            <h2>Welcome!</h2>
            <p>Please confirm your name to complete sign-in.</p>
            <input
              type="text"
              placeholder="First Name"
              value={googleFirstName}
              onChange={(e) => setGoogleFirstName(e.target.value)}
              required
            />
            <input
              type="text"
              placeholder="Last Name"
              value={googleLastName}
              onChange={(e) => setGoogleLastName(e.target.value)}
              required
            />
            {error && <p className="login-error">{error}</p>}
            <div className="modal-actions">
              <button onClick={handleGoogleModalConfirm}>Confirm</button>
            </div>
          </div>
        </div>
      )}

      <div className={`login-card-container ${flipped ? "flipped" : ""}`}>
        {/* FRONT: LOGIN */}
        <div className="login-card front">
          <h2 className="login-title">Sign In</h2>
          <form onSubmit={handleLogin} noValidate>
            <div className="input-group">
              <input
                type="email"
                placeholder="Email"
                autoComplete="email"
                inputMode="email"
                value={email}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setEmail(e.target.value)
                }
                aria-invalid={email !== "" && !isEmailValid}
                className={email !== "" && !isEmailValid ? "input-invalid" : ""}
                required
              />
              {email !== "" && !isEmailValid && (
                <p className="field-error">
                  Enter a valid email like name@domain.com
                </p>
              )}
            </div>

            <input
              type="password"
              placeholder="Password"
              autoComplete="current-password"
              value={password}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setPassword(e.target.value)
              }
              required
            />

            {error && <p className="login-error">{error}</p>}

            <div className="actions-row">
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading || !isEmailValid || !password}
              >
                {loading ? "Loading..." : "Login"}
              </button>

              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setFlipped(true)}
              >
                Create Account
              </button>
            </div>
          </form>

          <hr className="oauth-divider" />
          <button
            type="button"
            className="btn btn-primary oauth-btn google"
            onClick={handleGoogleLogin}
          >
            Continue with Google
          </button>
        </div>

        {/* BACK: SIGNUP */}
        <div className="login-card back">
          <h2 className="login-title">Create Account</h2>
          <form onSubmit={handleSignup} noValidate>
            <input
              type="text"
              placeholder="First Name"
              value={firstName}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setFirstName(e.target.value)
              }
              required
            />
            <input
              type="text"
              placeholder="Last Name"
              value={lastName}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setLastName(e.target.value)
              }
              required
            />
            <div className="input-group">
              <input
                type="email"
                placeholder="Email"
                autoComplete="email"
                inputMode="email"
                value={email}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setEmail(e.target.value)
                }
                aria-invalid={email !== "" && !isEmailValid}
                className={email !== "" && !isEmailValid ? "input-invalid" : ""}
                required
              />
              {email !== "" && !isEmailValid && (
                <p className="field-error">
                  Enter a valid email like name@domain.com
                </p>
              )}
            </div>

            <div className="password-wrapper">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                autoComplete="new-password"
                value={password}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setPassword(e.target.value)
                }
                required
              />
              <button
                type="button"
                className={`eye-btn ${showPassword ? "is-open" : "is-closed"}`}
                onPointerDown={() => setShowPassword(true)}
                onPointerUp={() => setShowPassword(false)}
                onPointerLeave={() => setShowPassword(false)}
                onPointerCancel={() => setShowPassword(false)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
              >
                {/* Open eye */}
                <svg className="eye eye-open" viewBox="0 0 24 24">
                  <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z" />
                  <circle cx="12" cy="12" r="3.5" />
                </svg>
                {/* Closed eye */}
                <svg className="eye eye-closed" viewBox="0 0 24 24">
                  <path d="M3 3l18 18" />
                  <path d="M10.6 10.6A3.5 3.5 0 0 0 12 15.5" />
                  <path d="M21.8 12.6c-.8 1.5-4 5.4-9.8 5.4-2 0-3.7-.5-5.1-1.2M2.2 11.4C3 9.9 6.2 6 12 6c1.2 0 2.3.2 3.2.5" />
                </svg>
              </button>
            </div>

            {/* Password Strength Indicator */}
            <div className={`strength-bar strength-${passwordStrength}`}>
              {[1, 2, 3, 4].map((i) => (
                <span
                  key={i}
                  className={passwordStrength >= i ? "filled" : ""}
                />
              ))}
            </div>

            {error && <p className="login-error">{error}</p>}

            <button
              type="submit"
              className="btn btn-primary"
              disabled={
                loading ||
                !isEmailValid ||
                !isPasswordValid ||
                !firstName.trim() ||
                !lastName.trim()
              }
            >
              {loading ? "Creating..." : "Create Account"}
            </button>
          </form>

          <p className="muted-inline">
            Already have an account?{" "}
            <button
              type="button"
              className="link-inline"
              onClick={() => setFlipped(false)}
            >
              Sign in
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
