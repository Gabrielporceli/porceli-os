import { useState } from 'react';

/** Texto que arrasta junto com o card e só vira campo com duplo clique.
 *  Um <input> sempre visível "come" o arrasto: o card só se movia por uma
 *  borda estreita. Enter ou Esc (ou clicar fora) voltam ao texto. */
export function EditableText({
  value, placeholder, onChange, className = '', emptyClassName = 'opacity-60',
}: { value: string; placeholder: string; onChange: (v: string) => void; className?: string; emptyClassName?: string }) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <input
        autoFocus
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        onFocus={(e) => e.currentTarget.select()}
        onBlur={() => setEditing(false)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === 'Escape') e.currentTarget.blur();
        }}
        className={`nodrag nopan w-full min-w-0 bg-transparent outline-none ${className}`}
      />
    );
  }

  return (
    <div
      onDoubleClick={(e) => {
        e.stopPropagation();
        setEditing(true);
      }}
      title="Clique duas vezes para editar"
      className={`min-w-0 select-none truncate ${value ? '' : `font-medium ${emptyClassName}`} ${className}`}
    >
      {value || placeholder}
    </div>
  );
}
