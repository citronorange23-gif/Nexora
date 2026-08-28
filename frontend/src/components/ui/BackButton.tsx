import Link from "next/link";
import { ReactNode } from "react";

interface BackButtonProps {
  href: string;
  children?: ReactNode;
}

export default function BackButton({
  href,
  children = "Retour",
}: BackButtonProps) {
  return (
    <Link
      href={href}
      className="mb-6 inline-flex items-center rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white"
    >
      <span aria-hidden="true" className="mr-2">
        ←
      </span>
      {children}
    </Link>
  );
}