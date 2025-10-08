import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import "../style/login.css";

export default function Login() {
  const { signIn, signUp, signInWithGoogle } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [flipped, setFlipped] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // ---- Email validation (conservative, user-friendly) ----
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
  const isValidEmail = (value) => emailRegex.test(value.trim());
  const isEmailValid = isValidEmail(email);

  // ---- Password validation logic ----
  const passwordStrength = getPasswordStrength(password);
  const isPasswordValid = validatePassword(password);

  function getPasswordStrength(pw) {
    if (!pw) return 0;
    let score = 0;
    if (pw.length >= 8) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(pw)) score++;
    if (pw.length >= 12) score++;
    return score;
  }

  function validatePassword(pw) {
    return (
      pw.length >= 8 &&
      pw.length <= 16 &&
      /[A-Z]/.test(pw) &&
      /[!@#$%^&*(),.?":{}|<>]/.test(pw)
    );
  }

  async function handleLogin(e) {
    e.preventDefault();
    setError("");

    if (!isEmailValid) {
      setError("Please enter a valid email address.");
      return;
    }

    setLoading(true);
    try {
      await signIn(email.trim(), password);
    } catch (err) {
      setError(err?.message ?? "Login failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleSignup(e) {
    e.preventDefault();
    setError("");

    if (!isEmailValid) {
      setError("Please enter a valid email address.");
      return;
    }
    if (!isPasswordValid) {
      setError(
        "Password must be 8–16 chars, include a capital letter and a special character."
      );
      return;
    }

    setLoading(true);
    try {
      await signUp(email.trim(), password);
      alert("Check your email for the confirmation link!");
      setFlipped(false); // flip back after signup
    } catch (err) {
      setError(err?.message ?? "Sign-up failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page center">
      <div className={`login-card-container ${flipped ? "flipped" : ""}`}>
        {/* FRONT: LOGIN */}
        <div className="login-card front">
          <h2 className="login-title">Sign In</h2>
          <form onSubmit={handleLogin} noValidate>
            <input
              type="email"
              placeholder="Email"
              autoComplete="email"
              inputMode="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={email !== "" && !isEmailValid}
              className={email !== "" && !isEmailValid ? "input-invalid" : ""}
              required
            />
            {email !== "" && !isEmailValid && (
              <p className="field-error">
                Enter a valid email like name@domain.com
              </p>
            )}

            <input
              type="password"
              placeholder="Password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
            onClick={() => signInWithGoogle()}
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
              placeholder="Name"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />

            <input
              type="email"
              placeholder="Email"
              autoComplete="email"
              inputMode="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={email !== "" && !isEmailValid}
              className={email !== "" && !isEmailValid ? "input-invalid" : ""}
              required
            />
            {email !== "" && !isEmailValid && (
              <p className="field-error">
                Enter a valid email like name@domain.com
              </p>
            )}

            <div className="password-wrapper">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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
                <svg
                  className="eye eye-open"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z" />
                  <circle cx="12" cy="12" r="3.5" />
                </svg>

                {/* Closed eye (eye-off) */}
                <svg
                  className="eye eye-closed"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path d="M3 3l18 18" />
                  <path d="M10.6 10.6A3.5 3.5 0 0 0 12 15.5" />
                  <path d="M21.8 12.6c-.8 1.5-4 5.4-9.8 5.4-2 0-3.7-.5-5.1-1.2M2.2 11.4C3 9.9 6.2 6 12 6c1.2 0 2.3.2 3.2.5" />
                </svg>
              </button>
            </div>

            {/* Password Strength Bar */}
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
                loading || !isEmailValid || !isPasswordValid || !name.trim()
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
