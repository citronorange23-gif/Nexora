"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Permission = {
  id: string;
  module: string;
  action: string;
};

type User = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
};

type Organization = {
  id: string;
  name: string;
  role?: {
    id: string;
    name: string;
    system: boolean;
    permissions: Permission[];
  };
  business?: {
    id?: string;
    name?: string;
    type?: string;
  } | null;
};

type ModuleConfig = {
  key: string;
  label: string;
  description: string;
  icon: string;
  href: string;
};

const MODULES: ModuleConfig[] = [
  {
    key: "CRM",
    label: "Clients",
    description: "Gérez vos clients et leurs informations.",
    icon: "👥",
    href: "/dashboard/clients",
  },
  {
    key: "INVENTORY",
    label: "Stock",
    description: "Suivez vos produits et votre inventaire.",
    icon: "📦",
    href: "/dashboard/inventory",
  },
  {
    key: "PRODUCTS",
    label: "Produits",
    description: "Gérez vos produits, leurs prix et leurs informations.",
    icon: "🏷️",
    href: "/dashboard/products",
  },
  {
    key: "POS",
    label: "Caisse",
    description: "Effectuez vos ventes rapidement.",
    icon: "🧾",
    href: "/dashboard/pos",
  },
  {
    key: "SALES",
    label: "Ventes",
    description: "Suivez vos ventes et vos revenus.",
    icon: "💰",
    href: "/dashboard/sales",
  },
  {
    key: "EMPLOYEES",
    label: "Équipe",
    description: "Gérez les membres de votre équipe.",
    icon: "👤",
    href: "/dashboard/employees",
  },
  {
    key: "ROLES",
    label: "Accès",
    description: "Gérez les rôles et les autorisations.",
    icon: "🔐",
    href: "/dashboard/roles",
  },
  {
    key: "DOCUMENTS",
    label: "Documents",
    description: "Organisez vos documents importants.",
    icon: "📄",
    href: "/dashboard/documents",
  },
  {
    key: "APPOINTMENTS",
    label: "Rendez-vous",
    description: "Planifiez et gérez vos rendez-vous.",
    icon: "📅",
    href: "/dashboard/appointments",
  },
  {
    key: "FINANCE",
    label: "Finances",
    description: "Gardez un œil sur vos finances.",
    icon: "💳",
    href: "/dashboard/finance",
  },
  {
    key: "ANALYTICS",
    label: "Statistiques",
    description: "Analysez les performances de votre entreprise.",
    icon: "📊",
    href: "/dashboard/analytics",
  },
  {
    key: "AI",
    label: "Assistant IA",
    description: "Obtenez de l'aide pour gérer votre entreprise.",
    icon: "✨",
    href: "/dashboard/ai",
  },
];

const ROLE_LABELS: Record<string, string> = {
  OWNER: "Propriétaire",
  ADMIN: "Administrateur",
  MANAGER: "Gestionnaire",
  EMPLOYEE: "Employé",
};

function getRoleLabel(role?: string) {
  if (!role) {
    return "Membre";
  }

  return ROLE_LABELS[role] ?? role;
}

function getInitials(
  firstName?: string | null,
  lastName?: string | null,
) {
  const first = firstName?.charAt(0) ?? "";
  const last = lastName?.charAt(0) ?? "";

  const initials = `${first}${last}`.trim();

  return initials || "N";
}

function hasPermission(
  permissions: Permission[],
  module: string,
  action: string,
) {
  return permissions.some(
    (permission) =>
      permission.module === module &&
      permission.action === action,
  );
}

