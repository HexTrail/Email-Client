import { useState } from "react";
import PhoneMailIcon from "../components/Logo.tsx";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../Context/AuthContext.tsx";

function Signin() {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const { signIn } = useAuth();
  const navigate = useNavigate();
  async function sendData(e: React.MouseEvent<HTMLButtonElement, MouseEvent>) {
    e.preventDefault();
    if (phone.length !== 10) {
      alert("Please enter a valid phone number");
      return;
    }
    if (password.length < 8) {
      alert("Please enter a valid password (at least 8 characters)");
      return;
    }
    try {
      await signIn(phone, username, password);
      navigate("/verify");
    } catch (error) {
      console.error(error);
    }
  }
  return (
    <>
      <div className="flex flex-col items-center justify-center h-screen w-screen gap-2">
        <PhoneMailIcon />
        <h1 className="text-3xl font-semibold">Signin</h1>
        <form className="flex flex-col items-center justify-center gap-4 max-h-[80vh] max-w-full border w-md h-fit border-gray-300 rounded-md p-10 m-2">
          <div className="flex flex-col items-center justify-center gap-2 w-full h-fit">
            <label htmlFor="phone">
              Phone Number:{" "}
            </label>
            <input
              type="text"
              id="phone"
              name="phone"
              placeholder="Phone Number"
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
          
          <button
            type="submit"
            className="bg-blue-700 text-white p-2 rounded-md mt-2 cursor-pointer hover:bg-blue-800"
            onClick={(e) => sendData(e)}
          >
            Submit
          </button>

        </form>
      </div>
    </>
  );
}

export default Signin;
