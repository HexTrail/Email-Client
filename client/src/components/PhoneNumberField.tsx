// Provides a reusable phone-number input.
// Provides a reusable phone-number input.
type PhoneNumberFieldProps = {
  phoneNumber: string;
  onPhoneNumberChange: (phoneNumber: string) => void;
  id: string;
};

function PhoneNumberField({
  phoneNumber,
  onPhoneNumberChange,
  id,
}: PhoneNumberFieldProps) {
  return (
    <div className="auth-phone-control">
      <input
        id={id}
        type="tel"
        value={phoneNumber}
        onChange={(event) => onPhoneNumberChange(event.target.value.replace(/\D/g, ""))}
        placeholder="Phone number"
        autoComplete="tel-national"
        inputMode="numeric"
        maxLength={10}
        className="auth-input"
        required
      />
    </div>
  );
}

export default PhoneNumberField;