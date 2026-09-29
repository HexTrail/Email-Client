// Provides a reusable country-code and phone-number input.
// Provides a reusable country-code and phone-number input.
type PhoneNumberFieldProps = {
  countryCode: string;
  phoneNumber: string;
  onCountryCodeChange: (countryCode: string) => void;
  onPhoneNumberChange: (phoneNumber: string) => void;
  id: string;
};

const countryCodes = [
  ["+91", "India"],
  ["+1", "United States / Canada"],
  ["+44", "United Kingdom"],
  ["+61", "Australia"],
  ["+64", "New Zealand"],
  ["+971", "United Arab Emirates"],
  ["+966", "Saudi Arabia"],
  ["+65", "Singapore"],
  ["+60", "Malaysia"],
  ["+62", "Indonesia"],
  ["+63", "Philippines"],
  ["+92", "Pakistan"],
  ["+880", "Bangladesh"],
  ["+94", "Sri Lanka"],
  ["+977", "Nepal"],
  ["+86", "China"],
  ["+81", "Japan"],
  ["+82", "South Korea"],
  ["+49", "Germany"],
  ["+33", "France"],
  ["+39", "Italy"],
  ["+34", "Spain"],
  ["+31", "Netherlands"],
  ["+41", "Switzerland"],
  ["+46", "Sweden"],
  ["+47", "Norway"],
  ["+45", "Denmark"],
  ["+27", "South Africa"],
  ["+55", "Brazil"],
  ["+52", "Mexico"],
  ["+234", "Nigeria"],
  ["+254", "Kenya"],
] as const;

function PhoneNumberField({
  countryCode,
  phoneNumber,
  onCountryCodeChange,
  onPhoneNumberChange,
  id,
}: PhoneNumberFieldProps) {
  return (
    <div className="auth-phone-control">
      <select
        aria-label="Country code"
        className="auth-input auth-country-code"
        value={countryCode}
        onChange={(event) => onCountryCodeChange(event.target.value)}
      >
        {countryCodes.map(([code, country]) => (
          <option key={code} value={code}>{`${country} (${code})`}</option>
        ))}
      </select>
      <input
        id={id}
        type="tel"
        value={phoneNumber}
        onChange={(event) => onPhoneNumberChange(event.target.value.replace(/\D/g, ""))}
        placeholder="Phone number"
        autoComplete="tel-national"
        inputMode="numeric"
        maxLength={15}
        className="auth-input"
        required
      />
    </div>
  );
}

export default PhoneNumberField;