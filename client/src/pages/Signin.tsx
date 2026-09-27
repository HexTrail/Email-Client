import { useState } from "react";
import PhoneMailIcon from "../components/Logo.tsx";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../Context/AuthContext.tsx";

function Signin() {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const { signIn } = useAuth();
  const navigate = useNavigate();
  async function sendData(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    if (!/^\+[1-9]\d{7,14}$/.test(phone)) {
      setError("Enter your phone number with country code, e.g. +15551234567.");
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
    <>
      <div className="flex flex-col items-center justify-center h-screen w-screen gap-2">
        <PhoneMailIcon />
        <h1 className="text-3xl font-semibold">Sign in or create an account</h1>
        <form onSubmit={sendData} className="flex flex-col items-center justify-center gap-4 max-h-[80vh] max-w-full border w-md h-fit border-gray-300 rounded-md p-10 m-2">
          <div className="flex flex-col items-center justify-center gap-2 w-full h-fit">
            <label htmlFor="phone">
              Phone Number:{" "}
            </label>
            <input
              type="text"
              id="phone"
              name="phone"
              placeholder="+15551234567"
              autoComplete="tel"
              className="border-2 border-gray-400 rounded-md p-2 max-w-full min-w-9/12"
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          <div className="flex flex-col items-center justify-center gap-2 w-full h-fit">
            <label htmlFor="username">
              Username:{" "}
            </label>
            <input
              type="text"
              id="username"
              name="username"
              placeholder="Username"
              className="border-2 border-gray-400 rounded-md p-2 max-w-full min-w-9/12"
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
          <div className="flex flex-col items-center justify-center gap-2 w-full h-fit">
            <label htmlFor="password">
              Password:{" "}
            </label>
            <input
              type="password"
              id="password"
              name="password"
              placeholder="Password"
              className="border-2 border-gray-400 rounded-md p-2 max-w-full min-w-9/12"
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
          <button
            type="submit"
            className="bg-blue-700 text-white p-2 rounded-md mt-2 cursor-pointer hover:bg-blue-800"
          >
            Continue
          </button>

        </form>
      </div>
    </>
  );
}

export default Signin;
