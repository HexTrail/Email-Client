// Implements the phone-based password recovery flow.
// Implements the phone-based password recovery flow.
import { useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import PhonemailLogo from "../components/PhonemailLogo.tsx";
import PhoneNumberField from "../components/PhoneNumberField.tsx";
import "./AuthPages.css";

function ForgotPassword() {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [complete, setComplete] = useState(false);
  const [error, setError] = useState("");
  const phone = `+91${phoneNumber}`;

  async function requestCode(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!/^\+91\d{10}$/.test(phone)) {
      setError("Enter a valid phone number.");
      return;
    }

    try {
      await axios.post("/api/auth/forgot-password", { phone });
      setCodeSent(true);
    } catch (requestError) {
      console.error(requestError);
      setError("Could not send a recovery code. Check your number and try again.");
    }
  }

  async function resetPassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!/^\d{4,10}$/.test(otp)) {
      setError("Enter the verification code from your text message.");
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
    if (password !== confirmation) {
      setError("The passwords do not match.");
      return;
    }

    try {
      await axios.post("/api/auth/reset-password", { phone, otp, password });
      setComplete(true);
    } catch (resetError) {
      console.error(resetError);
      setError("That code could not be verified. Check it and try again.");
    }
  }

  return (
    <main className="auth-screen">
      <section className="auth-panel">
        <PhonemailLogo />
        <p className="auth-eyebrow">ACCOUNT RECOVERY</p>
        {complete ? (
          <>
            <h1>Password updated</h1>
            <p className="auth-description">Your password has been reset. Sign in with your new password.</p>
            <Link className="auth-submit" to="/">Back to sign in</Link>
          </>
        ) : (
          <>
            <h1>{codeSent ? "Verify your phone" : "Forgot your password?"}</h1>
            <p className="auth-description">
              {codeSent
                ? `If an account exists for ${phoneNumber}, a code has been sent. Enter it below to continue.`
                : "Enter the phone number linked to your account and we'll text you a verification code."}
            </p>
            {codeSent ? (
              <form onSubmit={resetPassword} className="auth-form">
                <div className="auth-field">
                  <label htmlFor="recovery-code">Verification code</label>
                  <input
                    id="recovery-code"
                    type="text"
                    value={otp}
                    onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 10))}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    placeholder="Verification code"
                    className="auth-input auth-code-input"
                    required
                  />
                </div>
                <div className="auth-field">
                  <label htmlFor="new-password">New password</label>
                  <input
                    id="new-password"
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete="new-password"
                    placeholder="New password"
                    className="auth-input"
                    required
                  />
                </div>
                <div className="auth-field">
                  <label htmlFor="confirm-password">Confirm new password</label>
                  <input
                    id="confirm-password"
                    type="password"
                    value={confirmation}
                    onChange={(event) => setConfirmation(event.target.value)}
                    autoComplete="new-password"
                    placeholder="Confirm new password"
                    className="auth-input"
                    required
                  />
                </div>
                {error && <p role="alert" className="auth-error">{error}</p>}
                <button type="submit" className="auth-submit">Reset password</button>
              </form>
            ) : (
              <form onSubmit={requestCode} className="auth-form">
                <div className="auth-field">
                  <label htmlFor="recovery-phone">Phone number</label>
                  <PhoneNumberField
                    id="recovery-phone"
                    phoneNumber={phoneNumber}
                    onPhoneNumberChange={setPhoneNumber}
                  />
                </div>
                {error && <p role="alert" className="auth-error">{error}</p>}
                <button type="submit" className="auth-submit">Send verification code</button>
              </form>
            )}
            <p className="auth-recovery-link"><Link to="/">Back to sign in</Link></p>
          </>
        )}
      </section>
    </main>
  );
}

export default ForgotPassword;
