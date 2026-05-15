"use client";

import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { CustomCharacterForm } from "./custom-character-form";

export function CustomCharacterModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <Button
        className="bg-[#c86f4a] text-[#130f0c] shadow-lg shadow-[#c86f4a]/20 hover:bg-[#e0875f]"
        onClick={() => setOpen(true)}
        type="button"
      >
        创建自定义角色
      </Button>

      {open ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 px-4 py-6 backdrop-blur-sm">
          <div className="max-h-[92vh] w-full max-w-3xl overflow-hidden border border-[#f8f0df]/20 bg-[#15130f] text-[#f8f0df] shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#f8f0df]/15 px-5 py-4">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.22em] text-[#c86f4a]">Custom archive</p>
                <p className="mt-1 text-sm font-semibold">自定义角色</p>
              </div>
              <button
                aria-label="关闭"
                className="flex h-9 w-9 items-center justify-center rounded-md hover:bg-[#f8f0df]/10"
                onClick={() => setOpen(false)}
                type="button"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <div className="max-h-[calc(92vh-74px)] overflow-y-auto p-5">
              <CustomCharacterForm onCreated={() => setOpen(false)} />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
