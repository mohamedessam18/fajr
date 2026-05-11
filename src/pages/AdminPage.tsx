import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import {
  AlertCircle,
  CheckCircle2,
  Coins,
  HandHeart,
  LayoutDashboard,
  Lock,
  LogOut,
  Pencil,
  Plus,
  Save,
  Settings,
  Shield,
  Trash2,
  Upload,
  User,
  Users,
  Wallet,
  X,
  XCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { trpc } from "@/providers/trpc";
import { useAdmin } from "@/hooks/useAdmin";
import { formatDate, formatMoney } from "@/lib/format";

type AdminTab = "participants" | "donations" | "money" | "settings";

type ParticipantFormData = {
  id?: number;
  name: string;
  missedCount?: number;
  paidAmount?: number;
  unpaidAmount?: number;
  image: string;
};

type MediaDraft = {
  url: string;
  pathname?: string | null;
  type: "image" | "video";
  mimeType?: string | null;
  fileName?: string | null;
  size?: number | null;
  sortOrder?: number;
};

type DonationFormData = {
  title: string;
  summary: string;
  description: string;
  amount: number;
  donatedAt: string;
  published: boolean;
  media: MediaDraft[];
};

const emptyParticipant: ParticipantFormData = {
  name: "",
  image: "",
};

const emptyDonation: DonationFormData = {
  title: "",
  summary: "",
  description: "",
  amount: 0,
  donatedAt: new Date().toISOString().slice(0, 10),
  published: true,
  media: [],
};

const SAVE_TIMEOUT_MS = 20000;

function getAdminToken() {
  return localStorage.getItem("sahseh_admin_token") ?? "";
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function AdminPage() {
  const navigate = useNavigate();
  const { isAdmin, login, logout } = useAdmin();
  const utils = trpc.useUtils();
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginPending, setLoginPending] = useState(false);
  const [activeTab, setActiveTab] = useState<AdminTab>("participants");
  const [participantForm, setParticipantForm] = useState<ParticipantFormData>(emptyParticipant);
  const [participantOpen, setParticipantOpen] = useState(false);
  const [participantSaving, setParticipantSaving] = useState(false);
  const [absenceDate, setAbsenceDate] = useState(new Date().toISOString().slice(0, 10));
  const [absencePaid, setAbsencePaid] = useState(true);
  const [donationOpen, setDonationOpen] = useState(false);
  const [donationStep, setDonationStep] = useState(1);
  const [donationForm, setDonationForm] = useState<DonationFormData>(emptyDonation);
  const [uploading, setUploading] = useState(false);
  const [participantImageUploading, setParticipantImageUploading] = useState(false);
  const [confirmCloseCycle, setConfirmCloseCycle] = useState(false);

  const participantsQuery = trpc.participant.list.useQuery(undefined, { enabled: isAdmin });
  const statsQuery = trpc.participant.stats.useQuery(undefined, { enabled: isAdmin });
  const donationsQuery = trpc.admin.listDonations.useQuery(undefined, { enabled: isAdmin });
  const fundSummaryQuery = trpc.admin.fundSummary.useQuery(undefined, { enabled: isAdmin });
  const ledgerQuery = trpc.moneyFlow.adminLedger.useQuery(undefined, { enabled: isAdmin });
  const fineAmountQuery = trpc.admin.getFineAmount.useQuery(undefined, { enabled: isAdmin });
  const participantDetailsQuery = trpc.participant.byId.useQuery(
    { id: participantForm.id ?? 0 },
    { enabled: isAdmin && participantOpen && Boolean(participantForm.id) },
  );
  const adminAuthError = [
    donationsQuery.error,
    fundSummaryQuery.error,
    ledgerQuery.error,
  ].some((error) => error?.data?.code === "UNAUTHORIZED");

  useEffect(() => {
    if (!adminAuthError) return;
    logout();
    toast.error("انتهت صلاحية الجلسة. سجل الدخول مرة تانية.");
  }, [adminAuthError, logout]);

  const createDonation = trpc.admin.createDonation.useMutation({
    onSuccess: (result) => {
      if (!result.success) {
        if (result.error === "INSUFFICIENT_BALANCE") toast.error("الرصيد غير كافي");
        if (result.error === "CLOSE_CYCLE_CONFIRMATION_REQUIRED") {
          setConfirmCloseCycle(true);
          toast.message("هذا التبرع يساوي الرصيد بالكامل، أكد إقفال الدورة.");
        }
        return;
      }
      toast.success(result.closedCycle ? "تم حفظ التبرع وإقفال الدورة" : "تم حفظ التبرع");
      setDonationOpen(false);
      setDonationStep(1);
      setConfirmCloseCycle(false);
      setDonationForm(emptyDonation);
      refreshAll();
    },
    onError: () => toast.error("تعذر حفظ التبرع"),
  });

  const deleteDonation = trpc.admin.deleteDonation.useMutation({
    onSuccess: (result) => {
      if (!result.success) {
        toast.error("لا يمكن حذف تبرع أغلق دورة محفوظة");
        return;
      }
      toast.success("تم حذف التبرع");
      refreshAll();
    },
  });

  const addParticipant = trpc.admin.addParticipant.useMutation({
    onSuccess: () => {
      toast.success("تم إضافة المشارك");
      setParticipantOpen(false);
      setParticipantForm(emptyParticipant);
      refreshAll();
    },
    onError: () => toast.error("تعذر إضافة المشارك"),
  });

  const updateParticipant = trpc.admin.updateParticipant.useMutation({
    onSuccess: () => {
      toast.success("تم تحديث بيانات المشارك");
      refreshAll();
    },
    onError: () => toast.error("تعذر تحديث المشارك"),
  });

  const addMissedRecord = trpc.admin.addMissedRecord.useMutation({
    onSuccess: () => {
      toast.success(absencePaid ? "تم تسجيل الغياب كمدفوع" : "تم تسجيل الغياب كمستحق");
      refreshAll();
      setAbsenceDate(new Date().toISOString().slice(0, 10));
    },
    onError: () => toast.error("تعذر إضافة الغياب"),
  });

  const updateMissedRecord = trpc.admin.updateMissedRecord.useMutation({
    onSuccess: () => {
      toast.success("تم تسديد الغياب");
      refreshAll();
    },
    onError: () => toast.error("تعذر تسديد الغياب"),
  });

  const tabs = [
    { id: "participants" as const, label: "المشاركون", icon: Users },
    { id: "donations" as const, label: "التبرعات", icon: HandHeart },
    { id: "money" as const, label: "سجل الفلوس", icon: Wallet },
    { id: "settings" as const, label: "الإعدادات", icon: Settings },
  ];

  const ledgerCycles = ledgerQuery.data?.cycles ?? [];
  const activeCycle = ledgerCycles.find((cycle) => cycle.status === "active") ?? ledgerCycles[0];
  const currentBalance = fundSummaryQuery.data?.balance ?? activeCycle?.balance ?? 0;
  const fineAmount = fineAmountQuery.data?.amount ?? 10;
  const participantDetails = participantDetailsQuery.data;
  const participantSnapshot = participantDetails ?? participantForm;
  const balanceAfterDonation = currentBalance - donationForm.amount;
  const closesCycle = donationForm.amount > 0 && donationForm.amount === currentBalance;

  const donationCanContinue = useMemo(() => {
    if (donationStep === 1) {
      return donationForm.title.trim() && donationForm.description.trim() && donationForm.amount > 0;
    }
    return true;
  }, [donationForm, donationStep]);

  function refreshAll() {
    utils.admin.listParticipants.invalidate();
    utils.participant.list.invalidate();
    utils.participant.stats.invalidate();
    utils.admin.listDonations.invalidate();
    utils.admin.fundSummary.invalidate();
    utils.moneyFlow.adminLedger.invalidate();
    utils.moneyFlow.publicLedger.invalidate();
    utils.donation.list.invalidate();
    utils.participant.byId.invalidate();
  }

  async function loginAdmin(event: React.FormEvent) {
    event.preventDefault();
    if (!password.trim()) return;
    setLoginPending(true);
    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = (await response.json()) as { success: boolean; token: string | null };
      if (data.success && data.token) {
        login(data.token);
        setLoginError("");
        toast.success("تم تسجيل الدخول");
      } else {
        setLoginError("كلمة المرور غير صحيحة");
      }
    } catch {
      setLoginError("تعذر تسجيل الدخول");
    } finally {
      setLoginPending(false);
    }
  }

  function editParticipant(participant: NonNullable<typeof participantsQuery.data>[number]) {
    setParticipantForm({
      id: participant.id,
      name: participant.name,
      image: participant.image || "",
    });
    setAbsenceDate(new Date().toISOString().slice(0, 10));
    setAbsencePaid(true);
    setParticipantOpen(true);
  }

  async function saveParticipant(event: React.FormEvent) {
    return saveParticipantBasics(event);
    event.preventDefault();
    if (!participantForm.name.trim()) {
      toast.error("اسم المشارك مطلوب");
      return;
    }
    setParticipantSaving(true);
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), SAVE_TIMEOUT_MS);
    try {
      const response = await fetch(
        participantForm.id ? `/api/admin/participants/${participantForm.id}` : "/api/admin/participants",
        {
          method: participantForm.id ? "PUT" : "POST",
          headers: {
            authorization: `Bearer ${getAdminToken()}`,
            "content-type": "application/json",
          },
          body: JSON.stringify(participantForm),
          signal: controller.signal,
        },
      );
      if (!response.ok) throw new Error("Save failed");
      toast.success(participantForm.id ? "تم تحديث المشارك" : "تم إضافة المشارك");
      setParticipantOpen(false);
      setParticipantForm(emptyParticipant);
      refreshAll();
    } catch {
      toast.error("تعذر حفظ المشارك");
    } finally {
      window.clearTimeout(timeout);
      setParticipantSaving(false);
    }
  }

  async function saveParticipantBasics(event: React.FormEvent) {
    event.preventDefault();
    if (!participantForm.name.trim()) {
      toast.error("اسم المشارك مطلوب");
      return;
    }

    setParticipantSaving(true);
    try {
      if (participantForm.id) {
        await updateParticipant.mutateAsync({
          id: participantForm.id,
          name: participantForm.name.trim(),
          image: participantForm.image.trim(),
        });
      } else {
        await addParticipant.mutateAsync({
          name: participantForm.name.trim(),
          image: participantForm.image.trim() || undefined,
        });
      }
    } finally {
      setParticipantSaving(false);
    }
  }

  function addParticipantAbsence() {
    if (!participantForm.id) return;
    addMissedRecord.mutate({
      participantId: participantForm.id,
      date: absenceDate,
      amount: fineAmount,
      paid: absencePaid,
    });
  }

  function payMissedRecord(id: number) {
    updateMissedRecord.mutate({ id, paid: true });
  }

  async function deleteParticipant(id: number, name: string) {
    if (!window.confirm(`هل تريد حذف ${name}؟`)) return;
    const response = await fetch(`/api/admin/participants/${id}`, {
      method: "DELETE",
      headers: { authorization: `Bearer ${getAdminToken()}` },
    });
    if (response.ok) {
      toast.success("تم حذف المشارك");
      refreshAll();
    } else {
      toast.error("تعذر حذف المشارك");
    }
  }

  async function uploadDonationFiles(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    try {
      const uploaded: MediaDraft[] = [];
      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
          toast.error(`${file.name} ليس صورة أو فيديو`);
          continue;
        }
        if (file.size > 25 * 1024 * 1024) {
          toast.error(`${file.name} أكبر من 25MB`);
          continue;
        }
        const dataUrl = await readFileAsDataUrl(file);
        const response = await fetch("/api/admin/uploads", {
          method: "POST",
          headers: {
            authorization: `Bearer ${getAdminToken()}`,
            "content-type": "application/json",
          },
          body: JSON.stringify({
            dataUrl,
            fileName: file.name,
            mimeType: file.type,
          }),
        });
        const data = (await response.json()) as { success: boolean; media?: MediaDraft; error?: string };
        if (!response.ok || !data.success || !data.media) throw new Error(data.error || "Upload failed");
        uploaded.push({ ...data.media, sortOrder: donationForm.media.length + uploaded.length });
      }
      setDonationForm((current) => ({ ...current, media: [...current.media, ...uploaded] }));
      if (uploaded.length) toast.success("تم رفع الملفات");
    } catch {
      toast.error("تعذر رفع الملفات. تأكد من إعداد Vercel Blob.");
    } finally {
      setUploading(false);
    }
  }

  async function uploadParticipantImage(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("اختر ملف صورة فقط");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("حجم صورة المشارك يجب أن يكون أقل من 5MB");
      return;
    }

    setParticipantImageUploading(true);
    try {
      const dataUrl = await readFileAsDataUrl(file);
      const response = await fetch("/api/admin/uploads", {
        method: "POST",
        headers: {
          authorization: `Bearer ${getAdminToken()}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          dataUrl,
          fileName: file.name,
          mimeType: file.type,
        }),
      });
      const data = (await response.json()) as { success: boolean; media?: MediaDraft; error?: string };
      if (!response.ok || !data.success || !data.media) throw new Error(data.error || "Upload failed");
      setParticipantForm((current) => ({ ...current, image: data.media?.url ?? "" }));
      toast.success("تم رفع صورة المشارك");
    } catch {
      toast.error("تعذر رفع صورة المشارك. تأكد من إعداد Vercel Blob.");
    } finally {
      setParticipantImageUploading(false);
    }
  }

  function submitDonation() {
    if (donationForm.amount > currentBalance) {
      toast.error("الرصيد غير كافي");
      return;
    }
    createDonation.mutate({
      ...donationForm,
      summary: donationForm.summary.trim() || undefined,
      confirmCloseCycle,
      media: donationForm.media.map((media, index) => ({ ...media, sortOrder: index })),
    });
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center relative" dir="rtl">
        <div className="absolute inset-0 sunrise-gradient" />
        <motion.form
          onSubmit={loginAdmin}
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative z-10 w-full max-w-md mx-4 glass-strong rounded-2xl p-8"
        >
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center mx-auto mb-4">
              <Shield className="w-8 h-8 text-amber-300" />
            </div>
            <h1 className="text-2xl font-bold text-gradient mb-2">لوحة التحكم</h1>
            <p className="text-sm text-muted-foreground">تسجيل دخول الأدمن</p>
          </div>
          <div className="relative mb-4">
            <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="كلمة المرور"
              className="w-full pr-12 pl-4 py-3 rounded-xl glass border border-border/50 outline-none focus:border-amber-500/50"
            />
          </div>
          {loginError && <p className="mb-4 text-center text-sm text-red-300">{loginError}</p>}
          <button disabled={loginPending} className="w-full py-3 rounded-xl gold-gradient text-[#0a0e1a] font-bold">
            {loginPending ? "جاري الدخول..." : "دخول"}
          </button>
          <button
            type="button"
            onClick={() => navigate("/")}
            className="w-full mt-4 text-sm text-muted-foreground hover:text-foreground"
          >
            العودة للرئيسية
          </button>
        </motion.form>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative" dir="rtl">
      <div className="absolute inset-0 sunrise-gradient" />
      <div className="relative z-10 flex min-h-screen">
        <aside className="hidden lg:flex w-72 flex-col border-l border-border/40 bg-background/40 backdrop-blur-xl p-5">
          <div className="flex items-center gap-3 mb-8">
            <img src="/assets/logo.png" alt="" className="w-10 h-10 object-contain" />
            <div>
              <h1 className="font-bold text-gradient">صحصح للفجر</h1>
              <p className="text-xs text-muted-foreground">لوحة v1.2.0</p>
            </div>
          </div>
          <nav className="space-y-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 rounded-xl px-4 py-3 text-sm transition ${
                  activeTab === tab.id ? "bg-amber-500/15 text-amber-200" : "text-muted-foreground hover:bg-white/5"
                }`}
              >
                <tab.icon className="w-5 h-5" />
                {tab.label}
              </button>
            ))}
          </nav>
          <div className="mt-auto space-y-2">
            <button onClick={() => navigate("/")} className="w-full rounded-xl glass px-4 py-3 text-sm text-muted-foreground">
              العودة للموقع
            </button>
            <button
              onClick={() => {
                logout();
                toast.success("تم تسجيل الخروج");
              }}
              className="w-full flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm text-red-300 hover:bg-red-500/10"
            >
              <LogOut className="w-4 h-4" />
              تسجيل الخروج
            </button>
          </div>
        </aside>

        <main className="flex-1 p-4 md:p-8 overflow-x-hidden">
          <div className="lg:hidden mb-4 grid grid-cols-2 gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-xl px-3 py-2 text-sm ${activeTab === tab.id ? "bg-amber-500/15 text-amber-200" : "glass"}`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <header className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <p className="text-sm text-amber-300">لوحة التحكم</p>
              <h1 className="text-2xl md:text-4xl font-extrabold text-gradient">
                {tabs.find((tab) => tab.id === activeTab)?.label}
              </h1>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard icon={Coins} label="المجمع" value={formatMoney(statsQuery.data?.totalCollected)} />
              <StatCard icon={Wallet} label="الرصيد" value={formatMoney(currentBalance)} />
              <StatCard icon={Users} label="المشاركون" value={String(statsQuery.data?.totalParticipants ?? 0)} />
              <StatCard icon={LayoutDashboard} label="الدورة" value={activeCycle?.status === "active" ? "نشطة" : "مغلقة"} />
            </div>
          </header>

          {activeTab === "participants" && (
            <section className="glass-strong rounded-2xl overflow-hidden">
              <div className="p-5 border-b border-border/50 flex items-center justify-between">
                <h2 className="font-bold flex items-center gap-2">
                  <Users className="w-5 h-5 text-amber-300" />
                  المشاركون
                </h2>
                <button
                  onClick={() => {
                    setParticipantForm(emptyParticipant);
                    setParticipantOpen(true);
                  }}
                  className="rounded-xl gold-gradient px-4 py-2 text-sm font-bold text-[#0a0e1a] flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  إضافة
                </button>
              </div>
              <DataTable>
                <thead>
                  <tr className="border-b border-border/30 text-xs text-muted-foreground">
                    <th className="px-4 py-3 text-right">المشارك</th>
                    <th className="px-4 py-3 text-center">الغيابات</th>
                    <th className="px-4 py-3 text-center">المدفوع</th>
                    <th className="px-4 py-3 text-center">المستحق</th>
                    <th className="px-4 py-3 text-center">إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {participantsQuery.isLoading && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                        جاري تحميل المشاركين...
                      </td>
                    </tr>
                  )}
                  {participantsQuery.isError && !adminAuthError && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-red-300">
                        تعذر تحميل المشاركين
                      </td>
                    </tr>
                  )}
                  {!participantsQuery.isLoading && !participantsQuery.isError && !participantsQuery.data?.length && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                        لا يوجد مشاركون حالياً
                      </td>
                    </tr>
                  )}
                  {participantsQuery.data?.map((participant) => (
                    <tr key={participant.id} className="border-b border-border/20">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full overflow-hidden bg-muted">
                            {participant.image ? <img src={participant.image} alt="" className="w-full h-full object-cover" /> : <User className="m-3 w-4 h-4" />}
                          </div>
                          <span className="font-medium">{participant.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">{participant.missedCount}</td>
                      <td className="px-4 py-3 text-center text-emerald-300">{formatMoney(participant.paidAmount)}</td>
                      <td className="px-4 py-3 text-center text-amber-300">{formatMoney(participant.unpaidAmount)}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-center gap-2">
                          <IconButton onClick={() => editParticipant(participant)} icon={Pencil} />
                          <IconButton onClick={() => deleteParticipant(participant.id, participant.name)} icon={Trash2} danger />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </DataTable>
            </section>
          )}

          {activeTab === "donations" && (
            <section className="space-y-5">
              <div className="glass-strong rounded-2xl p-5 flex items-center justify-between">
                <div>
                  <h2 className="font-bold">إدارة التبرعات</h2>
                  <p className="text-sm text-muted-foreground">إضافة التبرعات تخصم من الرصيد وتظهر للزوار.</p>
                </div>
                <button
                  onClick={() => {
                    setDonationForm(emptyDonation);
                    setDonationStep(1);
                    setConfirmCloseCycle(false);
                    setDonationOpen(true);
                  }}
                  className="rounded-xl gold-gradient px-4 py-2 text-sm font-bold text-[#0a0e1a] flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  تبرع جديد
                </button>
              </div>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {donationsQuery.data?.map((donation) => (
                  <div key={donation.id} className="glass-strong rounded-2xl overflow-hidden">
                    <div className="aspect-video bg-muted/20">
                      {donation.media[0]?.type === "video" ? (
                        <video src={donation.media[0].url} className="w-full h-full object-cover" muted />
                      ) : donation.media[0] ? (
                        <img src={donation.media[0].url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <HandHeart className="w-10 h-10 text-amber-300" />
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="font-bold">{donation.title}</h3>
                        <span className="text-sm text-amber-200">{formatMoney(donation.amount)}</span>
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{donation.summary || donation.description}</p>
                      <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                        <span>{formatDate(donation.donatedAt)}</span>
                        <div className="flex gap-2">
                          <button onClick={() => navigate(`/donations/${donation.id}`)} className="text-amber-200">عرض</button>
                          <button onClick={() => deleteDonation.mutate({ id: donation.id })} className="text-red-300">حذف</button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {activeTab === "money" && (
            <section className="glass-strong rounded-2xl overflow-hidden">
              <div className="p-5 border-b border-border/50">
                <h2 className="font-bold">سجل الفلوس الكامل</h2>
                <p className="text-sm text-muted-foreground">الأدمن يرى أسماء المشاركين في حركات الدخول.</p>
              </div>
              <DataTable>
                <thead>
                  <tr className="border-b border-border/30 text-xs text-muted-foreground">
                    <th className="px-4 py-3 text-right">التاريخ</th>
                    <th className="px-4 py-3 text-right">الحركة</th>
                    <th className="px-4 py-3 text-right">المشارك</th>
                    <th className="px-4 py-3 text-center">النوع</th>
                    <th className="px-4 py-3 text-center">المبلغ</th>
                  </tr>
                </thead>
                <tbody>
                  {ledgerQuery.data?.entries.map((entry) => (
                    <tr key={entry.id} className="border-b border-border/20">
                      <td className="px-4 py-3 text-sm text-muted-foreground">{formatDate(entry.occurredAt)}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium">{entry.title}</div>
                        <div className="text-xs text-muted-foreground">{entry.description}</div>
                      </td>
                      <td className="px-4 py-3 text-sm">{entry.participantName ?? "-"}</td>
                      <td className="px-4 py-3 text-center">{entry.type.includes("out") ? "خروج" : "دخول"}</td>
                      <td className="px-4 py-3 text-center font-bold">{formatMoney(entry.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </DataTable>
            </section>
          )}

          {activeTab === "settings" && (
            <section className="grid gap-4 md:grid-cols-2">
              <div className="glass-strong rounded-2xl p-6">
                <h2 className="font-bold mb-3">إعدادات التخزين</h2>
                <p className="text-sm text-muted-foreground leading-7">
                  رفع الصور والفيديوهات يعتمد على Vercel Blob. يجب وجود متغير
                  <span className="mx-1 rounded bg-white/10 px-2 py-1 font-mono text-xs">BLOB_READ_WRITE_TOKEN</span>
                  في Vercel production.
                </p>
              </div>
              <div className="glass-strong rounded-2xl p-6">
                <h2 className="font-bold mb-3">الرصيد الحالي</h2>
                <p className="text-3xl font-extrabold text-amber-200">{formatMoney(currentBalance)}</p>
              </div>
            </section>
          )}
        </main>
      </div>

      <AnimatePresence>
        {participantOpen && (
          <Modal onClose={() => setParticipantOpen(false)} title={participantForm.id ? "تعديل مشارك" : "إضافة مشارك"}>
            <form onSubmit={saveParticipant} className="space-y-4">
              <TextInput label="الاسم" value={participantForm.name} onChange={(name) => setParticipantForm({ ...participantForm, name })} />
              <div className="rounded-2xl bg-white/5 p-4">
                <span className="mb-3 block text-sm text-muted-foreground">صورة المشارك</span>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  <div className="h-20 w-20 overflow-hidden rounded-full border border-border/50 bg-muted/30">
                    {participantForm.image ? (
                      <img src={participantForm.image} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <User className="h-7 w-7 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 space-y-2">
                    <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-amber-400/40 bg-amber-500/10 px-4 py-3 text-sm font-bold text-amber-100 transition hover:bg-amber-500/15">
                      <Upload className="h-4 w-4" />
                      {participantImageUploading ? "جاري رفع الصورة..." : "رفع صورة من الجهاز"}
                      <input
                        type="file"
                        accept="image/*"
                        disabled={participantImageUploading}
                        className="sr-only"
                        onChange={(event) => uploadParticipantImage(event.target.files?.[0])}
                      />
                    </label>
                    {participantForm.image && (
                      <button
                        type="button"
                        onClick={() => setParticipantForm((current) => ({ ...current, image: "" }))}
                        className="w-full rounded-xl bg-red-500/10 px-4 py-2 text-sm font-bold text-red-200 hover:bg-red-500/15"
                      >
                        حذف الصورة
                      </button>
                    )}
                  </div>
                </div>
              </div>
              <button disabled={participantSaving} className="w-full rounded-xl gold-gradient py-3 font-bold text-[#0a0e1a] flex items-center justify-center gap-2">
                <Save className="w-4 h-4" />
                {participantSaving ? "جاري الحفظ..." : "حفظ"}
              </button>
            </form>

            {participantForm.id && (
              <div className="mt-6 space-y-5">
                <div className="grid grid-cols-3 gap-3">
                  <SummaryTile label="الغيابات" value={String(participantSnapshot.missedCount ?? 0)} icon={XCircle} tone="red" />
                  <SummaryTile label="المدفوع" value={formatMoney(participantSnapshot.paidAmount)} icon={Coins} tone="green" />
                  <SummaryTile label="المستحق" value={formatMoney(participantSnapshot.unpaidAmount)} icon={AlertCircle} tone="amber" />
                </div>

                <div className="rounded-2xl bg-white/5 p-4">
                  <div className="mb-4">
                    <h3 className="font-bold">إضافة يوم غياب</h3>
                    <p className="text-xs text-muted-foreground">قيمة الغياب الحالية: {formatMoney(fineAmount)}</p>
                  </div>
                  <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                    <TextInput label="تاريخ الغياب" type="date" value={absenceDate} onChange={setAbsenceDate} />
                    <div>
                      <span className="mb-1.5 block text-sm text-muted-foreground">حالة الدفع</span>
                      <div className="grid grid-cols-2 overflow-hidden rounded-xl border border-border/50">
                        <button
                          type="button"
                          onClick={() => setAbsencePaid(true)}
                          className={`px-4 py-3 text-sm font-bold transition ${absencePaid ? "bg-emerald-500/20 text-emerald-200" : "bg-white/5 text-muted-foreground"}`}
                        >
                          مدفوع
                        </button>
                        <button
                          type="button"
                          onClick={() => setAbsencePaid(false)}
                          className={`px-4 py-3 text-sm font-bold transition ${!absencePaid ? "bg-amber-500/20 text-amber-200" : "bg-white/5 text-muted-foreground"}`}
                        >
                          غير مدفوع
                        </button>
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={addParticipantAbsence}
                    disabled={addMissedRecord.isPending || !absenceDate}
                    className="mt-4 w-full rounded-xl gold-gradient py-3 font-bold text-[#0a0e1a] disabled:opacity-50"
                  >
                    {addMissedRecord.isPending ? "جاري إضافة الغياب..." : "إضافة الغياب"}
                  </button>
                </div>

                <div className="rounded-2xl bg-white/5 p-4">
                  <h3 className="mb-3 font-bold">سجل الغيابات</h3>
                  {participantDetailsQuery.isLoading ? (
                    <p className="py-6 text-center text-sm text-muted-foreground">جاري تحميل السجل...</p>
                  ) : !participantDetails?.missedRecords.length ? (
                    <p className="py-6 text-center text-sm text-muted-foreground">لا توجد غيابات مسجلة</p>
                  ) : (
                    <div className="space-y-2">
                      {participantDetails.missedRecords.map((record) => (
                        <div key={record.id} className="flex flex-col gap-3 rounded-xl bg-background/30 p-3 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <div className="font-medium">{record.date}</div>
                            <div className="text-xs text-muted-foreground">{formatMoney(record.amount)}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`rounded-full px-3 py-1 text-xs font-bold ${record.paid ? "bg-emerald-500/15 text-emerald-200" : "bg-amber-500/15 text-amber-200"}`}>
                              {record.paid ? "مدفوع" : "مستحق"}
                            </span>
                            {!record.paid && (
                              <button
                                type="button"
                                onClick={() => payMissedRecord(record.id)}
                                disabled={updateMissedRecord.isPending}
                                className="rounded-lg bg-emerald-500/15 px-3 py-1 text-xs font-bold text-emerald-200 hover:bg-emerald-500/25 disabled:opacity-50"
                              >
                                تسديد
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </Modal>
        )}

        {donationOpen && (
          <Modal onClose={() => setDonationOpen(false)} title="إضافة تبرع">
            <div className="mb-5 grid grid-cols-3 gap-2 text-xs">
              {["البيانات", "الميديا", "المراجعة"].map((step, index) => (
                <div key={step} className={`rounded-lg py-2 text-center ${donationStep === index + 1 ? "bg-amber-500/20 text-amber-200" : "bg-white/5 text-muted-foreground"}`}>
                  {step}
                </div>
              ))}
            </div>

            {donationStep === 1 && (
              <div className="space-y-4">
                <TextInput label="عنوان التبرع" value={donationForm.title} onChange={(title) => setDonationForm({ ...donationForm, title })} />
                <NumberInput label="المبلغ" value={donationForm.amount} onChange={(amount) => setDonationForm({ ...donationForm, amount })} />
                <TextInput label="ملخص قصير" value={donationForm.summary} onChange={(summary) => setDonationForm({ ...donationForm, summary })} />
                <label className="block">
                  <span className="mb-1.5 block text-sm text-muted-foreground">التفاصيل</span>
                  <textarea
                    value={donationForm.description}
                    onChange={(event) => setDonationForm({ ...donationForm, description: event.target.value })}
                    rows={5}
                    className="w-full rounded-xl glass border border-border/50 px-4 py-3 outline-none focus:border-amber-500/50"
                  />
                </label>
                <TextInput label="تاريخ التبرع" type="date" value={donationForm.donatedAt} onChange={(donatedAt) => setDonationForm({ ...donationForm, donatedAt })} />
              </div>
            )}

            {donationStep === 2 && (
              <div>
                <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-amber-400/40 bg-amber-500/10 p-8 text-center hover:bg-amber-500/15">
                  <Upload className="mb-3 h-8 w-8 text-amber-200" />
                  <span className="font-bold">رفع صور أو فيديوهات</span>
                  <span className="text-xs text-muted-foreground mt-1">حتى 25MB للملف</span>
                  <input type="file" accept="image/*,video/*" multiple className="sr-only" onChange={(event) => uploadDonationFiles(event.target.files)} />
                </label>
                {uploading && <p className="mt-3 text-center text-sm text-amber-200">جاري رفع الملفات...</p>}
                <div className="mt-4 grid grid-cols-2 gap-3">
                  {donationForm.media.map((media, index) => (
                    <div key={`${media.url}-${index}`} className="relative overflow-hidden rounded-xl glass">
                      {media.type === "video" ? <video src={media.url} className="aspect-video w-full object-cover" /> : <img src={media.url} alt="" className="aspect-video w-full object-cover" />}
                      <button
                        onClick={() => setDonationForm((current) => ({ ...current, media: current.media.filter((_, mediaIndex) => mediaIndex !== index) }))}
                        className="absolute left-2 top-2 rounded-full bg-black/60 p-1 text-white"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {donationStep === 3 && (
              <div className="space-y-4">
                <ReviewRow label="الرصيد الحالي" value={formatMoney(currentBalance)} />
                <ReviewRow label="مبلغ التبرع" value={formatMoney(donationForm.amount)} />
                <ReviewRow label="بعد الخصم" value={formatMoney(balanceAfterDonation)} danger={balanceAfterDonation < 0} />
                {balanceAfterDonation < 0 && (
                  <div className="rounded-xl bg-red-500/10 p-4 text-sm text-red-200 flex gap-2">
                    <AlertCircle className="w-5 h-5" />
                    الرصيد غير كافي لهذا التبرع.
                  </div>
                )}
                {closesCycle && (
                  <label className="flex items-start gap-3 rounded-xl bg-amber-500/10 p-4 text-sm">
                    <input
                      type="checkbox"
                      checked={confirmCloseCycle}
                      onChange={(event) => setConfirmCloseCycle(event.target.checked)}
                      className="mt-1"
                    />
                    <span>أؤكد إقفال الدورة وتصفير بيانات المشاركين بعد حفظ هذا التبرع.</span>
                  </label>
                )}
                <div className="rounded-xl bg-white/5 p-4">
                  <div className="font-bold mb-1">{donationForm.title}</div>
                  <p className="text-sm text-muted-foreground">{donationForm.description}</p>
                </div>
              </div>
            )}

            <div className="mt-6 flex gap-3">
              {donationStep > 1 && (
                <button onClick={() => setDonationStep((step) => step - 1)} className="flex-1 rounded-xl glass py-3">
                  السابق
                </button>
              )}
              {donationStep < 3 ? (
                <button
                  disabled={!donationCanContinue}
                  onClick={() => setDonationStep((step) => step + 1)}
                  className="flex-1 rounded-xl gold-gradient py-3 font-bold text-[#0a0e1a] disabled:opacity-50"
                >
                  التالي
                </button>
              ) : (
                <button
                  disabled={createDonation.isPending || balanceAfterDonation < 0 || (closesCycle && !confirmCloseCycle)}
                  onClick={submitDonation}
                  className="flex-1 rounded-xl gold-gradient py-3 font-bold text-[#0a0e1a] disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {createDonation.isPending ? "جاري الحفظ..." : "حفظ التبرع"}
                </button>
              )}
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: typeof Coins; label: string; value: string }) {
  return (
    <div className="glass-strong rounded-xl px-4 py-3 min-w-32">
      <Icon className="w-4 h-4 text-amber-300 mb-2" />
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-bold">{value}</div>
    </div>
  );
}

function SummaryTile({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Coins;
  label: string;
  value: string;
  tone: "amber" | "green" | "red";
}) {
  const toneClass = {
    amber: "text-amber-200 bg-amber-500/10",
    green: "text-emerald-200 bg-emerald-500/10",
    red: "text-red-200 bg-red-500/10",
  }[tone];

  return (
    <div className="rounded-xl bg-white/5 p-3">
      <div className={`mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg ${toneClass}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-lg font-bold">{value}</div>
    </div>
  );
}

function DataTable({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">{children}</table>
    </div>
  );
}

function IconButton({ onClick, icon: Icon, danger }: { onClick: () => void; icon: typeof Pencil; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg p-2 transition ${danger ? "text-red-300 hover:bg-red-500/10" : "text-amber-200 hover:bg-amber-500/10"}`}
    >
      <Icon className="w-4 h-4" />
    </button>
  );
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-xl" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 24, scale: 0.96 }}
        className="relative z-10 w-full max-w-2xl max-h-[90vh] overflow-y-auto glass-strong rounded-2xl p-6"
      >
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gradient">{title}</h2>
          <button onClick={onClose} className="rounded-full p-2 hover:bg-white/10">
            <X className="w-5 h-5" />
          </button>
        </div>
        {children}
      </motion.div>
    </motion.div>
  );
}

function TextInput({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm text-muted-foreground">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl glass border border-border/50 px-4 py-3 outline-none focus:border-amber-500/50"
      />
    </label>
  );
}

function NumberInput({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm text-muted-foreground">{label}</span>
      <input
        type="number"
        min={0}
        value={value}
        onChange={(event) => onChange(Number(event.target.value) || 0)}
        className="w-full rounded-xl glass border border-border/50 px-4 py-3 outline-none focus:border-amber-500/50"
      />
    </label>
  );
}

function ReviewRow({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-white/5 px-4 py-3">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-bold ${danger ? "text-red-300" : "text-foreground"}`}>{value}</span>
    </div>
  );
}
