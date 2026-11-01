"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { useI18n } from "@/i18n/provider";
import type { VehicleMake } from "@/lib/types";
import { buttonStyles, inputStyles } from "@/components/ui/styles";

/** Model → generation → year picker that opens the filtered catalog. */
export function VehicleSelector({ makes }: { makes: VehicleMake[] }) {
  const { locale, dict } = useI18n();
  const router = useRouter();
  const models = makes.flatMap((m) => m.models.map((model) => ({ ...model, label: `${m.name} ${model.name}` })));
  const [model, setModel] = useState(models.find((m) => m.slug === "camry")?.slug ?? models[0]?.slug ?? "");
  const [generation, setGeneration] = useState("");
  const [year, setYear] = useState("");

  const gens = models.find((m) => m.slug === model)?.generations ?? [];
  const gen = gens.find((g) => g.slug === generation);
  const thisYear = new Date().getFullYear();
  const yearRange = gen
    ? range(gen.yearFrom, gen.yearTo ?? thisYear)
    : gens.length
      ? range(Math.min(...gens.map((g) => g.yearFrom)), thisYear)
      : [];

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (model) params.set("model", model);
    if (generation) params.set("generation", generation);
    if (year) params.set("year", year);
    router.push(`/${locale}/catalog?${params}`);
  }

  return (
    <form onSubmit={submit} className="grid gap-3 sm:grid-cols-[1fr_1fr_0.8fr_auto]" aria-label={dict.home.vehicleTitle}>
      <label className="block">
        <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-subtle">{dict.home.model}</span>
        <select
          className={inputStyles}
          value={model}
          onChange={(e) => {
            setModel(e.target.value);
            setGeneration("");
            setYear("");
          }}
        >
          {models.map((m) => (
            <option key={m.id} value={m.slug}>
              {m.label}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-subtle">{dict.home.generation}</span>
        <select
          className={inputStyles}
          value={generation}
          onChange={(e) => {
            setGeneration(e.target.value);
            setYear("");
          }}
        >
          <option value="">{dict.common.all}</option>
          {gens.map((g) => (
            <option key={g.id} value={g.slug}>
              {g.code} · {g.yearFrom}–{g.yearTo ?? ""}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-subtle">{dict.home.year}</span>
        <select className={inputStyles} value={year} onChange={(e) => setYear(e.target.value)}>
          <option value="">{dict.common.any}</option>
          {yearRange.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </label>
      <button type="submit" className={buttonStyles("primary", "md", "self-end h-11")}>
        {dict.home.show}
        <ArrowRight className="size-4" aria-hidden />
      </button>
    </form>
  );
}

function range(from: number, to: number) {
  const out: number[] = [];
  for (let y = to; y >= from; y--) out.push(y);
  return out;
}
