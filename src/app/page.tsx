import Link from "next/link";

import { SITES } from "@/lib/sites";

export default function Home() {
  return (
    <div className="min-h-dvh bg-gradient-to-b from-[#fdf8ea] to-[#f4e6c6] text-[#5b4a36]">
      <main className="mx-auto flex w-full max-w-md flex-col gap-7 px-5 pb-24 pt-12">
        <header className="flex flex-col gap-1">
          <h1 className="flex items-center gap-2 text-3xl font-extrabold tracking-tight">
            <span aria-hidden>📦</span>
            Kramkiste
          </h1>
          <p className="text-sm text-[#9a8767]">
            Allerlei kleine Sachen, mit Liebe für dich gemacht. Wühl dich durch.
          </p>
        </header>

        <div className="flex flex-col gap-5">
          {SITES.map((site) => (
            <Link
              key={site.id}
              href={site.href}
              className="group flex items-center gap-4 rounded-2xl border-2 border-dashed border-[#d8c39a] bg-[#fdf6e6] p-5 shadow-[0_6px_16px_rgba(120,95,55,0.10)] transition odd:-rotate-1 even:rotate-1 hover:-translate-y-0.5 hover:rotate-0 hover:border-[#caad79] hover:bg-[#f7ecce] focus-visible:rotate-0 focus-visible:border-[#caad79] focus-visible:bg-[#f7ecce] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#caad79]/60"
            >
              <span
                className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl shadow-inner ${site.accent}`}
              >
                {site.icon}
              </span>
              <span className="flex min-w-0 flex-col">
                <span className="text-base font-bold text-[#5b4a36]">
                  {site.title}
                </span>
                <span className="text-sm text-[#9a8767]">{site.blurb}</span>
              </span>
              <span
                aria-hidden
                className="ml-auto text-[#c9b48c] transition-transform group-hover:translate-x-0.5"
              >
                ›
              </span>
            </Link>
          ))}
        </div>

        <footer className="pt-2 text-center text-[10px] uppercase tracking-[0.25em] text-[#b3a386]">
          Mit Liebe für dich gemacht
        </footer>
      </main>
    </div>
  );
}
