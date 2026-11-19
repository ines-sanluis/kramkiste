"use client";

import dynamic from "next/dynamic";

/** Loads the three.js snow only in the browser, in its own chunk. */
const SnowScene = dynamic(() => import("./SnowScene"), { ssr: false });

export function SnowLayer() {
  return <SnowScene />;
}
