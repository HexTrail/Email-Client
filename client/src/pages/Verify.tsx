import { useState } from "react";
import PhoneMailIcon from "../components/Logo.tsx";
import axios from "axios";
import { useNavigate } from "react-router-dom";

function Verify() {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");

  const navigate = useNavigate();
  function sendData(e: React.MouseEvent<HTMLButtonElement, MouseEvent>) {
    e.preventDefault();
    axios.post("/api/verify", {
      phone,
      password,
    });
  }
  return (
    <>
      <div className="flex flex-col items-center justify-center h-screen w-screen gap-2">
        <PhoneMailIcon />
        <h1 className="text-3xl font-bold mb-2">Verify OTP</h1>

        <form>
          <button
            type="submit"
            className="bg-blue-700 text-white p-2 rounded-md mt-2"
            onClick={(e) => sendData(e)}
          >
            Submit
          </button>
        </form>
      </div>
    </>
  );
}

export default Verify;
