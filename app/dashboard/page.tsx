"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Entry = {
  id: string;
  productName: string;
  price: number;
  city: string;
  note: string | null;
  capturedAt: string;
};

type ComparedProduct = {
  name: string;
  poa: number | null;
  campobom: number | null;
  poaDate: string | null;
  campobomDate: string | null;
};

function formatCurrency(value: number | null): string {
  if (value === null) return "—";
  return `R$ ${value.toFixed(2).replace(".", ",")}`;
}

function formatProductName(name: string): string {
  return name.charAt(0).toUpperCase() + name.slice(1);
}

function getDiff(poa: number | null, campobom: number | null) {
  if (!poa || !campobom) return null;
  const diff = ((campobom - poa) / poa) * 100;
  return diff;
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"compare" | "history">("compare");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchEntries = useCallback(async () => {
    const res = await fetch("/api/prices");
    if (res.ok) setEntries(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated") fetchEntries();
  }, [status, router, fetchEntries]);

  async function handleDelete(id: string) {
    await fetch(`/api/prices/${id}`, { method: "DELETE" });
    setEntries((prev) => prev.filter((e) => e.id !== id));
    setDeleteId(null);
  }

  const compared: ComparedProduct[] = (() => {
    const map = new Map<string, ComparedProduct>();
    for (const e of entries) {
      const existing = map.get(e.productName) ?? {
        name: e.productName,
        poa: null,
        campobom: null,
        poaDate: null,
        campobomDate: null,
      };
      if (e.city === "poa" && !existing.poa) {
        existing.poa = e.price;
        existing.poaDate = e.capturedAt;
      }
      if (e.city === "campobom" && !existing.campobom) {
        existing.campobom = e.price;
        existing.campobomDate = e.capturedAt;
      }
      map.set(e.productName, existing);
    }
    return Array.from(map.values()).sort((a, b) => {
      const da = Math.abs(getDiff(a.poa, a.campobom) ?? 0);
      const db = Math.abs(getDiff(b.poa, b.campobom) ?? 0);
      return db - da;
    });
  })();

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-400 text-center">
          <div className="text-4xl mb-3 animate-pulse">🛒</div>
          <p>Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div>
          <h1 className="text-lg font-bold text-gray-900">Comparador 🛒</h1>
          <p className="text-xs text-gray-400">Olá, {session?.user?.name}</p>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="text-gray-400 hover:text-gray-600 text-sm transition-colors"
        >
          Sair
        </button>
      </div>

      {/* Tabs */}
      <div className="flex bg-white border-b border-gray-100 px-4">
        <button
          onClick={() => setView("compare")}
          className={`flex-1 py-3 text-sm font-medium transition-colors border-b-2 ${
            view === "compare"
              ? "border-emerald-500 text-emerald-600"
              : "border-transparent text-gray-500"
          }`}
        >
          Comparação
        </button>
        <button
          onClick={() => setView("history")}
          className={`flex-1 py-3 text-sm font-medium transition-colors border-b-2 ${
            view === "history"
              ? "border-emerald-500 text-emerald-600"
              : "border-transparent text-gray-500"
          }`}
        >
          Histórico ({entries.length})
        </button>
      </div>

      <div className="p-4 pb-24">
        {view === "compare" && (
          <>
            {/* Legend */}
            <div className="flex gap-3 mb-4">
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <div className="w-3 h-3 rounded-full bg-blue-500" />
                Porto Alegre
              </div>
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <div className="w-3 h-3 rounded-full bg-purple-500" />
                Campo Bom
              </div>
            </div>

            {compared.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <div className="text-5xl mb-4">📷</div>
                <p className="font-medium">Nenhum produto ainda</p>
                <p className="text-sm mt-1">Toque em + para adicionar o primeiro preço</p>
              </div>
            ) : (
              <div className="space-y-3">
                {compared.map((p) => {
                  const diff = getDiff(p.poa, p.campobom);
                  const cheaperCity =
                    diff === null ? null : diff > 0 ? "poa" : diff < 0 ? "campobom" : "equal";

                  return (
                    <div
                      key={p.name}
                      className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100"
                    >
                      <p className="font-semibold text-gray-900 mb-3">
                        {formatProductName(p.name)}
                      </p>

                      <div className="grid grid-cols-2 gap-3">
                        {/* POA */}
                        <div
                          className={`rounded-xl p-3 ${
                            cheaperCity === "poa"
                              ? "bg-blue-50 ring-2 ring-blue-200"
                              : "bg-gray-50"
                          }`}
                        >
                          <div className="flex items-center gap-1 mb-1">
                            <div className="w-2 h-2 rounded-full bg-blue-500" />
                            <span className="text-xs font-medium text-gray-500">Porto Alegre</span>
                            {cheaperCity === "poa" && (
                              <span className="ml-auto text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-medium">
                                + barato
                              </span>
                            )}
                          </div>
                          <p className={`text-lg font-bold ${p.poa ? "text-blue-700" : "text-gray-300"}`}>
                            {formatCurrency(p.poa)}
                          </p>
                        </div>

                        {/* Campo Bom */}
                        <div
                          className={`rounded-xl p-3 ${
                            cheaperCity === "campobom"
                              ? "bg-purple-50 ring-2 ring-purple-200"
                              : "bg-gray-50"
                          }`}
                        >
                          <div className="flex items-center gap-1 mb-1">
                            <div className="w-2 h-2 rounded-full bg-purple-500" />
                            <span className="text-xs font-medium text-gray-500">Campo Bom</span>
                            {cheaperCity === "campobom" && (
                              <span className="ml-auto text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full font-medium">
                                + barato
                              </span>
                            )}
                          </div>
                          <p className={`text-lg font-bold ${p.campobom ? "text-purple-700" : "text-gray-300"}`}>
                            {formatCurrency(p.campobom)}
                          </p>
                        </div>
                      </div>

                      {diff !== null && (
                        <div className="mt-3 flex items-center gap-2">
                          <div
                            className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                              Math.abs(diff) < 1
                                ? "bg-gray-100 text-gray-600"
                                : diff > 0
                                ? "bg-blue-100 text-blue-700"
                                : "bg-purple-100 text-purple-700"
                            }`}
                          >
                            {diff > 0
                              ? `POA ${diff.toFixed(1)}% mais barato`
                              : diff < 0
                              ? `Campo Bom ${Math.abs(diff).toFixed(1)}% mais barato`
                              : "Mesmo preço"}
                          </div>
                          {Math.abs(diff) >= 5 && (
                            <span className="text-xs text-gray-400">
                              Economize R$ {Math.abs((p.poa ?? 0) - (p.campobom ?? 0)).toFixed(2).replace(".", ",")}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {view === "history" && (
          <>
            {entries.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <div className="text-5xl mb-4">📋</div>
                <p>Nenhum registro ainda</p>
              </div>
            ) : (
              <div className="space-y-2">
                {entries.map((entry) => (
                  <div
                    key={entry.id}
                    className="bg-white rounded-xl px-4 py-3 shadow-sm border border-gray-100 flex items-center gap-3"
                  >
                    <div
                      className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                        entry.city === "poa" ? "bg-blue-500" : "bg-purple-500"
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 text-sm truncate">
                        {formatProductName(entry.productName)}
                      </p>
                      <p className="text-xs text-gray-400">
                        {entry.city === "poa" ? "Porto Alegre" : "Campo Bom"} •{" "}
                        {new Date(entry.capturedAt).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                    <p className={`font-bold text-sm flex-shrink-0 ${entry.city === "poa" ? "text-blue-700" : "text-purple-700"}`}>
                      {formatCurrency(entry.price)}
                    </p>
                    <button
                      onClick={() => setDeleteId(entry.id)}
                      className="text-gray-300 hover:text-red-400 transition-colors flex-shrink-0 p-1"
                    >
                      🗑️
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* FAB */}
      <Link
        href="/add"
        className="fixed bottom-6 right-6 w-14 h-14 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full shadow-lg flex items-center justify-center text-2xl transition-transform active:scale-95 z-20"
      >
        +
      </Link>

      {/* Delete confirm modal */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/40 flex items-end justify-center z-30 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <p className="font-semibold text-gray-900 text-center mb-1">Excluir registro?</p>
            <p className="text-sm text-gray-500 text-center mb-6">Esta ação não pode ser desfeita.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteId(null)}
                className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-700 font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(deleteId)}
                className="flex-1 py-3 rounded-xl bg-red-500 text-white font-medium"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
