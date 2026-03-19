interface InputFieldProps {
  label: string
  type: string
  placeholder: string
  value: string
  onChange: (v: string) => void
}

function InputField({ label, type, placeholder, value, onChange }: InputFieldProps) {
  return (
    <div className="flex flex-col gap-2 mb-4">
      <label className="text-[11px] font-bold text-textSecondary
                        uppercase tracking-[0.8px]">
        {label}
      </label>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full px-4 py-3 bg-surface2
                   border border-border rounded-xl
                   text-text text-sm outline-none
                   transition-all focus:border-accent
                   placeholder:text-textSecondary"
      />
    </div>
  )
}

export default InputField