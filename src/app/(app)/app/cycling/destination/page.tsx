"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PageContainer } from "@/components/layout/Header";

/** Przekierowanie — jedna strona destynacji dla trybu rowerowego. */
export default function CyclingDestinationRedirect() {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    router.replace(`/app/destination?${searchParams.toString()}`);
  }, [searchParams, router]);

  return (
    <PageContainer>
      <p className="text-sm text-text-secondary">Przekierowuję…</p>
    </PageContainer>
  );
}
