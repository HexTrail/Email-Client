// Renders the compact PhoneMail icon used by the client.
// Renders the compact PhoneMail icon used by the client.
import { FiSmartphone } from "react-icons/fi";
import { BsEnvelopeFill } from "react-icons/bs";

export default function PhoneMailIcon(props: {
  className?: string;
  PhoneSize?: number;
  MailSize?: number;
  MailClassName?: string;
}) {
  return (
    <div className={`relative block min-h-12 w-12 m-2 ${props.className}`}>
      <FiSmartphone
        className={`absolute left-0 top-0 h-16 ${props.className}`}
        size={props.PhoneSize || 40}
      />

      <BsEnvelopeFill
        className={`absolute right-1/4 bottom-0 z-10 ${props.MailClassName}`}
        size={props.MailSize || 24}
        color="blue"
      />
    </div>
  );
}