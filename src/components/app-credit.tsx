export function AppCredit({
  className = "text-xs",
  variant = "light",
}: {
  className?: string;
  variant?: "light" | "dark";
}) {
  return (
    <p className={className}>
      <span className="font-serif italic text-brand-400">Nardi</span>{" "}
      <span className={`font-serif ${variant === "dark" ? "text-white/80" : "text-neutral-800"}`}>
        Creates
      </span>
    </p>
  );
}
