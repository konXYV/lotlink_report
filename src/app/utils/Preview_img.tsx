import { useState, useEffect } from "react";
import { createPortal } from "react-dom";

// ✅ เพิ่ม className เข้าไปใน Type Props
export const ImageCell = ({
  src,
  alt,
  className = "h-11 w-11", // ✅ กำหนดค่า Default เผื่อไว้ถ้าไม่ระบุ
}: {
  src: string;
  alt: string;
  className?: string; // ✅ เพิ่มบรรทัดนี้
}) => {
  const [open, setOpen] = useState(false);
  const [zoomed, setZoomed] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const handleClose = () => {
    setOpen(false);
    setZoomed(false);
  };

  return (
    <>
      {/* Thumbnail */}
      <div
        onClick={() => setOpen(true)}
        className={`group relative cursor-zoom-in overflow-hidden rounded-xl border border-slate-200 transition hover:border-blue-400 hover:shadow-md ${className}`}
      >
        <img
          src={src}
          alt={alt}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
          onError={(e) => {
            e.currentTarget.src = "https://placehold.co/120x120?text=No+Image";
          }}
        />
        <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-all group-hover:bg-black/20">
          <svg
            className="h-4 w-4 scale-0 text-white transition-transform group-hover:scale-100"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"
            />
          </svg>
        </div>
      </div>

      {/* Portal Modal (ส่วนนี้คงเดิมไว้ ไม่มีผลต่อรูปเล็ก) */}
      {open &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-6 bg-black/75 backdrop-blur-sm"
            onClick={handleClose}
          >
            <div
              className="relative flex max-h-[90vh] max-w-[90vw] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                onClick={handleClose}
                className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white transition hover:bg-black/80"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>

              {/* Image Box */}
              <div
                className={`overflow-auto transition-all duration-300 ${zoomed ? "max-h-[85vh] max-w-[85vw]" : "max-h-[75vh] max-w-[75vw]"}`}
              >
                <img
                  src={src}
                  alt={alt}
                  onClick={() => setZoomed((z) => !z)}
                  className={`object-contain transition-all duration-300 ${
                    zoomed
                      ? "w-full cursor-zoom-out scale-100"
                      : "max-h-[75vh] max-w-[75vw] cursor-zoom-in"
                  }`}
                  onError={(e) => {
                    e.currentTarget.src =
                      "https://placehold.co/400x400?text=No+Image";
                  }}
                />
              </div>

              {/* Footer */}
              <div className="border-t border-slate-100 px-4 py-2.5 flex items-center justify-between">
                <p className="truncate text-xs text-slate-500 max-w-[200px]">
                  {alt}
                </p>
                <p className="text-xs text-slate-400">
                  {zoomed ? "Click รูปเพื่อย่อ" : "Click รูปเพื่อขยาย"} · ESC
                  ເພື່ອປິດ
                </p>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
};