export default function DashboardPage() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [organization, setOrganization] =
    useState<Organization | null>(null);

  const [sidebarOpen, setSidebarOpen] =
    useState(false);

  useEffect(() => {
    const token =
      localStorage.getItem("nexora_token");

    const storedUser =
      localStorage.getItem("nexora_user");

    const storedOrganization =
      localStorage.getItem(
        "nexora_organization",
      );

    if (!token) {
      router.replace("/login");
      return;
    }

    try {
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }

      if (storedOrganization) {
        setOrganization(
          JSON.parse(storedOrganization),
        );
      }
    } catch {
      localStorage.removeItem("nexora_user");
      localStorage.removeItem(
        "nexora_organization",
      );

      router.replace("/login");
    }
  }, [router]);

  const permissions =
    organization?.role?.permissions ?? [];
  console.log("PERMISSIONS:", permissions);

  const visibleModules = useMemo(() => {
    return MODULES.filter((module) =>
      hasPermission(
        permissions,
        module.key,
        "VIEW",
      ),
    );
  }, [permissions]);

  const firstName =
    user?.firstName || "vous";

  function handleLogout() {
    localStorage.removeItem("nexora_token");
    localStorage.removeItem("nexora_user");
    localStorage.removeItem(
      "nexora_organization",
    );

    router.replace("/login");
  }

  if (!user || !organization) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-slate-700 border-t-white" />

          <p className="text-sm text-slate-400">
            Chargement de votre espace...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Fermer le menu"
          onClick={() =>
            setSidebarOpen(false)
          }
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
        />
      )}

      <aside
        className={`
          fixed inset-y-0 left-0 z-50
          flex w-72 flex-col
          border-r border-slate-800
          bg-slate-950
          transition-transform duration-200
          lg:translate-x-0
          ${
            sidebarOpen
              ? "translate-x-0"
              : "-translate-x-full"
          }
        `}
      >
        <div className="flex h-20 items-center justify-between border-b border-slate-800 px-6">
          <Link
            href="/dashboard"
            className="text-2xl font-bold tracking-tight"
          >
            Nexora
          </Link>

          <button
            type="button"
            onClick={() =>
              setSidebarOpen(false)
            }
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white lg:hidden"
            aria-label="Fermer"
          >
            ✕
          </button>
        </div>

        <div className="border-b border-slate-800 px-5 py-5">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
            Votre entreprise
          </p>

          <p className="mt-2 truncate font-semibold text-white">
            {organization.name}
          </p>

          <p className="mt-1 text-sm text-slate-500">
            {getRoleLabel(
              organization.role?.name,
            )}
          </p>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-5">
          <p className="px-3 pb-3 text-xs font-semibold uppercase tracking-wider text-slate-600">
            Navigation
          </p>

          <Link
            href="/dashboard"
            onClick={() =>
              setSidebarOpen(false)
            }
            className="mb-1 flex items-center gap-3 rounded-xl bg-white px-3 py-3 text-sm font-semibold text-slate-950"
          >
            <span>🏠</span>
            <span>Accueil</span>
          </Link>

          {visibleModules.map((module) => (
            <Link
              key={module.key}
              href={module.href}
              onClick={() =>
                setSidebarOpen(false)
              }
              className="mb-1 flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-slate-400 transition hover:bg-slate-900 hover:text-white"
            >
              <span className="text-lg">
                {module.icon}
              </span>

              <span>{module.label}</span>
            </Link>
          ))}
        </nav>

        <div className="border-t border-slate-800 p-3">
          <Link
            href="/dashboard/settings"
            className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-slate-400 transition hover:bg-slate-900 hover:text-white"
          >
            <span>⚙️</span>
            <span>Paramètres</span>
          </Link>

          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-slate-400 transition hover:bg-red-950/40 hover:text-red-400"
          >
            <span>↪</span>
            <span>Se déconnecter</span>
          </button>
        </div>
      </aside>

      <div className="lg:pl-72">
        <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-slate-800 bg-slate-950/90 px-5 backdrop-blur sm:px-8">
          <button
            type="button"
            onClick={() =>
              setSidebarOpen(true)
            }
            className="rounded-lg border border-slate-800 p-2 text-slate-300 hover:bg-slate-900 lg:hidden"
            aria-label="Ouvrir le menu"
          >
            ☰
          </button>

          <div className="hidden lg:block">
            <p className="text-sm text-slate-500">
              Espace professionnel
            </p>
          </div>

          <div className="flex items-center gap-4">
            <button
              type="button"
              className="relative rounded-xl border border-slate-800 p-2.5 text-slate-400 transition hover:bg-slate-900 hover:text-white"
              aria-label="Notifications"
            >
              🔔
            </button>

            <div className="flex items-center gap-3 border-l border-slate-800 pl-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-sm font-bold text-slate-950">
                {getInitials(
                  user.firstName,
                  user.lastName,
                )}
              </div>

              <div className="hidden sm:block">
                <p className="text-sm font-semibold text-white">
                  {user.firstName}{" "}
                  {user.lastName}
                </p>

                <p className="text-xs text-slate-500">
                  {getRoleLabel(
                    organization.role?.name,
                  )}
                </p>
              </div>
            </div>
          </div>
        </header>

        <section className="mx-auto max-w-7xl px-5 py-8 sm:px-8">
          <div className="mb-8">
            <p className="mb-2 text-sm font-medium text-slate-500">
              Tableau de bord
            </p>

            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Bonjour, {firstName} 👋
            </h1>

            <p className="mt-2 max-w-2xl text-slate-400">
              Voici un aperçu de votre entreprise
              et des outils disponibles dans votre
              espace Nexora.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-sm text-slate-400">
                  Ventes
                </span>

                <span className="rounded-lg bg-slate-800 p-2">
                  💰
                </span>
              </div>

              <p className="text-2xl font-bold">
                —
              </p>

              <p className="mt-1 text-xs text-slate-500">
                Les données seront bientôt
                disponibles
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-sm text-slate-400">
                  Clients
                </span>

                <span className="rounded-lg bg-slate-800 p-2">
                  👥
                </span>
              </div>

              <p className="text-2xl font-bold">
                —
              </p>

              <p className="mt-1 text-xs text-slate-500">
                Les données seront bientôt
                disponibles
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-sm text-slate-400">
                  Produits
                </span>

                <span className="rounded-lg bg-slate-800 p-2">
                  📦
                </span>
              </div>

              <p className="text-2xl font-bold">
                —
              </p>

              <p className="mt-1 text-xs text-slate-500">
                Les données seront bientôt
                disponibles
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-sm text-slate-400">
                  Rendez-vous
                </span>

                <span className="rounded-lg bg-slate-800 p-2">
                  📅
                </span>
              </div>

              <p className="text-2xl font-bold">
                —
              </p>

              <p className="mt-1 text-xs text-slate-500">
                Les données seront bientôt
                disponibles
              </p>
            </div>
          </div>

          <div className="mt-10">
            <div className="mb-5 flex items-end justify-between">
              <div>
                <h2 className="text-xl font-semibold">
                  Vos outils
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Accédez rapidement aux fonctionnalités
                  disponibles pour votre entreprise.
                </p>
              </div>
            </div>

            {visibleModules.length === 0 ? (
              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center">
                <p className="text-3xl">
                  🔒
                </p>

                <h3 className="mt-4 font-semibold">
                  Aucun outil disponible
                </h3>

                <p className="mt-2 text-sm text-slate-500">
                  Votre compte ne possède actuellement
                  aucune autorisation.
                </p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {visibleModules.map(
                  (module) => {
                    const canCreate =
                      hasPermission(
                        permissions,
                        module.key,
                        "CREATE",
                      );

                    return (
                      <div
                        key={module.key}
                        className="group rounded-2xl border border-slate-800 bg-slate-900 p-5 transition hover:-translate-y-0.5 hover:border-slate-700 hover:bg-slate-900/80"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-800 text-2xl">
                            {module.icon}
                          </div>

                          <span className="text-slate-600 transition group-hover:text-slate-400">
                            →
                          </span>
                        </div>

                        <h3 className="mt-5 text-lg font-semibold">
                          {module.label}
                        </h3>

                        <p className="mt-2 min-h-10 text-sm leading-6 text-slate-500">
                          {module.description}
                        </p>

                        <div className="mt-5 flex gap-2">
                          <Link
                            href={
                              module.href
                            }
                            className="flex-1 rounded-lg bg-white px-3 py-2.5 text-center text-sm font-semibold text-slate-950 transition hover:bg-slate-200"
                          >
                            Ouvrir
                          </Link>

                          {canCreate && (
                            <Link
                              href={`${module.href}/new`}
                              className="rounded-lg border border-slate-700 px-3 py-2.5 text-sm font-semibold text-slate-300 transition hover:bg-slate-800 hover:text-white"
                            >
                              Ajouter
                            </Link>
                          )}
                        </div>
                      </div>
                    );
                  },
                )}
              </div>
            )}
          </div>

          <div className="mt-10 grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">
                    Activité récente
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Les dernières actions effectuées
                    dans votre entreprise.
                  </p>
                </div>

                <span className="rounded-lg bg-slate-800 p-2">
                  🕐
                </span>
              </div>

              <div className="mt-6 rounded-xl border border-dashed border-slate-800 px-5 py-8 text-center">
                <p className="text-sm text-slate-500">
                  Aucune activité récente.
                </p>

                <p className="mt-1 text-xs text-slate-600">
                  Vos dernières actions apparaîtront
                  ici.
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">
                    Actions rapides
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Les actions que vous utilisez le
                    plus souvent.
                  </p>
                </div>

                <span className="rounded-lg bg-slate-800 p-2">
                  ⚡
                </span>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
  {hasPermission(
    permissions,
    "CRM",
    "CREATE",
  ) && (
    <Link
      href="/dashboard/clients/new"
      className="rounded-xl border border-slate-800 bg-slate-950 p-4 transition hover:border-slate-700 hover:bg-slate-800"
    >
      <span className="text-xl">👥</span>

      <p className="mt-3 text-sm font-semibold">
        Ajouter un client
      </p>
    </Link>
  )}

    {hasPermission(
    permissions,
    "PRODUCTS",
    "CREATE",
  ) && (
    <Link
      href="/dashboard/products/new"
      className="rounded-xl border border-slate-800 bg-slate-950 p-4 transition hover:border-slate-700 hover:bg-slate-800"
    >
      <span className="text-xl">
        🏷️
      </span>

      <p className="mt-3 text-sm font-semibold">
        Ajouter un produit
      </p>
    </Link>
  )}

  {hasPermission(
    permissions,
    "APPOINTMENTS",
    "CREATE",
  ) && (
    <Link
      href="/dashboard/appointments/new"
      className="rounded-xl border border-slate-800 bg-slate-950 p-4 transition hover:border-slate-700 hover:bg-slate-800"
    >
      <span className="text-xl">📅</span>

      <p className="mt-3 text-sm font-semibold">
        Nouveau rendez-vous
      </p>
    </Link>
  )}

  {hasPermission(
    permissions,
    "POS",
    "CREATE",
  ) && (
    <Link
      href="/dashboard/pos"
      className="rounded-xl border border-slate-800 bg-slate-950 p-4 transition hover:border-slate-700 hover:bg-slate-800"
    >
      <span className="text-xl">🧾</span>

      <p className="mt-3 text-sm font-semibold">
        Ouvrir la caisse
      </p>
    </Link>
  )}
</div>
            </div>
          </div>

          <footer className="mt-12 border-t border-slate-800 py-6 text-center text-xs text-slate-600">
            Nexora · Votre entreprise, simplement.
          </footer>
        </section>
      </div>
    </main>
  );
}