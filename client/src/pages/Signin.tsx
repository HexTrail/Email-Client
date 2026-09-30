// Implements account sign-in and starts phone verification.
// Implements account sign-in and starts phone verification.
import { useState } from "react";
import axios from "axios";
import PhonemailLogo from "../components/PhonemailLogo.tsx";
import PhoneNumberField from "../components/PhoneNumberField.tsx";
import TermsModal from "../components/TermsModal.tsx";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../Context/AuthContext.tsx";
import "./AuthPages.css";

function Signin() {
  const [termsOpen, setTermsOpen] = useState(false);
  const [pendingSignIn, setPendingSignIn] = useState<{
    phone: string;
    username: string;
    password: string;
  } | null>(null);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const { signIn } = useAuth();
  const navigate = useNavigate();
  async function sendData(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const phone = `+91${phoneNumber}`;
    if (!/^\+91\d{10}$/.test(phone)) {
      setError("Enter a valid phone number.");
      return;
    }
    if (
      password.length < 8 || password.length > 15 ||
      !/[A-Z]/.test(password) || !/[a-z]/.test(password) ||
      !/[0-9]/.test(password) || !/[^A-Za-z0-9]/.test(password)
    ) {
      setError("Password must be 8-15 characters and include upper/lowercase letters, a number, and a symbol.");
      return;
    }
    if (username.trim().length < 3) {
      setError("Username must have at least 3 characters.");
      return;
    }
    setPendingSignIn({ phone, username, password });
    setTermsOpen(true);
  }

  async function agreeToTerms() {
    if (!pendingSignIn) return;

    setTermsOpen(false);
    try {
      const otpRequired = await signIn(
        pendingSignIn.phone,
        pendingSignIn.username,
        pendingSignIn.password
      );
      navigate(otpRequired ? "/verify" : "/home");
    } catch (error) {
      console.error(error);
      const responseMessage = axios.isAxiosError(error) ? error.response?.data?.message : undefined;
      setError(typeof responseMessage === "string" ? responseMessage : "Could not sign in. Please try again.");
    } finally {
      setPendingSignIn(null);
    }
  }
  return (
    <main className="auth-screen">
      <section className="auth-panel">
        <PhonemailLogo />
        <p className="auth-eyebrow">YOUR MAIL, IN ONE PLACE</p>
        <h1>Sign in or create an account</h1>
        <p className="auth-description">Use your phone number to securely open your inbox.</p>
        <form onSubmit={sendData} className="auth-form">
          <div className="auth-field">
            <label htmlFor="phone">Phone number</label>
            <PhoneNumberField
              id="phone"
              phoneNumber={phoneNumber}
              onPhoneNumberChange={setPhoneNumber}
            />
          </div>
          <div className="auth-field">
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              name="username"
              placeholder="Username"
              className="auth-input"
              autoComplete="username"
              required
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
          <div className="auth-field">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              placeholder="Password"
              className="auth-input"
              autoComplete="new-password"
              required
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error && <p role="alert" className="auth-error">{error}</p>}
          <button
            type="submit"
            className="auth-submit"
          >
            Continue
          </button>
        </form>
        <p className="auth-recovery-link"><Link to="/forgot-password">Forgot password?</Link></p>
      </section>
      {termsOpen && (
        <TermsModal
          onAgree={agreeToTerms}
          onClose={() => {
            setTermsOpen(false);
            setPendingSignIn(null);
          }}
        />
      )}
    </main>
  );
}

export default Signin;
