import { FiSmartphone } from "react-icons/fi";
import { BsEnvelopeFill } from "react-icons/bs";

export default function PhoneMailIcon(props: {
  className?: string;
  PhoneSize?: number;
  MailSize?: number;
  MailClassName?: string;
}) {
  return (
    <div className={`relative w-12 h-fit p-2 ${props.className}`}>
      <FiSmartphone
        className={`absolute left-0 top-0 z-0 ${props.className}`}
        size={props.PhoneSize || 60}
      />

      <BsEnvelopeFill
        className={`absolute right-1/4 bottom-1/4 z-10 ${props.MailClassName}`}
        size={props.MailSize || 28}
      />
    </div>
  );
}