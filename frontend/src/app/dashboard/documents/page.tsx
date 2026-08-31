"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import BackButton from "@/components/ui/BackButton";
import { apiFetch } from "@/lib/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

const TYPES = [
  ["CONTRACT", "Contrat"],
  ["QUOTE", "Devis"],
  ["INVOICE", "Facture"],
  ["RECEIPT", "Reçu"],
  ["CREDIT_NOTE", "Avoir"],
  ["OTHER", "Autre"],
] as const;

type DocumentItem = {
  id: string;
  name: string;
  type: (typeof TYPES)[number][0];
  description: string | null;
  folder: string | null;
  originalName: string;
  mimeType: string;
  size: number;
  createdAt: string;
  customer: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
  } | null;
};

type Customer = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
};

function typeLabel(type: string) {
  return TYPES.find(([value]) => value === type)?.[1] ?? "Autre";
}

function customerLabel(customer: DocumentItem["customer"]) {
  if (!customer) return "Aucun client";
  const name = [customer.firstName, customer.lastName].filter(Boolean).join(" ").trim();
  return name || customer.email || "Client";
}

function formatSize(size: number) {
  if (size < 1024) return `${size} o`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} Ko`;
  return `${(size / (1024 * 1024)).toFixed(1)} Mo`;
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [type, setType] = useState("OTHER");
  const [description, setDescription] = useState("");
  const [folder, setFolder] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [file, setFile] = useState<File | null>(null);

  async function loadDocuments() {
    try {
      setLoading(true);
      setError("");
      const response = await apiFetch<{ success: boolean; data: DocumentItem[] }>("/api/documents");
      setDocuments(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de récupérer les documents.");
    } finally {
      setLoading(false);
    }
  }

  async function loadCustomers() {
    try {
      const response = await apiFetch<{ success: boolean; data: Customer[] }>("/api/customers");
      setCustomers(response.data);
    } catch {
      // Le client est optionnel : le formulaire reste utilisable sans la liste.
    }
  }

  useEffect(() => {
    loadDocuments();
    loadCustomers();
  }, []);

  const filteredDocuments = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    return documents.filter((document) => {
      if (typeFilter && document.type !== typeFilter) return false;
      if (!normalized) return true;
      return [
        document.name,
        document.originalName,
        document.description,
        document.folder,
        customerLabel(document.customer),
      ].some((value) => value?.toLowerCase().includes(normalized));
    });
  }, [documents, search, typeFilter]);

  function resetForm() {
    setName("");
    setType("OTHER");
    setDescription("");
    setFolder("");
    setCustomerId("");
    setFile(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function handleUpload(event: React.FormEvent) {
    event.preventDefault();

    if (!file) {
      setError("Sélectionne un fichier.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError("Le fichier ne peut pas dépasser 10 Mo.");
      return;
    }

    try {
      setUploading(true);
      setError("");

      const token = localStorage.getItem("nexora_token");
      const params = new URLSearchParams({ name, type });
      if (description.trim()) params.set("description", description.trim());
      if (folder.trim()) params.set("folder", folder.trim());
      if (customerId) params.set("customerId", customerId);
      params.set("originalName", file.name);

      const response = await fetch(`${API_URL}/api/documents?${params.toString()}`, {
        method: "POST",
        headers: {
          "Content-Type": file.type,
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: file,
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data?.error ?? "Impossible d'ajouter le document.");

      setDocuments((current) => [data.data, ...current]);
      resetForm();
      setShowAdd(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible d'ajouter le document.");
    } finally {
      setUploading(false);
    }
  }

  async function downloadDocument(document: DocumentItem) {
    try {
      setError("");
      const token = localStorage.getItem("nexora_token");
      const response = await fetch(`${API_URL}/api/documents/${document.id}/file`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error ?? "Impossible d'ouvrir le document.");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = document.originalName;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible d'ouvrir le document.");
    }
  }

  async function removeDocument(id: string) {
    try {
      setDeletingId(id);
      setError("");
      await apiFetch(`/api/documents/${id}`, { method: "DELETE" });
      setDocuments((current) => current.filter((document) => document.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de supprimer le document.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto w-full max-w-7xl">
        <BackButton href="/dashboard">Retour au tableau de bord</BackButton>

        <div className="mb-8 mt-6 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="mb-1 text-sm font-medium text-slate-500">DOCUMENTS</p>
            <h1 className="text-3xl font-bold tracking-tight">Documents</h1>
            <p className="mt-2 text-slate-400">Centralisez vos fichiers importants au même endroit.</p>
          </div>
          <button
            type="button"
            onClick={() => setShowAdd(true)}
            className="rounded-xl bg-white px-5 py-3 font-semibold text-slate-950 transition hover:bg-slate-200"
          >
            + Ajouter un document
          </button>
        </div>

        {error && (
          <div className="mb-6 flex items-center justify-between gap-4 rounded-xl border border-red-900 bg-red-950/40 px-4 py-3 text-sm text-red-400">
            <span>{error}</span>
            <button type="button" onClick={loadDocuments} className="font-semibold text-red-300 hover:text-white">Réessayer</button>
          </div>
        )}

        <div className="mb-6 grid gap-3 md:grid-cols-[1fr_220px]">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Rechercher un document..."
            className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-white"
          />
          <select
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value)}
            className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-white outline-none focus:border-white"
          >
            <option value="">Tous les types</option>
            {TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
          {loading ? (
            <div className="py-20 text-center text-slate-400">Chargement de vos documents...</div>
          ) : filteredDocuments.length === 0 ? (
            <div className="px-6 py-20 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-800 text-2xl">📄</div>
              <h2 className="mt-5 text-lg font-semibold">Aucun document</h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-slate-400">Ajoutez un fichier pour commencer votre espace Documents.</p>
              <button type="button" onClick={() => setShowAdd(true)} className="mt-6 rounded-xl bg-white px-5 py-3 font-semibold text-slate-950">Ajouter mon premier document</button>
            </div>
          ) : (
            <div className="divide-y divide-slate-800">
              {filteredDocuments.map((document) => (
                <div key={document.id} className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between hover:bg-slate-950/40">
                  <div className="flex min-w-0 items-center gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-800">📄</div>
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{document.name}</p>
                      <p className="mt-1 truncate text-sm text-slate-500">{document.originalName} · {formatSize(document.size)}</p>
                      <p className="mt-1 text-xs text-slate-600">{typeLabel(document.type)} · {customerLabel(document.customer)} · {new Date(document.createdAt).toLocaleDateString("fr-CA")}</p>
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button type="button" onClick={() => downloadDocument(document)} className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white">Ouvrir</button>
                    <button type="button" onClick={() => removeDocument(document.id)} disabled={deletingId === document.id} className="rounded-lg border border-red-900/70 px-3 py-2 text-sm font-medium text-red-400 hover:bg-red-950/50 disabled:opacity-50">{deletingId === document.id ? "..." : "Supprimer"}</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {showAdd && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
            <div className="w-full max-w-2xl rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
              <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold">Ajouter un document</h2>
                  <p className="mt-1 text-sm text-slate-400">Ajoutez un fichier et rattachez-le à un client si nécessaire.</p>
                </div>
                <button type="button" onClick={() => { resetForm(); setShowAdd(false); }} className="text-2xl text-slate-500 hover:text-white">×</button>
              </div>

              <form onSubmit={handleUpload} className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium">Nom du document *</label>
                  <input required value={name} onChange={(event) => setName(event.target.value)} placeholder="Contrat client" className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none placeholder:text-slate-600 focus:border-white" />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium">Type *</label>
                    <select value={type} onChange={(event) => setType(event.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-white">
                      {TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium">Client</label>
                    <select value={customerId} onChange={(event) => setCustomerId(event.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-white">
                      <option value="">Aucun client</option>
                      {customers.map((customer) => <option key={customer.id} value={customer.id}>{[customer.firstName, customer.lastName].filter(Boolean).join(" ") || customer.email || "Client"}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium">Dossier</label>
                    <input value={folder} onChange={(event) => setFolder(event.target.value)} placeholder="Clients" className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none placeholder:text-slate-600 focus:border-white" />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium">Fichier *</label>
                    <input ref={fileRef} required type="file" onChange={(event) => setFile(event.target.files?.[0] ?? null)} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-300 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-800 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white" />
                    <p className="mt-1 text-xs text-slate-600">PDF, PNG, JPG, DOC, DOCX, XLS, XLSX ou CSV · 10 Mo max.</p>
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium">Description</label>
                  <textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={3} placeholder="Informations complémentaires..." className="w-full resize-none rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none placeholder:text-slate-600 focus:border-white" />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => { resetForm(); setShowAdd(false); }} className="rounded-xl border border-slate-700 px-5 py-3 font-medium text-slate-300 hover:bg-slate-800">Annuler</button>
                  <button type="submit" disabled={uploading} className="rounded-xl bg-white px-5 py-3 font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-50">{uploading ? "Ajout..." : "Ajouter le document"}</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
