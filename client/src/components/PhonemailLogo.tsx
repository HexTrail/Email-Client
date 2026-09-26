import "./PhonemailLogo.css";

type PhonemailLogoProps = {
  showName?: boolean;
  className?: string;
};

export default function PhonemailLogo({ showName = true, className = "" }: PhonemailLogoProps) {
  return (
    <div className={`phonemail-logo${className ? ` ${className}` : ""}`}>
      <span className="phonemail-logo-mark" aria-hidden="true">p</span>
      {showName && <span className="phonemail-logo-name">phonemail</span>}
    </div>
  );
}