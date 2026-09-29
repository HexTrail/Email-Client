// Implements account sign-in and starts phone verification.
// Implements account sign-in and starts phone verification.
import { useState } from "react";
import PhonemailLogo from "../components/PhonemailLogo.tsx";
import PhoneNumberField from "../components/PhoneNumberField.tsx";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../Context/AuthContext.tsx";
import "./AuthPages.css";

function Signin() {
  const [countryCode, setCountryCode] = useState("+91");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const { signIn } = useAuth();
  const navigate = useNavigate();
  async function sendData(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const phone = `${countryCode}${phoneNumber}`;
    if (!/^\+[1-9]\d{7,14}$/.test(phone)) {
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
    try {
      await signIn(phone, username, password);
      navigate("/verify");
    } catch (error) {
      console.error(error);
      setError("Could not start verification. Check your details and try again.");
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
              countryCode={countryCode}
              phoneNumber={phoneNumber}
              onCountryCodeChange={setCountryCode}
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
    </main>
  );
}

export default Signin;
