"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { apiFetch } from "@/lib/api";

const businessTypes = [
  { value: "RETAIL", label: "Commerce" },
  { value: "RESTAURANT", label: "Restaurant" },
  { value: "SALON", label: "Salon" },
  { value: "BARBERSHOP", label: "Barbershop" },
  { value: "GARAGE", label: "Garage" },
  { value: "REAL_ESTATE", label: "Immobilier" },
  { value: "GYM", label: "Salle de sport" },
  { value: "CLINIC", label: "Clinique" },
  { value: "FREELANCER", label: "Freelance" },
  { value: "OTHER", label: "Autre" },
];

interface RegisterResponse {
  success: boolean;

  data?: {
    token: string;

    user: {
      id: string;
      email: string;
      firstName: string | null;
      lastName: string | null;
    };

    organization: {
      id: string;
      name: string;
    };

    role: {
      id: string;
      name: string;
    };
  };

  error?: string;
}

export default function RegisterPage() {
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",

    businessName: "",
    businessType: "RETAIL",

    phone: "",
    businessEmail: "",
    address: "",
    city: "",
    province: "",
    postalCode: "",
  });

  function updateField(
    field: keyof typeof form,
    value: string,
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function handleNext() {
    setError("");

    if (!form.firstName.trim()) {
      setError("Le prénom est requis.");
      return;
    }

    if (!form.lastName.trim()) {
      setError("Le nom est requis.");
      return;
    }

    if (!form.email.trim()) {
      setError("L'email est requis.");
      return;
    }

    if (form.password.length < 8) {
      setError(
        "Le mot de passe doit contenir au moins 8 caractères.",
      );
      return;
    }

    setStep(2);
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setError("");
    setLoading(true);

    try {
      const response =
        await apiFetch<RegisterResponse>(
          "/api/auth/register",
          {
            method: "POST",
            body: JSON.stringify({
              firstName: form.firstName.trim(),
              lastName: form.lastName.trim(),
              email: form.email.trim().toLowerCase(),
              password: form.password,

              businessName:
                form.businessName.trim(),

              businessType:
                form.businessType,

              phone:
                form.phone.trim() || undefined,

              businessEmail:
                form.businessEmail.trim() ||
                undefined,

              address:
                form.address.trim() || undefined,

              city:
                form.city.trim() || undefined,

              province:
                form.province.trim() || undefined,

              postalCode:
                form.postalCode.trim() ||
                undefined,
            }),
          },
        );

      if (!response.data?.token) {
        throw new Error(
            "Token de connexion manquant",
        );
        }

        localStorage.setItem(
        "nexora_token",
        response.data.token,
        );

        localStorage.setItem(
        "nexora_user",
        JSON.stringify(response.data.user),
        );

        localStorage.setItem(
        "nexora_organization",
        JSON.stringify(
            response.data.organization,
        ),
        );

        router.push("/dashboard");
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Impossible de créer le compte.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10">
      <div className="mx-auto w-full max-w-2xl">
        <div className="mb-8 text-center">
          <Link
            href="/login"
            className="text-3xl font-bold tracking-tight text-white"
          >
            Nexora
          </Link>

          <p className="mt-2 text-slate-400">
            Créez votre espace professionnel.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-2xl">
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-semibold text-white">
                  {step === 1
                    ? "Créer votre compte"
                    : "Votre entreprise"}
                </h1>

                <p className="mt-1 text-sm text-slate-400">
                  Étape {step} sur 2
                </p>
              </div>

              <div className="text-sm font-medium text-slate-500">
                {step === 1 ? "Compte" : "Business"}
              </div>
            </div>

            <div className="mt-5 h-1 overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full rounded-full bg-white transition-all"
                style={{
                  width:
                    step === 1
                      ? "50%"
                      : "100%",
                }}
              />
            </div>
          </div>

          {error && (
            <div className="mb-6 rounded-lg border border-red-900 bg-red-950/40 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          {step === 1 ? (
            <div className="space-y-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">
                    Prénom
                  </label>

                  <input
                    value={form.firstName}
                    onChange={(event) =>
                      updateField(
                        "firstName",
                        event.target.value,
                      )
                    }
                    placeholder="Votre prénom"
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-white"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">
                    Nom
                  </label>

                  <input
                    value={form.lastName}
                    onChange={(event) =>
                      updateField(
                        "lastName",
                        event.target.value,
                      )
                    }
                    placeholder="Votre nom"
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-white"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Email
                </label>

                <input
                  type="email"
                  autoComplete="email"
                  value={form.email}
                  onChange={(event) =>
                    updateField(
                      "email",
                      event.target.value,
                    )
                  }
                  placeholder="compte@exemple.com"
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-white"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Mot de passe
                </label>

                <input
                  type="password"
                  autoComplete="new-password"
                  value={form.password}
                  onChange={(event) =>
                    updateField(
                      "password",
                      event.target.value,
                    )
                  }
                  placeholder="Minimum 8 caractères"
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-white"
                />
              </div>

              <button
                type="button"
                onClick={handleNext}
                className="w-full rounded-lg bg-white px-4 py-3 font-semibold text-slate-950 transition hover:bg-slate-200"
              >
                Continuer
              </button>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="space-y-5"
            >
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Nom de l'entreprise
                </label>

                <input
                  value={form.businessName}
                  onChange={(event) =>
                    updateField(
                      "businessName",
                      event.target.value,
                    )
                  }
                  placeholder="Mon entreprise"
                  required
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-white"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Type d'entreprise
                </label>

                <select
                  value={form.businessType}
                  onChange={(event) =>
                    updateField(
                      "businessType",
                      event.target.value,
                    )
                  }
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-white"
                >
                  {businessTypes.map(
                    (type) => (
                      <option
                        key={type.value}
                        value={type.value}
                      >
                        {type.label}
                      </option>
                    ),
                  )}
                </select>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">
                    Téléphone
                  </label>

                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(event) =>
                      updateField(
                        "phone",
                        event.target.value,
                      )
                    }
                    placeholder="514 555-0123"
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-white"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">
                    Email professionnel
                  </label>

                  <input
                    type="email"
                    value={form.businessEmail}
                    onChange={(event) =>
                      updateField(
                        "businessEmail",
                        event.target.value,
                      )
                    }
                    placeholder="contact@entreprise.com"
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-white"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Adresse
                </label>

                <input
                  value={form.address}
                  onChange={(event) =>
                    updateField(
                      "address",
                      event.target.value,
                    )
                  }
                  placeholder="123 rue Exemple"
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-white"
                />
              </div>

              <div className="grid gap-5 sm:grid-cols-3">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">
                    Ville
                  </label>

                  <input
                    value={form.city}
                    onChange={(event) =>
                      updateField(
                        "city",
                        event.target.value,
                      )
                    }
                    placeholder="Montréal"
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-white"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">
                    Province
                  </label>

                  <input
                    value={form.province}
                    onChange={(event) =>
                      updateField(
                        "province",
                        event.target.value,
                      )
                    }
                    placeholder="QC"
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-white"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">
                    Code postal
                  </label>

                  <input
                    value={form.postalCode}
                    onChange={(event) =>
                      updateField(
                        "postalCode",
                        event.target.value,
                      )
                    }
                    placeholder="H1H 1H1"
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-white"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setError("");
                    setStep(1);
                  }}
                  className="flex-1 rounded-lg border border-slate-700 px-4 py-3 font-semibold text-slate-300 transition hover:bg-slate-800"
                >
                  Retour
                </button>

                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 rounded-lg bg-white px-4 py-3 font-semibold text-slate-950 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading
                    ? "Création..."
                    : "Créer mon compte"}
                </button>
              </div>
            </form>
          )}

          <p className="mt-6 text-center text-sm text-slate-500">
            Déjà un compte ?{" "}
            <Link
              href="/login"
              className="font-medium text-white hover:underline"
            >
              Se connecter
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}