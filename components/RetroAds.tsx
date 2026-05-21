"use client";

import { useState } from "react";

// Retro popup ads — scan view only. A meta gag: the "umbra ad goes here"
// placeholder, dressed up as a Web-1.0 skyscraper popup. Two windows flank
// the content on wide screens; a single popup shows below 1440px (no room
// to fit two without overlapping the 1080px content column).

const COMIC = '"Comic Sans MS", "Comic Sans", "Chalkboard SE", cursive';
const HEAVY = '"Arial Black", "Arial Bold", Arial, sans-serif';

type Slot = "left" | "right" | "mobile";

function WinControls({ onClose }: { onClose: () => void }) {
  return (
    <span className="flex items-center gap-[3px]">
      {["–", "▢"].map((g) => (
        <span
          key={g}
          aria-hidden
          className="retro-knob grid h-[14px] w-[16px] place-items-center text-[8px] leading-none"
        >
          {g}
        </span>
      ))}
      <button
        type="button"
        onClick={onClose}
        aria-label="close ad"
        className="retro-knob grid h-[14px] w-[16px] cursor-pointer place-items-center text-[8px] font-bold leading-none hover:bg-[#ff6a4d]"
      >
        ✕
      </button>
    </span>
  );
}

function TitleBar({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div className="retro-bar flex shrink-0 items-center justify-between gap-2 px-1.5 py-[3px]">
      <span className="truncate text-[9px] font-bold tracking-[0.06em]">
        {title}
      </span>
      <WinControls onClose={onClose} />
    </div>
  );
}

const SIDE = {
  left: {
    title: "★ SPONSORED ★",
    cta: "▶ CLICK HERE ◀",
    slot: "banner pending",
    rating: "4,991,200 happy clickers",
    marquee: "★ your banner ad could be here ★ act now ★ 100% free* ★ ",
    foot: "you are visitor #000,001",
  },
  right: {
    title: "✦ OUR SPONSOR ✦",
    cta: "▶ DOWNLOAD NOW ◀",
    slot: "space available",
    rating: "voted #1 ad slot, 9 years",
    marquee: "★ premium ad space ★ reserved for umbra ★ click click ★ ",
    foot: "a privacy tool. with popups. we know.",
  },
} as const;

function SideAd({
  side,
  onClose,
}: {
  side: "left" | "right";
  onClose: () => void;
}) {
  const c = SIDE[side];
  const edge =
    side === "left"
      ? { left: "clamp(4px, 1vw, 18px)" }
      : { right: "clamp(4px, 1vw, 18px)" };
  return (
    <div
      className="fixed top-1/2 z-40 -translate-y-1/2"
      style={{
        ...edge,
        width: "clamp(150px, calc((100vw - 1120px) / 2 - 14px), 228px)",
        height: "min(620px, 82vh)",
      }}
    >
      <div className="retro-ad flex h-full flex-col">
        <TitleBar title={c.title} onClose={onClose} />
        <div className="flex flex-1 flex-col gap-2 px-2.5 pb-3 pt-2.5 text-center">
          <span
            aria-hidden
            className="text-[9px] uppercase tracking-[0.22em] text-[#9396c4]"
          >
            ‹ advertisement ›
          </span>
          <span className="retro-throb inline-block leading-none">
            <span
              className="retro-rainbow block font-black"
              style={{ fontFamily: HEAVY, fontSize: "34px" }}
            >
              UMBRA
            </span>
            <span className="mt-1.5 block text-[14px] font-bold tracking-[0.05em]">
              AD GOES HERE
            </span>
          </span>
          {/* faux unfilled ad creative — absorbs the extra skyscraper height */}
          <div
            aria-hidden
            className="flex flex-1 flex-col items-center justify-center gap-1 border-2 border-dashed border-[#4a4f7e]"
            style={{
              background:
                "repeating-linear-gradient(45deg, transparent 0 7px, rgba(255,255,255,0.045) 7px 14px)",
            }}
          >
            <span className="text-[28px] leading-none text-[#5a5f8e]">▨</span>
            <span className="text-[10px] tracking-[0.12em] text-[#9396c4]">
              {c.slot}
            </span>
            <span className="text-[8px] text-[#6f739c]">160 × 600</span>
          </div>
          <span
            aria-hidden
            className="retro-cta retro-blink block px-2 py-2 text-[12px] font-black tracking-[0.02em]"
          >
            {c.cta}
          </span>
          <span className="flex flex-col items-center gap-0.5">
            <span aria-hidden className="text-[12px] leading-none text-[#ffcd6c]">
              ★★★★★
            </span>
            <span className="text-[8px] text-[#9396c4]">{c.rating}</span>
          </span>
          <span className="retro-marquee block border-y border-[#363b66] py-1 text-[10px] text-[#ffcd6c]">
            <span>{c.marquee.repeat(2)}</span>
          </span>
          <span
            className="text-[9px] leading-tight text-[#9396c4]"
            style={{ fontFamily: COMIC }}
          >
            {c.foot}
          </span>
        </div>
      </div>
    </div>
  );
}

function MobileAd({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed bottom-3 left-1/2 z-40 -translate-x-1/2"
      style={{ width: "min(348px, 92vw)" }}
    >
      <div className="retro-ad">
        <TitleBar title="★ A WORD FROM OUR SPONSOR ★" onClose={onClose} />
        <div className="flex items-center gap-2.5 px-2.5 py-2.5">
          <div className="flex min-w-0 flex-1 flex-col gap-0.5 text-center">
            <span
              aria-hidden
              className="text-[8px] uppercase tracking-[0.22em] text-[#9396c4]"
            >
              ‹ advertisement ›
            </span>
            <span
              className="retro-rainbow font-black leading-[1.05]"
              style={{ fontFamily: HEAVY, fontSize: "18px" }}
            >
              UMBRA AD GOES HERE
            </span>
            <span
              className="text-[8px] leading-tight text-[#9396c4]"
              style={{ fontFamily: COMIC }}
            >
              a privacy tool with a popup. on purpose.
            </span>
          </div>
          <span
            aria-hidden
            className="retro-cta retro-blink shrink-0 px-2 py-1.5 text-center text-[10px] font-black leading-[1.1]"
          >
            ▶
            <br />
            CLICK
            <br />◀
          </span>
        </div>
      </div>
    </div>
  );
}

export function RetroAds() {
  const [open, setOpen] = useState<Record<Slot, boolean>>({
    left: true,
    right: true,
    mobile: true,
  });
  const close = (k: Slot) => setOpen((o) => ({ ...o, [k]: false }));

  return (
    <>
      {/* desktop + landscape tablet — a skyscraper on each side of content */}
      <div className="hidden min-[1440px]:block">
        {open.left && <SideAd side="left" onClose={() => close("left")} />}
        {open.right && <SideAd side="right" onClose={() => close("right")} />}
      </div>
      {/* mobile + narrow tablet — one popup, no room to flank */}
      <div className="min-[1440px]:hidden">
        {open.mobile && <MobileAd onClose={() => close("mobile")} />}
      </div>
    </>
  );
}
