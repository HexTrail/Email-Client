import { useState, useRef } from "react";
import PhoneMailIcon from "../components/Logo.tsx";
import axios from "axios";
import { useNavigate } from "react-router-dom";

//Typescript declaration for process.env.DEFAULT_OTP, since Vite doesn't automatically provide types for environment variables
declare const process: {
  env: {
    DEFAULT_OTP?: string;
  };
};
const OTP_LENGTH = 6;

function Verify() {
  const defaultOtp = process.env.DEFAULT_OTP;
  const [digits, setDigits] = useState(() =>
    defaultOtp && new RegExp(`^\\d{${OTP_LENGTH}}$`).test(defaultOtp)
      ? [...defaultOtp]
      : Array(OTP_LENGTH).fill("")
  );
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  const navigate = useNavigate();

  const handleChange = (index: number, value: string) => {
    if (!/^[0-9]?$/.test(value)) return; // only allow a single digit
    const next = [...digits];
    next[index] = value;
    setDigits(next);

    // move to next box automatically
    if (value && index < OTP_LENGTH - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  async function sendData(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    const otp = digits.join(""); // <-- this was missing: build the otp string from the boxes

    if (otp.length !== OTP_LENGTH) return; // don't submit an incomplete code

    try {
      await axios.post("/api/auth/verify-otp", { otp });
      navigate("/home");
    } catch (error) {
      console.error(error);
      alert("The verification code could not be verified.");
    }
  }

  return (
    <div className="flex flex-col items-center justify-center h-screen w-screen gap-2">
      <PhoneMailIcon />
      <h1 className="text-3xl font-bold mb-2">Verify OTP</h1>

      <form className="flex flex-col items-center justify-center gap-4 max-h-[80vh] max-w-full border w-md h-fit border-gray-300 rounded-md p-10 m-2">
        <div className="flex gap-2 justify-center">
          {digits.map((digit, i) => (
            <input
              key={i}
              ref={(el) => {
                inputsRef.current[i] = el;
              }}
              value={digit}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              maxLength={1}
              inputMode="numeric"
              className="w-12 h-14 text-center text-xl font-semibold rounded-lg border-2 border-neutral-300 focus:border-emerald-600 outline-none"
            />
          ))}
        </div>

        <button
          type="submit"
          className="bg-blue-700 text-white p-2 rounded-md mt-2"
          onClick={(e) => sendData(e)}
        >
          Submit
        </button>
      </form>
    </div>
  );
}

export default Verify;