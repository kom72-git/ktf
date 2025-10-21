import React, { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Search, Image } from "lucide-react";

const sampleData = [
  {
    id: "cz-1983-01",
    year: 1983,
    catalogNumber: "A 2586",
    emission: "Interkosmos - 5. výročí letu SSSR-ČSSR",
    face: "10 Kčs",
    description: "5. výročí společného letu ČSSR–SSSR, různé deskové vady a varianty aršíků.",
    images: [
      "/images/1983-interkosmos-main.jpg"
    ],
    printingForm: "Aršík 108×165 mm",
    defects: [
      {
        label: "obr. 1",
        description: "Pod posledním padákem vpravo dole mezi plameny zlatá čárka chybí",
        image: "/images/1983-interkosmos-def1.jpg"
      },
      {
        label: "obr. 2",
        description: "Hnědá čárka v písmenu Č slova výročí",
        image: "/images/1983-interkosmos-def2.jpg"
      },
      {
        label: "obr. 3",
        description: "Zlatá větvička uprostřed PL – nad koncem větvičky zlatá skvrnka",
        image: "/images/1983-interkosmos-def3.jpg"
      }
    ]
  }
];

function DetailPage({ id, onBack, onLightbox }) {
  const item = sampleData.find((d) => d.id === id);
  if (!item) return <div className="p-8">Nenalezeno</div>;

  return (
    <div className="w-full max-w-4xl mx-auto bg-white p-6 rounded-2xl shadow">
      <button onClick={onBack} className="mb-4 text-blue-600 underline">← Zpět</button>
      <h2 className="text-2xl font-bold mb-2">{item.emission} ({item.year})</h2>
      <p className="text-gray-600 mb-4">Katalogové číslo: <strong>{item.catalogNumber}</strong></p>

      <div className="bg-gray-100 rounded-lg p-4 mb-6 flex items-center justify-center">
        <img src={item.images[0]} alt={item.emission} className="max-h-[400px] object-contain" />
      </div>

      <h3 className="text-lg font-semibold mb-2">Technické údaje</h3>
      <ul className="text-sm text-gray-700 mb-6 list-disc list-inside">
        <li>Katalogové číslo: {item.catalogNumber}</li>
        <li>Nominál: {item.face}</li>
        <li>Tisková forma: {item.printingForm}</li>
      </ul>

      {item.defects && item.defects.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3">Deskové vady a varianty</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {item.defects.map((def, i) => (
              <div key={i} className="bg-gray-50 rounded-lg p-3 shadow">
                <div
                  className="cursor-pointer flex items-center justify-center bg-white rounded mb-2 overflow-hidden"
                  onClick={() => onLightbox(def.image)}
                >
                  <img src={def.image} alt={def.label} className="object-contain max-h-32" />
                </div>
                <p className="text-xs text-gray-600"><strong>{def.label}:</strong> {def.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function StampCatalog() {
  const [query, setQuery] = useState("");
  const [year, setYear] = useState("all");
  const [emission, setEmission] = useState("all");
  const [catalog, setCatalog] = useState("all");
  const [lightbox, setLightbox] = useState(null);
  const [detailId, setDetailId] = useState(null);

  const years = useMemo(() => {
    const s = new Set(sampleData.map((d) => d.year));
    return ["all", ...Array.from(s).sort((a, b) => b - a)];
  }, []);

  const emissions = useMemo(() => {
    const s = new Set(sampleData.map((d) => d.emission));
    return ["all", ...Array.from(s).sort()];
  }, []);

  const catalogs = useMemo(() => {
    const s = new Set(sampleData.map((d) => d.catalogNumber));
    return ["all", ...Array.from(s).sort()];
  }, []);

  const filtered = useMemo(() => {
    return sampleData.filter((d) => {
      if (year !== "all" && d.year !== Number(year)) return false;
      if (emission !== "all" && d.emission !== emission) return false;
      if (catalog !== "all" && d.catalogNumber !== catalog) return false;
      if (query) {
        const q = query.toLowerCase();
        return (
          d.description.toLowerCase().includes(q) ||
          d.emission.toLowerCase().includes(q) ||
          (d.catalogNumber && d.catalogNumber.toLowerCase().includes(q)) ||
          (d.face && d.face.toLowerCase().includes(q)) ||
          (d.printingForm && d.printingForm.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [query, year, emission, catalog]);

  function exportCSV() {
    const header = ["id", "year", "catalogNumber", "emission", "face", "printingForm", "description"];
    const rows = filtered.map((r) => [r.id, r.year, r.catalogNumber, r.emission, r.face, r.printingForm, r.description]);
    const csv = [header, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `znamky_katalog_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <header className="max-w-6xl mx-auto mb-6">
        <h1 className="text-2xl md:text-4xl font-extrabold">Katalog tiskových forem — československé známky</h1>
        <p className="mt-2 text-sm text-gray-600">Nejsou zde žádné nabídky k prodeji — čistě katalog podle roku, emisí a katalogového čísla.</p>
      </header>

      <main className="max-w-6xl mx-auto">
        {detailId ? (
          <DetailPage id={detailId} onBack={() => setDetailId(null)} onLightbox={setLightbox} />
        ) : (
          <>
            <section className="mb-6 grid gap-4 md:grid-cols-4">
              <div className="col-span-3 flex gap-2">
                <div className="flex-1 relative">
                  <label className="sr-only">Hledat</label>
                  <div className="relative">
                    <input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Vyhledat podle emisí, katalogového čísla, popisu, nominálu nebo tiskové formy..."
                      className="w-full rounded-lg border p-3 pl-10 shadow-sm focus:outline-none"
                    />
                    <div className="absolute left-3 top-3 pointer-events-none"><Search size={18} /></div>
                  </div>
                </div>

                <div className="w-32">
                  <label className="sr-only">Rok</label>
                  <select value={year} onChange={(e) => setYear(e.target.value)} className="w-full rounded-lg border p-3 shadow-sm">
                    {years.map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>

                <div className="w-44">
                  <label className="sr-only">Emise</label>
                  <select value={emission} onChange={(e) => setEmission(e.target.value)} className="w-full rounded-lg border p-3 shadow-sm">
                    {emissions.map((em) => (
                      <option key={em} value={em}>{em}</option>
                    ))}
                  </select>
                </div>

                <div className="w-40">
                  <label className="sr-only">Katalogové číslo</label>
                  <select value={catalog} onChange={(e) => setCatalog(e.target.value)} className="w-full rounded-lg border p-3 shadow-sm">
                    {catalogs.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3">
                <button onClick={() => { setQuery(""); setYear("all"); setEmission("all"); setCatalog("all"); }} className="rounded-lg border px-3 py-2">Vyčistit</button>
                <button onClick={exportCSV} className="rounded-lg bg-slate-800 text-white px-3 py-2">Export CSV</button>
              </div>
            </section>

            <p className="text-sm text-gray-600 mb-4">Zobrazeno: {filtered.length} položek</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((item) => (
                <motion.article key={item.id} layout whileHover={{ scale: 1.01 }} className="bg-white rounded-2xl shadow p-4">
                  <div onClick={() => setDetailId(item.id)} className="block w-full rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center cursor-pointer h-48">
                    {item.images && item.images.length ? (
                      <img src={item.images[0]} alt={item.emission} className="object-contain max-h-full max-w-full" />
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-gray-400">
                        <Image size={40} />
                        <span className="text-xs">obrázek chybí</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-3">
                    <h3 className="font-semibold">{item.emission} <span className="text-sm text-gray-500">({item.year})</span></h3>
                    <p className="text-sm text-gray-600 mt-1">{item.face} • {item.printingForm}</p>
                  </div>

                  <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
                    <div>Katalog: <strong className="text-gray-700">{item.catalogNumber}</strong></div>
                    <div><button onClick={() => setDetailId(item.id)} className="underline">Detaily</button></div>
                  </div>
                </motion.article>
              ))}
            </div>
          </>
        )}
      </main>

      {lightbox && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80" onClick={() => setLightbox(null)} />
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative z-10 max-w-4xl w-full">
            <div className="flex justify-end mb-2">
              <button onClick={() => setLightbox(null)} className="rounded-full p-2 bg-white shadow">×</button>
            </div>
            <div className="bg-white rounded-lg p-4 flex items-center justify-center">
              <img src={lightbox} alt="defect detail" className="max-h-[80vh] max-w-full object-contain" />
            </div>
          </motion.div>
        </div>
      )}

      <footer className="max-w-6xl mx-auto mt-8 text-sm text-gray-500">© Katalog známek — pouze pro referenční účely. Data a obrázky nahrajte na server nebo připojte API.</footer>
    </div>
  );
}
