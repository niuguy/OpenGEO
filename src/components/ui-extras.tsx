export function ProgressBar({
  value,
  className = "",
}: {
  value: number;
  className?: string;
}) {
  return (
    <div
      className={`h-1.5 w-full overflow-hidden rounded-full bg-panel ${className}`}
    >
      <div
        className="h-full bg-accent transition-all duration-500 ease-out"
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

export function InfoIcon({ title }: { title: string }) {
  return (
    <span
      className="ml-1.5 inline-flex h-3.5 w-3.5 cursor-help items-center justify-center rounded-full border border-muted text-[10px] font-bold text-muted hover:border-accent hover:text-accent"
      title={title}
    >
      ?
    </span>
  );
}

export function Badge({
  children,
  variant = "default",
  className = "",
}: {
  children: React.ReactNode;
  variant?: "default" | "accent";
  className?: string;
}) {
  const styles = {
    default: "bg-panel text-muted border-line",
    accent: "bg-accent/10 text-accent border-accent/20",
  };
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${styles[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
