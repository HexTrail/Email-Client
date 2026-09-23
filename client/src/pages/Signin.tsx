import { useState } from "react";
import TermsModal from "../components/TermsModal.tsx";

function Signin() {
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState(0);
  const [open, setOpen] = useState<boolean>(false);
  function sendData(e: React.MouseEvent<HTMLButtonElement, MouseEvent>) {
    e.preventDefault();
    if (phone.length !== 10) {
      alert("Please enter a valid phone number");
      return;
    }
    if (otp.toString().length !== 6) {
      alert("Please enter a valid OTP");
      return;
    }
  }
  return (
    <>
      <div className="flex flex-col items-center justify-center h-screen w-screen">
        <h1 className="text-3xl font-bold mb-6">Signin / Signup</h1>
        <form className="flex flex-col items-center justify-center gap-4 max-h-[80vh] max-w-full border w-md h-fit border-gray-300 rounded-md p-10 m-2">
          <div className="flex items-center justify-center gap-2 w-full h-fit flex-wrap">
            <label htmlFor="phone" className="self-start">Enter Your Phone Number: </label>
            <input
              type="text"
              id="phone"
              name="phone"
              placeholder="Phone Number"
              className="border-2 border-gray-400 rounded-md p-2 bg-slate-700 max-w-full text-white min-w-9/12"
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          <div className="m-2">
            <a href="https://www.twilio.com/console" target="_blank" className="text-blue-500 w-full m-auto">Get OTP</a>
            
          </div>
          <div className="flex flex-col items-center justify-center w-full h-fit gap-2">
            <label htmlFor="otp" >
              Enter OTP
            </label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              id="otp"
              name="otp"
              placeholder="Enter OTP"
              className="border-2 border-gray-400 rounded-md p-2 bg-slate-700 max-w-full min-w-9/12 text-white"
              onChange={(e) => setOtp(parseInt(e.target.value))}
            />
          </div>
          <button
            type="submit"
            className="bg-blue-700 text-white p-2 rounded-md m-2"
            onClick={(e) => sendData(e)}
          >
            Submit
          </button>
          <button
            type="button"
            className="text-blue-500 p-2 rounded-md m-2"
            onClick={() => setOpen(true)}
          >
            Terms of Service
          </button>
          
        </form>
      </div>
      {open && (
        <TermsModal
          onClose={() => setOpen(false)}
          onAgree={() => {
            // save acceptance, then close
            setOpen(false);
          }}
        />
      )}
    </>
  );
}

export default Signin;
