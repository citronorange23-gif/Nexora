"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import BackButton from "@/components/ui/BackButton";
import { apiFetch } from "@/lib/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const TYPES = [
  ["CONTRACT", "Contrat"], ["QUOTE", "Devis"], ["INVOICE", "Facture"],
  ["RECEIPT", "Reçu"], ["CREDIT_NOTE", "Avoir"], ["OTHER", "Autre"],
] as const;

type Customer = { id: string; firstName: string | null; lastName: string | null; email: string | null };
type DocumentItem = {
  id: string; name: string; type: string; description: string | null; folder: string | null;
  originalName: string; mimeType: string; size: number; createdAt: string;
  customer: Customer | null;
};

function customerName(customer: Customer | null) {
  if (!customer) return "Aucun client";
  return [customer.firstName, customer.lastName].filter(Boolean).join(" ").trim() || customer.email || "Client";
}
function typeName(type: string) { return TYPES.find(([value]) => value === type)?.[1] ?? "Autre"; }
function fileSize(size: number) {
  if (size < 1024) return `${size} o`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} Ko`;
  return `${(size / 1024 / 1024).toFixed(1)} Mo`;
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({ name: "", type: "OTHER", description: "", folder: "", customerId: "" });
  const [file, setFile] = useState<File | null>(null);

  async function load() {
    try {
      setLoading(true); setError("");
      const response = await apiFetch<{ success: boolean; data: DocumentItem[] }>("/api/documents");
      setDocuments(response.data);
    } catch (err) { setError(err instanceof Error ? err.message : "Impossible de récupérer les documents."); }
    finally { setLoading(false); }
  }

  useEffect(() => {
    load();
    apiFetch<{ success: boolean; data: Customer[] }>("/api/customers").then((response) => setCustomers(response.data)).catch(() => undefined);
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return documents.filter((item) => {
      if (filterType && item.type !== filterType) return false;
      if (!q) return true;
      return [item.name, item.originalName, item.description, item.folder, customerName(item.customer)]
        .filter(Boolean).some((value) => value!.toLowerCase().includes(q));
    });
  }, [documents, search, filterType]);

  function closeModal() {
    if (uploading) return;
    setShowAdd(false); setForm({ name: "", type: "OTHER", description: "", folder: "", customerId: "" });
    setFile(null); if (fileRef.current) fileRef.current.value = "";
  }

  async function upload(event: React.FormEvent) {
    event.preventDefault();
    if (!file) return setError("Sélectionne un fichier.");
    if (file.size > 10 * 1024 * 1024) return setError("Le fichier ne peut pas dépasser 10 Mo.");
    try {
      setUploading(true); setError("");
      const token = localStorage.getItem("nexora_token");
      const params = new URLSearchParams({ name: form.name, type: form.type, originalName: file.name });
      if (form.description.trim()) params.set("description", form.description.trim());
      if (form.folder.trim()) params.set("folder", form.folder.trim());
      if (form.customerId) params.set("customerId", form.customerId);
      const response = await fetch(`${API_URL}/api/documents?${params}`, {
        method: "POST", body: file,
        headers: { "Content-Type": file.type, ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error ?? "Impossible d'ajouter le document.");
      setDocuments((current) => [data.data, ...current]); closeModal();
    } catch (err) { setError(err instanceof Error ? err.message : "Impossible d'ajouter le document."); }
    finally { setUploading(false); }
  }

  async function openFile(item: DocumentItem) {
    try {
      const token = localStorage.getItem("nexora_token");
      const response = await fetch(`${API_URL}/api/documents/${item.id}/file`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      if (!response.ok) throw new Error("Impossible d'ouvrir le document.");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = window.document.createElement("a");
      anchor.href = url; anchor.download = item.originalName; anchor.click();
      URL.revokeObjectURL(url);
    } catch (err) { setError(err instanceof Error ? err.message : "Impossible d'ouvrir le document."); }
  }

  async function remove(id: string) {
    try {
      setDeletingId(id); setError("");
      await apiFetch(`/api/documents/${id}`, { method: "DELETE" });
      setDocuments((current) => current.filter((item) => item.id !== id));
    } catch (err) { setError(err instanceof Error ? err.message : "Impossible de supprimer le document."); }
    finally { setDeletingId(null); }
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto w-full max-w-7xl">
        <BackButton href="/dashboard">Retour au tableau de bord</BackButton>
        <div className="mb-8 mt-6 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div><p className="mb-1 text-sm font-medium text-slate-500">DOCUMENTS</p><h1 className="text-3xl font-bold">Documents</h1><p className="mt-2 text-slate-400">Centralisez vos fichiers importants au même endroit.</p></div>
          <button onClick={() => setShowAdd(true)} className="rounded-xl bg-white px-5 py-3 font-semibold text-slate-950 hover:bg-slate-200">+ Ajouter un document</button>
        </div>
        {error && <div className="mb-6 rounded-xl border border-red-900 bg-red-950/40 px-4 py-3 text-sm text-red-400">{error}</div>}
        <div className="mb-6 grid gap-3 md:grid-cols-[1fr_220px]">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher un document..." className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 outline-none placeholder:text-slate-600 focus:border-white" />
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 outline-none focus:border-white"><option value="">Tous les types</option>{TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
        </div>
        <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
          {loading ? <div className="py-20 text-center text-slate-400">Chargement de vos documents...</div> : filtered.length === 0 ? <div className="px-6 py-20 text-center"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-800 text-2xl">📄</div><h2 className="mt-5 font-semibold">Aucun document</h2><p className="mt-2 text-sm text-slate-400">Ajoutez un fichier pour commencer.</p></div> : <div className="divide-y divide-slate-800">{filtered.map((item) => <div key={item.id} className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between hover:bg-slate-950/40"><div className="flex min-w-0 items-center gap-4"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-800">📄</div><div className="min-w-0"><p className="truncate font-semibold">{item.name}</p><p className="mt-1 truncate text-sm text-slate-500">{item.originalName} · {fileSize(item.size)}</p><p className="mt-1 text-xs text-slate-600">{typeName(item.type)} · {customerName(item.customer)} · {new Date(item.createdAt).toLocaleDateString("fr-CA")}</p></div></div><div className="flex gap-2"><button onClick={() => openFile(item)} className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-white">Ouvrir</button><button onClick={() => remove(item.id)} disabled={deletingId === item.id} className="rounded-lg border border-red-900/70 px-3 py-2 text-sm text-red-400 hover:bg-red-950/50 disabled:opacity-50">{deletingId === item.id ? "..." : "Supprimer"}</button></div></div>)}</div>}
        </div>

        {showAdd && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"><div className="w-full max-w-2xl rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl"><div className="mb-6 flex justify-between"><div><h2 className="text-xl font-bold">Ajouter un document</h2><p className="mt-1 text-sm text-slate-400">Ajoutez un fichier et associez-le à un client.</p></div><button onClick={closeModal} className="text-2xl text-slate-500 hover:text-white">×</button></div><form onSubmit={upload} className="space-y-4">
          <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nom du document" className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-white" />
          <div className="grid gap-4 md:grid-cols-2"><select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-white">{TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><select value={form.customerId} onChange={(e) => setForm({ ...form, customerId: e.target.value })} className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-white"><option value="">Aucun client</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customerName(customer)}</option>)}</select></div>
          <input value={form.folder} onChange={(e) => setForm({ ...form, folder: e.target.value })} placeholder="Dossier (optionnel)" className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-white" />
          <textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Description (optionnelle)" className="w-full resize-none rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-white" />
          <input ref={fileRef} required type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-slate-800 file:px-3 file:py-2 file:text-white" /><p className="text-xs text-slate-600">PDF, PNG, JPG, DOC, DOCX, XLS, XLSX ou CSV · 10 Mo max.</p>
          <div className="flex justify-end gap-3"><button type="button" onClick={closeModal} className="rounded-xl border border-slate-700 px-5 py-3 text-slate-300 hover:bg-slate-800">Annuler</button><button disabled={uploading} className="rounded-xl bg-white px-5 py-3 font-semibold text-slate-950 disabled:opacity-50">{uploading ? "Ajout..." : "Ajouter le document"}</button></div>
        </form></div></div>}
      </div>
    </main>
  );
}
