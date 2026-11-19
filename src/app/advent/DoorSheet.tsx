"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

import type { Door, DoorKind } from "@/lib/advent";
import styles from "./advent.module.css";

const KIND_LABEL: Record<DoorKind, string> = {
  note: "Ein Zettel für dich",
  photo: "Ein Foto",
  song: "Ein Lied",
  voice: "Eine Sprachnachricht",
  poem: "Ein Gedicht",
  recipe: "Ein Rezept",
  voucher: "Ein Gutschein",
  activity: "Heute",
  letter: "Ein Brief",
  memory: "Eine Erinnerung",
};

function paragraphs(text?: string): string[] {
  return text ? text.split(/\n\s*\n/) : [];
}

export function DoorSheet({
  door,
  label,
  onClose,
}: {
  door: Door;
  label: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={door.title}
    >
      <div
        className={`${styles.pop} max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-[#fbf3e1] shadow-2xl sm:rounded-3xl`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`${styles.sheetHead} relative px-6 pb-10 pt-6 text-[#fbf5e6]`}>
          <button
            type="button"
            onClick={onClose}
            aria-label="Schließen"
            className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-lg leading-none text-white/80 transition hover:bg-white/20"
          >
            ✕
          </button>
          <div className="flex items-end gap-4">
            <span
              className="text-6xl font-extrabold leading-none text-[#f2c14e]"
              aria-hidden
            >
              {label}
            </span>
            <div className="pb-1">
              <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-[#f2c14e]/80">
                {KIND_LABEL[door.kind]}
              </p>
              <h2 className="mt-0.5 text-2xl font-extrabold leading-tight">
                {door.title}
              </h2>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="relative -mt-5 flex flex-col gap-6 rounded-t-3xl bg-[#fbf3e1] px-6 pb-[calc(env(safe-area-inset-bottom)+2rem)] pt-8 text-[#3d3020]">
          <DoorBody door={door} />
        </div>
      </div>
    </div>
  );
}

function DoorBody({ door }: { door: Door }) {
  const paras = paragraphs(door.text);

  switch (door.kind) {
    case "note":
      return (
        <>
          <Note paras={paras} />
          <LinkButton door={door} />
        </>
      );

    case "photo":
      return (
        <>
          <Polaroid src={door.image} alt={door.imageAlt} caption={door.text} tilt="rotate-[1.5deg]" />
          <LinkButton door={door} />
        </>
      );

    case "letter":
      return (
        <>
          {door.image && <Polaroid src={door.image} alt={door.imageAlt} tilt="-rotate-2" small />}
          <div className={`${styles.paper} relative rounded-sm px-6 pb-14 pt-7`}>
            <div className={`${styles.serif} flex flex-col gap-4 text-[17px] leading-relaxed`}>
              {paras.map((p, i) => (
                <p key={i} className={i === 0 ? "text-xl font-semibold" : ""}>
                  {p}
                </p>
              ))}
            </div>
            <span
              className="absolute -bottom-5 left-1/2 flex h-12 w-12 -translate-x-1/2 items-center justify-center rounded-full bg-[#a0302a] text-xl text-[#fbe3dc] shadow-[inset_0_-3px_6px_rgba(0,0,0,0.25),0_4px_10px_rgba(0,0,0,0.2)]"
              aria-hidden
            >
              ♥
            </span>
          </div>
          <div className="h-2" />
          <LinkButton door={door} />
        </>
      );

    case "memory":
      return (
        <>
          {door.image && <Polaroid src={door.image} alt={door.imageAlt} tilt="rotate-2" small />}
          <div className={`${styles.paper} relative rounded-sm px-6 pb-6 pt-6`}>
            <div className="mb-4 border-b border-dashed border-[#d8c39a] pb-3">
              <p className={`${styles.hand} text-[30px] leading-none text-[#a0302a]`}>Weißt du noch…?</p>
              {door.memoryWhen && (
                <p className="mt-2 text-xs font-medium text-[#9a8767]">{door.memoryWhen}</p>
              )}
            </div>
            <div className={`${styles.hand} flex flex-col gap-3 text-[24px] leading-snug text-[#2c3a5a]`}>
              {paras.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          </div>
          <LinkButton door={door} />
        </>
      );

    case "voucher":
      return (
        <>
          {door.voucher && <Ticket voucher={door.voucher} />}
          {paras.length > 0 && <HandText paras={paras} />}
          <LinkButton door={door} />
        </>
      );

    case "song":
      return (
        <>
          {/* the record on its own, centred */}
          <div className="flex flex-col items-center gap-5 rounded-3xl bg-[#1f3b2d] px-5 pb-5 pt-7">
            <div className={`${styles.vinyl} ${styles.spin} h-36 w-36 rounded-full`} aria-hidden />
            <div className="w-full">
              <LinkButton door={door} variant="gold" icon="▶" />
            </div>
          </div>
          {/* your words underneath, like a note tucked in with it */}
          {paras.length > 0 && <HandText paras={paras} />}
        </>
      );

    case "voice":
      return (
        <>
          {door.audio && <VoiceMemo src={door.audio} />}
          {paras.length > 0 && <HandText paras={paras} />}
          <LinkButton door={door} />
        </>
      );

    case "poem":
      return (
        <>
          <div className={`${styles.paper} rounded-sm px-6 py-8 text-center`}>
            <p className="text-2xl text-[#c9a96b]" aria-hidden>
              ❦
            </p>
            <div
              className={`${styles.serif} my-4 flex flex-col gap-4 whitespace-pre-line text-[17px] italic leading-relaxed`}
            >
              {paras.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
            <p className="rotate-180 text-2xl text-[#c9a96b]" aria-hidden>
              ❦
            </p>
          </div>
          <LinkButton door={door} />
        </>
      );

    case "recipe":
      return (
        <>
          <div className={`${styles.paper} overflow-hidden rounded-md`}>
            <div className="flex items-center justify-between bg-[#a0302a] px-5 py-2.5 text-[#fbe3dc]">
              <span className="text-xs font-bold uppercase tracking-[0.3em]">Rezept</span>
              <span aria-hidden>🍲</span>
            </div>
            <div className={`${styles.lined} ${styles.hand} px-5 pb-4 pt-1 text-[24px] text-[#2c3a5a]`}>
              {paras.map((p, i) => (
                <p key={i} className="mb-[34px] last:mb-0">
                  {p}
                </p>
              ))}
            </div>
          </div>
          <LinkButton door={door} />
        </>
      );

    case "activity":
      return (
        <>
          <div className="flex flex-col items-center gap-5 py-2 text-center">
            <span className={`${styles.stamp} rounded-lg px-5 py-1.5 text-2xl font-bold uppercase tracking-[0.2em]`}>
              Heute
            </span>
            <div className={`${styles.hand} flex flex-col gap-2 text-[28px] leading-snug`}>
              {paras.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          </div>
          <LinkButton door={door} />
        </>
      );
  }
}

/* ── Pieces ──────────────────────────────────────────────────────────── */

function Note({ paras }: { paras: string[] }) {
  return (
    <div className={`${styles.paper} ${styles.lined} relative -rotate-1 rounded-sm px-6 pb-5 pt-6`}>
      <span className={styles.tape} aria-hidden />
      <div className={`${styles.hand} text-[25px] text-[#2c3a5a]`}>
        {paras.map((p, i) => (
          <p key={i} className="mb-[34px] last:mb-0">
            {p}
          </p>
        ))}
      </div>
    </div>
  );
}

function HandText({ paras }: { paras: string[] }) {
  return (
    <div className={`${styles.hand} flex flex-col gap-2 text-center text-[24px] leading-snug text-[#5b4a36]`}>
      {paras.map((p, i) => (
        <p key={i}>{p}</p>
      ))}
    </div>
  );
}

function Polaroid({
  src,
  alt,
  caption,
  tilt,
  small,
}: {
  src?: string;
  alt?: string;
  caption?: string;
  tilt: string;
  small?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  return (
    <figure className={`${styles.polaroid} ${tilt} mx-auto ${small ? "w-3/5" : "w-full"}`}>
      {src && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt ?? ""}
          onError={() => setFailed(true)}
          className="aspect-square w-full bg-[#eee6d6] object-cover"
        />
      ) : (
        <div className="flex aspect-square w-full flex-col items-center justify-center gap-1 bg-[#efe6d2] text-[#9a8767]">
          <span className="text-4xl">📸</span>
          <span className="text-xs">Foto kommt noch</span>
        </div>
      )}
      {caption && (
        <figcaption className={`${styles.hand} mt-3 text-center text-[24px] leading-snug text-[#3d3020]`}>
          {caption}
        </figcaption>
      )}
    </figure>
  );
}

function Ticket({ voucher }: { voucher: NonNullable<Door["voucher"]> }) {
  return (
    <div className={`${styles.ticket} flex overflow-hidden rounded-2xl shadow-[0_10px_24px_rgba(120,30,25,0.25)]`}>
      <div className="flex flex-1 flex-col items-center justify-center bg-gradient-to-br from-[#b8403a] to-[#8c2622] px-5 py-7 text-center text-[#fdf0e6]">
        <span className="text-[10px] font-bold uppercase tracking-[0.35em] text-[#f6c7b9]">
          Gutschein
        </span>
        <span className="mt-2 text-[28px] font-extrabold leading-tight">
          {voucher.what}
        </span>
        <span className="mt-2 rounded-full bg-black/15 px-3 py-1 text-sm font-semibold">
          {voucher.when}
        </span>
        {voucher.fine && <span className="mt-3 text-xs text-[#f6c7b9]">{voucher.fine}</span>}
      </div>
      <div className="flex w-14 items-center justify-center border-l-2 border-dashed border-[#fdf0e6]/50 bg-[#7a1f1b]">
        <span
          className="-rotate-90 whitespace-nowrap text-sm font-bold tracking-[0.2em] text-[#f6c7b9]"
        >
          für dich ♥
        </span>
      </div>
    </div>
  );
}

const BARS = [
  4, 7, 12, 9, 15, 20, 14, 10, 17, 22, 18, 12, 8, 14, 19, 24, 16, 11, 7, 13, 18, 15, 9, 6, 11, 16, 12, 8,
];

function formatTime(s: number) {
  if (!Number.isFinite(s)) return "0:00";
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
}

function VoiceMemo({ src }: { src: string }) {
  const ref = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [failed, setFailed] = useState(false);

  const toggle = () => {
    const a = ref.current;
    if (!a) return;
    if (a.paused) a.play().catch(() => setFailed(true));
    else a.pause();
  };

  const progress = duration ? time / duration : 0;

  return (
    <div className="flex items-center gap-4 rounded-3xl bg-[#1f3b2d] p-4 pr-5 text-[#fbf5e6]">
      <audio
        ref={ref}
        src={src}
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onError={() => setFailed(true)}
      />
      <button
        type="button"
        onClick={toggle}
        disabled={failed}
        aria-label={playing ? "Pause" : "Abspielen"}
        className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#f2c14e] text-xl text-[#1f3b2d] shadow-lg transition active:scale-95 disabled:opacity-40"
      >
        {playing ? "❚❚" : "▶"}
      </button>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex h-7 items-center gap-[3px]" aria-hidden>
          {BARS.map((h, i) => (
            <span
              key={i}
              className={`${styles.bar} ${playing ? styles.barPlaying : ""} w-[3px] rounded-full ${
                i / BARS.length < progress ? "bg-[#f2c14e]" : "bg-white/35"
              }`}
              style={{ height: h + 4, animationDelay: `${(i % 7) * 0.11}s` }}
            />
          ))}
        </div>
        <span className="text-xs text-white/60">
          {failed ? "Sprachnachricht kommt noch" : `${formatTime(time)} / ${formatTime(duration)}`}
        </span>
      </div>
    </div>
  );
}

function LinkButton({
  door,
  variant = "green",
  icon = "↗",
}: {
  door: Door;
  variant?: "green" | "gold";
  icon?: ReactNode;
}) {
  if (!door.link) return null;
  const look =
    variant === "gold"
      ? "bg-[#f2c14e] text-[#1f3b2d] hover:bg-[#f5cd6c]"
      : "bg-[#1f3b2d] text-[#fbf5e6] hover:bg-[#2b4a39]";
  return (
    <a
      href={door.link.href}
      target="_blank"
      rel="noopener noreferrer"
      className={`flex items-center justify-center gap-2 rounded-full px-5 py-3.5 font-bold transition ${look}`}
    >
      {variant === "gold" && <span aria-hidden>{icon}</span>}
      {door.link.label}
      {variant !== "gold" && <span aria-hidden>{icon}</span>}
    </a>
  );
}
