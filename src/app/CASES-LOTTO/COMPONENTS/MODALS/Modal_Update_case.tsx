import React, { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { useOffCaseMutation } from "../../hooks/Hooks_Cases";
import { useAuth } from "@/lib/authContext";

type ModalUpdateCaseProps = {
  isOpen: boolean;
  onClose: () => void;
  caseNumber?: string;
};

interface CaseSupportUpdatePayload {
  status: string;
  userUpdate: string;
}

const STATUS_OPTIONS = [
  { value: "ແກ້ໄຂແລ້ວ", label: "ແກ້ໄຂແລ້ວ" },
  { value: "ປິດເຄສສຳເລັດແລ້ວ", label: "ປິດເຄສສຳເລັດແລ້ວ" },
] as const;

const inputClass =
  "mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500";

const Modal_Update_case = ({
  isOpen,
  onClose,
  caseNumber,
}: ModalUpdateCaseProps) => {
  const router = useRouter();
  const { mutate, isPending, isError, error } = useOffCaseMutation();
  const { user } = useAuth();
  // ໃນ PageContent — ກ່ອນ return
  //   console.log("caseNumber from URL:", caseNumber);
  // ✅ แก้: fullname เป็น string ไม่ใช่ function
  const fullname = useMemo(() => user?.displayName ?? "", [user]);

  const [form, setForm] = useState<CaseSupportUpdatePayload>({
    status: STATUS_OPTIONS[0].value,
    userUpdate: fullname, // ✅ ไม่ใส่ ()
  });

  useEffect(() => {
    if (isOpen) {
      setForm({
        status: STATUS_OPTIONS[0].value,
        userUpdate: fullname, // ✅ ไม่ใส่ ()
      });
    }
  }, [isOpen, fullname]);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleUpdate = () => {
    if (!caseNumber) {
      toast.error("Case number not found");
      return;
    }

    mutate(
      {
        id: caseNumber, // ✅ แก้: useUpdateCaseMutation รับ { id, data }
        userName: fullname,
        status: form.status, //
      },
      {
        onSuccess: () => {
          toast.success("ອັບເດດສະຖານະສຳເລັດ");
          onClose();
          router.push("/CASES-LOTTO");
        },
        onError: (err) => {
          toast.error((err as Error)?.message || "Update failed");
        },
      },
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 pt-3"
      onClick={onClose}
    >
      <div
        className="mt-10 w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Update Case</h2>
            <p className="mt-1 text-sm text-slate-500">
              ກວດສອບ ແລະ ອັບເດດຂໍ້ມູນ case
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
          >
            ✕
          </button>
        </div>

        {/* Case number display */}
        <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs text-slate-500">Case Number</p>
          <p className="mt-1 break-all text-base font-semibold text-slate-800">
            {caseNumber || "-"}
          </p>
        </div>

        {/* Updated by */}
        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs text-slate-500">ອັບເດດໂດຍ</p>
          <p className="mt-1 text-base font-semibold text-slate-800">
            {fullname || "-"}
          </p>
        </div>

        {/* Status select */}
        <div className="mt-5 grid grid-cols-1 gap-4">
          <div>
            <label className="text-sm font-medium text-slate-700">ສະຖານະ</label>
            <select
              name="status"
              value={form.status}
              onChange={handleChange}
              className={inputClass}
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Error */}
        {isError && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {(error as Error)?.message || "Update failed"}
          </div>
        )}

        {/* Actions */}
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            ຍົກເລີກ
          </button>
          <button
            type="button"
            onClick={handleUpdate}
            disabled={isPending || !caseNumber}
            className="rounded-xl bg-primary-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-800 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {isPending ? "ກຳລັງບັນທຶກ..." : "ບັນທຶກ"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Modal_Update_case;
