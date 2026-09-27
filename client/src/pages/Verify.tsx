import { useState } from "react";
import PhonemailLogo from "../components/PhonemailLogo.tsx";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../Context/AuthContext.tsx";
import "./AuthPages.css";

function Verify() {
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const { pendingPhone, verifyOtp } = useAuth();
  const navigate = useNavigate();

  async function sendData(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    if (!pendingPhone) {
      setError("Start sign-in again to request a verification code.");
      return;
    }
    if (!/^\d{4,10}$/.test(otp)) {
      setError("Enter the verification code from your text message.");
      return;
    }

    try {
      await verifyOtp(otp);
      navigate("/home");
    } catch (error) {
      console.error(error);
      setError("That code could not be verified. Check it and try again.");
    }
  }

  return (
    <main className="auth-screen">
      <section className="auth-panel">
        <PhonemailLogo />
        <p className="auth-eyebrow">ONE MORE STEP</p>
        <h1>Verify your phone</h1>
        <p className="auth-description">Enter the code sent to {pendingPhone || "your phone"}.</p>
        <form onSubmit={sendData} className="auth-form">
        <input
          type="text"
          value={otp}
          onChange={(event) => {
            const value = event.target.value.replace(/\D/g, "").slice(0, 10);
            setOtp(value);
          }}
          inputMode="numeric"
          autoComplete="one-time-code"
          aria-label="Verification code"
          placeholder="Verification code"
          className="auth-input auth-code-input"
          required
        />
        {error && <p role="alert" className="auth-error">{error}</p>}

        <button
          type="submit"
          className="auth-submit"
        >
          Submit
        </button>
      </form>
      </section>
    </main>
  );
}

export default Verify;