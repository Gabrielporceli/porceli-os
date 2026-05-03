export function PageLoader() {
  return (
    <div className="flex items-center justify-center h-[70vh]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 rounded-full border-2 border-white/10 border-t-purple-500 animate-spin" />
        <p className="text-white/40 text-sm tracking-wide">Carregando dados...</p>
      </div>
    </div>
  );
}
