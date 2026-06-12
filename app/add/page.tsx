"use client";

import { useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type City = "poa" | "campobom";
type Mode = "product" | "receipt";

type ReceiptItem = {
  id: string;
  nome: string;
  preco: number;
  quantidade: number;
  selected: boolean;
};

async function compressImage(file: File): Promise<{ base64: string; mediaType: string }> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const MAX = 1200;
        const scale = Math.min(MAX / img.width, MAX / img.height, 1);
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve({ base64: canvas.toDataURL("image/jpeg", 0.85).split(",")[1], mediaType: "image/jpeg" });
      };
      img.src = e.target!.result as string;
    };
    reader.readAsDataURL(file);
  });
}

// ─── Single product form ───────────────────────────────────────────────────

function ProductForm({ city, imagePreview, imageData, onClear }: {
  city: City;
  imagePreview: string;
  imageData: { base64: string; mediaType: string };
  onClear: () => void;
}) {
  const router = useRouter();
  const [analyzing, setAnalyzing] = useState(false);
  const [productName, setProductName] = useState("");
  const [price, setPrice] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleAnalyze() {
    setAnalyzing(true);
    setError("");
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...imageData, mode: "product" }),
      });
      const data = await res.json();
      if (data.produto) setProductName(data.produto);
      if (data.preco > 0) setPrice(String(data.preco));
      if (!data.produto && !data.preco) setError("Não consegui identificar. Preencha manualmente.");
    } catch {
      setError("Erro ao analisar. Preencha manualmente.");
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await fetch("/api/prices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productName, price, city, note }),
      });
      router.push("/dashboard");
    } catch {
      setError("Erro ao salvar.");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSave} className="space-y-4">
      {/* Image preview */}
      <div className="relative rounded-xl overflow-hidden bg-gray-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imagePreview} alt="Prévia" className="w-full max-h-52 object-contain" />
        <button type="button" onClick={onClear}
          className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded-lg">
          Trocar foto
        </button>
      </div>

      <button type="button" onClick={handleAnalyze} disabled={analyzing}
        className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-300 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors">
        {analyzing ? <><span className="animate-spin">⏳</span> Analisando...</> : <>✨ Extrair produto e preço</>}
      </button>

      <div className="space-y-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1.5 font-medium">
            Nome do produto <span className="text-red-400">*</span>
          </label>
          <input type="text" value={productName} onChange={(e) => setProductName(e.target.value)}
            placeholder="ex: arroz tio joão 1kg"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
            required />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1.5 font-medium">
            Preço (R$) <span className="text-red-400">*</span>
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm">R$</span>
            <input type="number" step="0.01" min="0" value={price} onChange={(e) => setPrice(e.target.value)}
              placeholder="0,00"
              className="w-full border border-gray-200 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              required />
          </div>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1.5 font-medium">Observação (opcional)</label>
          <input type="text" value={note} onChange={(e) => setNote(e.target.value)}
            placeholder="ex: promoção, marca diferente..."
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
        </div>
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 rounded-xl p-3">⚠️ {error}</p>}

      <button type="submit" disabled={saving || !productName.trim() || !price}
        className="w-full py-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold transition-colors">
        {saving ? "Salvando..." : "Salvar preço"}
      </button>
    </form>
  );
}

// ─── Receipt review ────────────────────────────────────────────────────────

