"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { Ban, Check, LoaderCircle, RotateCcw, Trash2 } from "lucide-react";
import { approveUser, banUser, deleteUser, restoreUser, type UserActionState } from "@/app/actions/users";

type UserStatus = "pending" | "active" | "banned";

export function UserAccessActions({ userId, status, isAdmin, isSelf }: { userId: string; status: UserStatus; isAdmin: boolean; isSelf: boolean }) {
  const router = useRouter();
  const [approveState, approveAction, approving] = useActionState(async (previous: UserActionState, formData: FormData) => {
    const result = await approveUser(previous, formData);
    if (result.success) router.refresh();
    return result;
  }, {});
  const [banState, banAction, banning] = useActionState(async (previous: UserActionState, formData: FormData) => {
    const result = await banUser(previous, formData);
    if (result.success) router.refresh();
    return result;
  }, {});
  const [restoreState, restoreAction, restoring] = useActionState(async (previous: UserActionState, formData: FormData) => {
    const result = await restoreUser(previous, formData);
    if (result.success) router.refresh();
    return result;
  }, {});
  const [deleteState, deleteAction, deleting] = useActionState(async (previous: UserActionState, formData: FormData) => {
    const result = await deleteUser(previous, formData);
    if (result.success) router.refresh();
    return result;
  }, {});
  const disabled = isAdmin || isSelf;

  return <div className="flex flex-wrap items-center gap-2 lg:justify-end">
    {status === "pending" && !disabled && <form action={approveAction}><input type="hidden" name="userId" value={userId} /><button disabled={approving} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#7057ed] px-3 text-[10px] font-semibold text-white hover:bg-[#6249df] disabled:opacity-60">{approving ? <LoaderCircle size={12} className="animate-spin" /> : <Check size={13} />} Approve</button></form>}
    {status === "active" && !disabled && <form action={banAction} onSubmit={(event) => { if (!window.confirm("Ban this user from signing in and accessing workspace data?")) event.preventDefault(); }}><input type="hidden" name="userId" value={userId} /><button disabled={banning} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-amber-200 px-3 text-[10px] font-semibold text-amber-800 hover:bg-amber-50 disabled:opacity-60">{banning ? <LoaderCircle size={12} className="animate-spin" /> : <Ban size={13} />} Ban</button></form>}
    {status === "banned" && !disabled && <form action={restoreAction}><input type="hidden" name="userId" value={userId} /><button disabled={restoring} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-emerald-200 px-3 text-[10px] font-semibold text-emerald-800 hover:bg-emerald-50 disabled:opacity-60">{restoring ? <LoaderCircle size={12} className="animate-spin" /> : <RotateCcw size={13} />} Restore</button></form>}
    {!disabled && <form action={deleteAction} onSubmit={(event) => { if (!window.confirm("Permanently delete this user and remove their sign-in account? This cannot be undone.")) event.preventDefault(); }}><input type="hidden" name="userId" value={userId} /><button disabled={deleting} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-rose-200 px-3 text-[10px] font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-60">{deleting ? <LoaderCircle size={12} className="animate-spin" /> : <Trash2 size={13} />} Delete</button></form>}
    {approveState.error && <p role="alert" className="basis-full text-[10px] text-rose-700">{approveState.error}</p>}{banState.error && <p role="alert" className="basis-full text-[10px] text-rose-700">{banState.error}</p>}{restoreState.error && <p role="alert" className="basis-full text-[10px] text-rose-700">{restoreState.error}</p>}{deleteState.error && <p role="alert" className="basis-full text-[10px] text-rose-700">{deleteState.error}</p>}
  </div>;
}
