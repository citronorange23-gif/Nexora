import Link from "next/link";

type CardProps = {
  children: React.ReactNode;
  className?: string;

  href?: string;

  showAddButton?: boolean;
  addButtonText?: string;
  addButtonHref?: string;

  clickable?: boolean;
};

export default function Card({
  children,
  className = "",
  href,
  showAddButton = true,
  addButtonText = "Ajouter",
  addButtonHref,
  clickable = false,
}: CardProps) {
  const content = (
    <>
      {children}

      {(href || (showAddButton && addButtonHref)) && (
        <div className="mt-5 flex gap-2">
          {/* OUVRIR : toujours affiché si href existe */}
          {href && (
            <Link
              href={href}
              className={`rounded-lg bg-white px-3 py-2.5 text-center text-sm font-semibold text-slate-950 transition hover:bg-slate-200 ${
                showAddButton && addButtonHref
                  ? "flex-1"
                  : "w-full"
              }`}
            >
              Ouvrir
            </Link>
          )}

          {/* AJOUTER : affiché seulement si activé */}
          {showAddButton && addButtonHref && (
            <Link
              href={addButtonHref}
              className="rounded-lg border border-slate-700 px-3 py-2.5 text-sm font-semibold text-slate-300 transition hover:bg-slate-800 hover:text-white"
            >
              {addButtonText}
            </Link>
          )}
        </div>
      )}
    </>
  );

  return (
    <div
      className={`
        rounded-2xl
        border border-slate-800
        bg-slate-900
        ${
          clickable
            ? "transition hover:border-slate-700 hover:bg-slate-900/80"
            : ""
        }
        ${className}
      `}
    >
      {content}
    </div>
  );
}