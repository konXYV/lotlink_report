// src/lib/issueService.ts
import {
  collection, addDoc, updateDoc, deleteDoc,
  doc, query, orderBy, Timestamp, onSnapshot,
} from "firebase/firestore";
import { db } from "./firebase";

export type IssueStatus = "pending" | "in_progress" | "done";

export interface Issue {
  id?:          string;
  issueCode?:   string;
  category:     string;
  no:           number;
  description:  string;
  reportedDate: Timestamp | null;
  resolvedDate: Timestamp | null;
  note:         string;
  status:       IssueStatus;
  images?:      string[];
  deleted?:     boolean;
  deletedAt?:   Timestamp;
  createdAt?:   Timestamp;
  updatedAt?:   Timestamp;
}

export interface IssueFormData {
  issueCode?:   string;
  category:     string;
  no:           number;
  description:  string;
  reportedDate: string;
  resolvedDate: string;
  note:         string;
  status:       IssueStatus;
  images?:      string[];
}

const COLLECTION = "issues";

// ── Single snapshot ที่ใช้ร่วมกัน — filter client-side ──────────────────────
// เปิด 1 listener เท่านั้น แล้วแยก active/deleted ด้วย callback

export const subscribeToAllIssues = (
  onActive:  (issues: Issue[]) => void,
  onDeleted: (issues: Issue[]) => void,
) => {
  const q = query(collection(db, COLLECTION), orderBy("no", "asc"));
  return onSnapshot(q, (snapshot) => {
    const all = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Issue));
    onActive(all.filter((i) => !i.deleted));
    onDeleted(all.filter((i) => i.deleted === true));
  });
};

// ── Convenience: single-purpose subscribers (ใช้ในหน้าที่ต้องการแค่ active) ──
export const subscribeToIssues = (callback: (issues: Issue[]) => void) => {
  const q = query(collection(db, COLLECTION), orderBy("no", "asc"));
  return onSnapshot(q, (snapshot) => {
    const all = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Issue));
    callback(all.filter((i) => !i.deleted));
  });
};

export const addIssue = async (data: IssueFormData): Promise<string> => {
  const ref = await addDoc(collection(db, COLLECTION), {
    ...data,
    images: data.images ?? [],
    deleted: false,
    reportedDate: data.reportedDate ? Timestamp.fromDate(new Date(data.reportedDate)) : null,
    resolvedDate: data.resolvedDate ? Timestamp.fromDate(new Date(data.resolvedDate)) : null,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
  return ref.id;
};

export const updateIssue = async (id: string, data: Partial<IssueFormData>): Promise<void> => {
  const { reportedDate, resolvedDate, ...rest } = data;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const upd: Record<string, any> = { ...rest, updatedAt: Timestamp.now() };
  if (reportedDate !== undefined)
    upd.reportedDate = reportedDate ? Timestamp.fromDate(new Date(reportedDate)) : null;
  if (resolvedDate !== undefined)
    upd.resolvedDate = resolvedDate ? Timestamp.fromDate(new Date(resolvedDate)) : null;
  await updateDoc(doc(db, COLLECTION, id), upd);
};

export const softDeleteIssue = async (id: string): Promise<void> => {
  await updateDoc(doc(db, COLLECTION, id), {
    deleted: true,
    deletedAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
};

export const restoreIssue = async (id: string): Promise<void> => {
  await updateDoc(doc(db, COLLECTION, id), {
    deleted: false,
    deletedAt: null,
    updatedAt: Timestamp.now(),
  });
};

export const permanentDeleteIssue = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, COLLECTION, id));
};

export const seedInitialData = async (issues: IssueFormData[]): Promise<void> => {
  for (const issue of issues) {
    await addDoc(collection(db, COLLECTION), {
      ...issue,
      images: [],
      deleted: false,
      reportedDate: issue.reportedDate ? Timestamp.fromDate(new Date(issue.reportedDate)) : null,
      resolvedDate: issue.resolvedDate ? Timestamp.fromDate(new Date(issue.resolvedDate)) : null,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
  }
};