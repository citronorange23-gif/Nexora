"use client";

import { FormEvent, useState } from "react";
import { PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import type { StripePaymentElementOptions } from "@stripe/stripe-js";
import { apiFetch } from "@/lib/api";

type Props = {
  paymentIntentId: string;
  onSuccess: () => void;
  onClose: () => void;
};

export default function StripePaymentForm({ paymentIntentId, onSuccess, onClose }: Props) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const options: StripePaymentElementOptions = {
    layout: "accordion",
  };

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!stripe || !elements) return;

    setLoading(true);
    setError("");

    const result = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
    });

    if (result.error) {
      setError(result.error.message ?? "Le paiement a échoué.");
      setLoading(false);
      return;
    }

    setLoading(false);
    onSuccess();

    try {
      await apiFetch("/api/payments/confirm", {
        method: "POST",
        body: JSON.stringify({ paymentIntentId }),
      });
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de confirmer le paiement.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <PaymentElement options={options} />
      {error && (
        <div className="rounded-xl border border-red-900 bg-red-950/40 px-3 py-2 text-sm text-red-400">
          {error}
        </div>
      )}
      <div className="flex gap-3">
        <button type="button" onClick={onClose} disabled={loading} className="flex-1 rounded-xl border border-slate-700 px-4 py-3 font-semibold text-slate-200 hover:bg-slate-800 disabled:opacity-50">
          Annuler
        </button>
        <button type="submit" disabled={!stripe || !elements || loading} className="flex-1 rounded-xl bg-white px-4 py-3 font-semibold text-slate-950 hover:bg-slate-200 disabled:opacity-50">
          {loading ? "Paiement..." : "Payer maintenant"}
        </button>
      </div>
    </form>
  );
}