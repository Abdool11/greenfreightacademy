"use client";

import { usePathname } from "next/navigation";
import { Navigation } from "./Navigation";
import { Footer } from "./Footer";

export function ConditionalChrome() {
  const pathname = usePathname();
  if (pathname?.startsWith("/admin")) return null;
  return (
    <>
      <Navigation />
      <Footer />
    </>
  );
}
