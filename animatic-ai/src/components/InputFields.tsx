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
      <label className="text-[11px] font-bold text-[var(--text-secondary)] 
                        uppercase tracking-[0.8px]">
        {label}
      </label>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full px-4 py-3 bg-[var(--surface2)] 
                   border border-[var(--border)] rounded-xl
                   text-[var(--text)] text-sm outline-none
                   transition-all focus:border-[var(--accent)]
                   placeholder:text-[var(--text-secondary)]"
      />
    </div>
  )
}

export default InputField