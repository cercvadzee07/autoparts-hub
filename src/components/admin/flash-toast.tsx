"use client";

import { useEffect, useRef } from "react";
import { useToast } from "@/components/ui/toast";

/** Shows a toast once when a redirect lands with a flag like ?deleted=1. */
export function FlashToast({ show, message }: { show: boolean; message: string }) {
  const toast = useToast();
  const shown = useRef(false);
  useEffect(() => {
    if (show && !shown.current) {
      shown.current = true;
      toast(message);
      const url = new URL(window.location.href);
      url.searchParams.delete("deleted");
      url.searchParams.delete("created");
      window.history.replaceState(null, "", url);
    }
  }, [show, message, toast]);
  return null;
}