function ReceiptReview({ items, city, onBack }: {
  items: ReceiptItem[];
  city: City;
  onBack: () => void;
}) {
  const router = useRouter();
  const [list, setList] = useState<ReceiptItem[]>(items);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const selected = list.filter((i) => i.selected);

  function toggle(id: string) {
    setList((prev) => prev.map((i) => i.id === id ? { ...i, selected: !i.selected } : i));
  }

  function update(id: string, field: "nome" | "preco", value: string) {
    setList((prev) => prev.map((i) => {
      if (i.id !== id) return i;
      return field === "preco" ? { ...i, preco: parseFloat(value) || 0 } : { ...i, nome: value };
    }));
  }

  function toggleAll() {
    const allSelected = list.every((i) => i.selected);
    setList((prev) => prev.map((i) => ({ ...i, selected: !allSelected })));
  }

  async function handleSave() {
    if (selected.length === 0) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/prices/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          city,
          items: selected.map((i) => ({
            productName: i.nome,
            price: i.preco,
          })),
        }),
      });
      if (!res.ok) throw new Error();
      router.push("/dashboard");
    } catch {
      setError("Erro ao salvar. Tente novamente.");
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="flex items-center justify-between bg-emerald-50 rounded-xl px-4 py-3">
        <span className="text-sm font-medium text-emerald-800">
          {list.length} produto{list.length !== 1 ? "s" : ""} encontrado{list.length !== 1 ? "s" : ""}
        </span>
        <button onClick={toggleAll} className="text-xs text-emerald-700 underline font-medium">
          {list.every((i) => i.selected) ? "Desmarcar todos" : "Selecionar todos"}
        </button>
      </div>

      {/* Items */}
      <div className="space-y-2">
        {list.map((item) => (
          <div key={item.id}
            className={`rounded-xl border transition-all ${item.selected ? "border-emerald-200 bg-white" : "border-gray-100 bg-gray-50 opacity-60"}`}>
            <div className="flex items-start gap-3 p-3">
              {/* Checkbox */}
              <button type="button" onClick={() => toggle(item.id)}
                className={`mt-0.5 w-5 h-5 rounded-md border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                  item.selected ? "bg-emerald-500 border-emerald-500" : "border-gray-300"}`}>
                {item.selected && <span className="text-white text-xs font-bold">✓</span>}
              </button>

              {/* Content */}
              {editingId === item.id ? (
                <div className="flex-1 space-y-2">
                  <input
                    autoFocus
                    value={item.nome}
                    onChange={(e) => update(item.id, "nome", e.target.value)}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  />
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">R$</span>
                    <input
                      type="number"
                      step="0.01"
                      value={item.preco}
                      onChange={(e) => update(item.id, "preco", e.target.value)}
                      className="w-28 text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                    />
                    <button onClick={() => setEditingId(null)}
                      className="ml-auto text-xs bg-emerald-500 text-white px-3 py-1.5 rounded-lg font-medium">
                      OK
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 capitalize truncate">{item.nome}</p>
                  {item.quantidade > 1 && (
                    <p className="text-xs text-gray-400">{item.quantidade}x</p>
                  )}
                </div>
              )}

              {editingId !== item.id && (
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`text-sm font-bold ${item.preco > 0 ? "text-gray-900" : "text-red-400"}`}>
                    {item.preco > 0 ? `R$ ${item.preco.toFixed(2).replace(".", ",")}` : "?"}
                  </span>
                  <button onClick={() => setEditingId(item.id)}
                    className="text-gray-300 hover:text-gray-500 text-lg leading-none">✏️</button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 rounded-xl p-3">⚠️ {error}</p>}

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button onClick={onBack}
          className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-700 font-medium text-sm">
          ← Voltar
        </button>
        <button onClick={handleSave} disabled={saving || selected.length === 0}
          className="flex-1 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold text-sm transition-colors">
          {saving ? "Salvando..." : `Salvar ${selected.length} item${selected.length !== 1 ? "s" : ""}`}
        </button>
      </div>
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────

export default function AddPage() {
  const { status } = useSession();
  const router = useRouter();

  const [mode, setMode] = useState<Mode>("product");
  const [city, setCity] = useState<City>("poa");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageData, setImageData] = useState<{ base64: string; mediaType: string } | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [receiptItems, setReceiptItems] = useState<ReceiptItem[] | null>(null);
  const [error, setError] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (status === "unauthenticated") { router.push("/login"); return null; }

  function clearImage() {
    setImagePreview(null);
    setImageData(null);
    setReceiptItems(null);
    setError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    setReceiptItems(null);
    setImagePreview(URL.createObjectURL(file));
    setImageData(await compressImage(file));
  }

  async function handleAnalyzeReceipt() {
    if (!imageData) return;
    setAnalyzing(true);
    setError("");
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...imageData, mode: "receipt" }),
      });
      const data = await res.json();
      if (!data.produtos || data.produtos.length === 0) {
        setError("Não encontrei produtos. Verifique se a foto está nítida e tente novamente.");
        return;
      }
      setReceiptItems(
        data.produtos.map((p: { nome: string; preco: number; quantidade?: number }, i: number) => ({
          id: String(i),
          nome: p.nome,
          preco: p.preco,
          quantidade: p.quantidade ?? 1,
          selected: p.preco > 0,
        }))
      );
    } catch {
      setError("Erro ao analisar a nota. Tente novamente.");
    } finally {
      setAnalyzing(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-4 flex items-center gap-3 sticky top-0 z-10 shadow-sm">
        <Link href="/dashboard" className="text-gray-400 hover:text-gray-600 p-1 -ml-1 text-xl">←</Link>
        <h1 className="text-lg font-bold text-gray-900">Adicionar Preços</h1>
      </div>

      <div className="p-4 space-y-4 pb-10">
        {/* Mode toggle */}
        <div className="bg-white rounded-2xl p-1.5 shadow-sm border border-gray-100 flex">
          <button onClick={() => { setMode("product"); clearImage(); }}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              mode === "product" ? "bg-emerald-500 text-white shadow-sm" : "text-gray-500"}`}>
            🏷️ Produto único
          </button>
          <button onClick={() => { setMode("receipt"); clearImage(); }}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              mode === "receipt" ? "bg-emerald-500 text-white shadow-sm" : "text-gray-500"}`}>
            🧾 Nota Fiscal
          </button>
        </div>

        {/* City selector */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <p className="text-sm font-semibold text-gray-700 mb-3">Cidade</p>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setCity("poa")}
              className={`py-3 rounded-xl text-sm font-semibold transition-all ${
                city === "poa" ? "bg-blue-500 text-white shadow-sm" : "bg-gray-100 text-gray-600"}`}>
              🏙️ Porto Alegre
            </button>
            <button type="button" onClick={() => setCity("campobom")}
              className={`py-3 rounded-xl text-sm font-semibold transition-all ${
                city === "campobom" ? "bg-purple-500 text-white shadow-sm" : "bg-gray-100 text-gray-600"}`}>
              🌳 Campo Bom
            </button>
          </div>
        </div>

        {/* Image capture */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <p className="text-sm font-semibold text-gray-700 mb-3">
            {mode === "receipt" ? "Foto da nota fiscal" : "Foto do produto / etiqueta"}
          </p>

          <input ref={fileInputRef} type="file" accept="image/*" capture="environment"
            onChange={handleImageChange} className="hidden" />

          {!imagePreview ? (
            <button type="button" onClick={() => fileInputRef.current?.click()}
              className="w-full py-8 rounded-xl border-2 border-dashed border-gray-200 text-gray-400 hover:border-emerald-300 hover:text-emerald-500 transition-colors text-center">
              <div className="text-3xl mb-2">{mode === "receipt" ? "🧾" : "📷"}</div>
              <p className="text-sm font-medium">
                {mode === "receipt" ? "Fotografar a nota fiscal" : "Tirar foto ou escolher imagem"}
              </p>
              <p className="text-xs mt-1 opacity-70">
                {mode === "receipt" ? "Tente deixar a nota bem iluminada e legível" : "Etiqueta de preço ou embalagem"}
              </p>
            </button>
          ) : receiptItems ? null : (
            <div className="space-y-3">
              <div className="relative rounded-xl overflow-hidden bg-gray-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imagePreview} alt="Nota fiscal" className="w-full max-h-56 object-contain" />
                <button onClick={clearImage}
                  className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded-lg">
                  Trocar
                </button>
              </div>

              {mode === "receipt" && (
                <button type="button" onClick={handleAnalyzeReceipt} disabled={analyzing}
                  className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-300 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors">
                  {analyzing
                    ? <><span className="animate-spin">⏳</span> Lendo a nota fiscal...</>
                    : <>🧾 Extrair todos os produtos</>}
                </button>
              )}
            </div>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-100 rounded-xl p-3 text-sm text-red-600 flex items-start gap-2">
            <span>⚠️</span><span>{error}</span>
          </div>
        )}

        {/* Product single form */}
        {mode === "product" && imagePreview && imageData && (
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <ProductForm city={city} imagePreview={imagePreview} imageData={imageData} onClear={clearImage} />
          </div>
        )}

        {/* Receipt review */}
        {mode === "receipt" && receiptItems && (
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <p className="text-sm font-semibold text-gray-700 mb-3">Revise e selecione os produtos</p>
            <ReceiptReview items={receiptItems} city={city} onBack={() => setReceiptItems(null)} />
          </div>
        )}
      </div>
    </div>
  );
}
