import { useState } from "react";
import PhoneMailIcon from "../components/Logo.tsx";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../Context/AuthContext.tsx";

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
    <div className="flex flex-col items-center justify-center h-screen w-screen gap-2">
      <PhoneMailIcon />
      <h1 className="text-3xl font-bold mb-2">Verify your phone</h1>

      <form onSubmit={sendData} className="flex flex-col items-center justify-center gap-4 max-h-[80vh] max-w-full border w-md h-fit border-gray-300 rounded-md p-10 m-2">
        <p>Enter the code sent to {pendingPhone || "your phone"}.</p>
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
          className="w-56 h-14 text-center text-xl font-semibold rounded-md border-2 border-neutral-300 focus:border-emerald-600 outline-none"
        />
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}

        <button
          type="submit"
          className="bg-blue-700 text-white p-2 rounded-md mt-2"
        >
          Submit
        </button>
      </form>
    </div>
  );
}

export default Verify;