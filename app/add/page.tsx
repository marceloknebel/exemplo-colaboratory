"use client";

import { useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type City = "poa" | "campobom";

async function compressImage(file: File): Promise<{ base64: string; mediaType: string }> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const MAX = 1024;
        const scale = Math.min(MAX / img.width, MAX / img.height, 1);
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.82);
        resolve({ base64: dataUrl.split(",")[1], mediaType: "image/jpeg" });
      };
      img.src = e.target!.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export default function AddPage() {
  const { status } = useSession();
  const router = useRouter();

  const [city, setCity] = useState<City>("poa");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [productName, setProductName] = useState("");
  const [price, setPrice] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageDataRef = useRef<{ base64: string; mediaType: string } | null>(null);

  if (status === "unauthenticated") {
    router.push("/login");
    return null;
  }

  async function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError("");
    const preview = URL.createObjectURL(file);
    setImagePreview(preview);
    setProductName("");
    setPrice("");

    const compressed = await compressImage(file);
    imageDataRef.current = compressed;
  }

  async function handleAnalyze() {
    if (!imageDataRef.current) return;
    setAnalyzing(true);
    setError("");

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(imageDataRef.current),
      });

      if (!res.ok) throw new Error("Falha na análise");

      const data = await res.json();
      if (data.produto) setProductName(data.produto);
      if (data.preco > 0) setPrice(String(data.preco));
      if (!data.produto && !data.preco) {
        setError("Não consegui identificar o produto. Preencha manualmente.");
      }
    } catch {
      setError("Erro ao analisar a imagem. Preencha manualmente.");
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!productName.trim() || !price) return;
    setSaving(true);
    setError("");

    try {
      const res = await fetch("/api/prices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productName, price, city, note }),
      });

      if (!res.ok) throw new Error("Falha ao salvar");
      router.push("/dashboard");
    } catch {
      setError("Erro ao salvar. Tente novamente.");
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-4 flex items-center gap-3 sticky top-0 z-10 shadow-sm">
        <Link href="/dashboard" className="text-gray-400 hover:text-gray-600 p-1 -ml-1">
          ←
        </Link>
        <h1 className="text-lg font-bold text-gray-900">Adicionar Preço</h1>
      </div>

      <form onSubmit={handleSave} className="p-4 space-y-5 pb-10">
        {/* City selector */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <p className="text-sm font-semibold text-gray-700 mb-3">Cidade</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setCity("poa")}
              className={`py-3 rounded-xl text-sm font-semibold transition-all ${
                city === "poa"
                  ? "bg-blue-500 text-white shadow-sm"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              🏙️ Porto Alegre
            </button>
            <button
              type="button"
              onClick={() => setCity("campobom")}
              className={`py-3 rounded-xl text-sm font-semibold transition-all ${
                city === "campobom"
                  ? "bg-purple-500 text-white shadow-sm"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              🌳 Campo Bom
            </button>
          </div>
        </div>

        {/* Image capture */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <p className="text-sm font-semibold text-gray-700 mb-3">Foto do produto / etiqueta</p>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleImageChange}
            className="hidden"
          />

          {imagePreview ? (
            <div className="space-y-3">
              <div className="relative rounded-xl overflow-hidden bg-gray-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imagePreview} alt="Prévia" className="w-full max-h-56 object-contain" />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded-lg"
                >
                  Trocar
                </button>
              </div>

              <button
                type="button"
                onClick={handleAnalyze}
                disabled={analyzing}
                className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-300 text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2"
              >
                {analyzing ? (
                  <>
                    <span className="animate-spin">⏳</span> Analisando com IA...
                  </>
                ) : (
                  <>✨ Extrair produto e preço</>
                )}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-8 rounded-xl border-2 border-dashed border-gray-200 text-gray-400 hover:border-emerald-300 hover:text-emerald-500 transition-colors text-center"
            >
              <div className="text-3xl mb-2">📷</div>
              <p className="text-sm font-medium">Tirar foto ou escolher imagem</p>
              <p className="text-xs mt-1 opacity-70">Etiqueta de preço ou embalagem</p>
            </button>
          )}
        </div>

        {/* Product details */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-4">
          <p className="text-sm font-semibold text-gray-700">Dados do produto</p>

          <div>
            <label className="block text-xs text-gray-500 mb-1.5 font-medium">
              Nome do produto <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              placeholder="ex: arroz tio joão 1kg"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1.5 font-medium">
              Preço (R$) <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">R$</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0,00"
                className="w-full border border-gray-200 rounded-xl pl-10 pr-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1.5 font-medium">
              Observação (opcional)
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="ex: promoção, marca diferente..."
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent"
            />
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-100 rounded-xl p-3 text-sm text-red-600 flex items-start gap-2">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={saving || !productName.trim() || !price}
          className="w-full py-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold text-base transition-colors"
        >
          {saving ? "Salvando..." : "Salvar preço"}
        </button>
      </form>
    </div>
  );
}
