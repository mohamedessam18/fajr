import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router";
import {
  Shield,
  Lock,
  LogOut,
  Users,
  Plus,
  Pencil,
  Trash2,
  Save,
  X,
  XCircle,
  AlertCircle,
  ChevronLeft,
  Coins,
  User,
  Upload,
} from "lucide-react";
import { trpc } from "@/providers/trpc";
import { useAdmin } from "@/hooks/useAdmin";
import { toast } from "sonner";

interface ParticipantFormData {
  id?: number;
  name: string;
  missedCount: number;
  paidAmount: number;
  unpaidAmount: number;
  image: string;
}

const SAVE_TIMEOUT_MS = 20000;

const emptyForm: ParticipantFormData = {
  name: "",
  missedCount: 0,
  paidAmount: 0,
  unpaidAmount: 0,
  image: "",
};

export default function AdminPage() {
  const navigate = useNavigate();
  const { isAdmin, login, logout } = useAdmin();
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginPending, setLoginPending] = useState(false);
  const [savingPending, setSavingPending] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<ParticipantFormData>(emptyForm);

  const utils = trpc.useUtils();

  const { data: participantsList } = trpc.admin.listParticipants.useQuery(undefined, {
    enabled: isAdmin,
  });
  const { data: stats } = trpc.participant.stats.useQuery(undefined, {
    enabled: isAdmin,
  });

  const loginMutation = trpc.admin.login.useMutation({
    onSuccess: (data) => {
      if (data.success && data.token) {
        login(data.token);
        setLoginError("");
        toast.success("تم تسجيل الدخول بنجاح");
      } else {
        setLoginError("كلمة المرور غير صحيحة");
      }
    },
    onError: () => {
      setLoginError("حدث خطأ أثناء تسجيل الدخول");
    },
  });

  const loginAdmin = async (passwordValue: string) => {
    setLoginPending(true);
    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password: passwordValue }),
      });
      const data = (await response.json()) as { success: boolean; token: string | null };

      if (data.success && data.token) {
        login(data.token);
        setLoginError("");
        toast.success("تم تسجيل الدخول بنجاح");
      } else {
        setLoginError("كلمة المرور غير صحيحة");
      }
    } catch {
      setLoginError("حدث خطأ أثناء تسجيل الدخول");
    } finally {
      setLoginPending(false);
    }
  };

  void loginMutation;

  const addMutation = trpc.admin.addParticipant.useMutation({
    onSuccess: () => {
      utils.admin.listParticipants.invalidate();
      utils.participant.list.invalidate();
      utils.participant.stats.invalidate();
      setShowForm(false);
      setFormData(emptyForm);
      toast.success("تم إضافة المشارك بنجاح");
    },
  });

  const updateMutation = trpc.admin.updateParticipant.useMutation({
    onSuccess: () => {
      utils.admin.listParticipants.invalidate();
      utils.participant.list.invalidate();
      utils.participant.stats.invalidate();
      utils.participant.byId.invalidate();
      setShowForm(false);
      setEditingId(null);
      setFormData(emptyForm);
      toast.success("تم تحديث البيانات بنجاح");
    },
  });

  const deleteMutation = trpc.admin.deleteParticipant.useMutation({
    onSuccess: () => {
      utils.admin.listParticipants.invalidate();
      utils.participant.list.invalidate();
      utils.participant.stats.invalidate();
      toast.success("تم حذف المشارك بنجاح");
    },
  });

  void addMutation;
  void updateMutation;
  void deleteMutation;

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;
    void loginAdmin(password);
  };

  const handleEdit = (participant: NonNullable<typeof participantsList>[0]) => {
    setFormData({
      id: participant.id,
      name: participant.name,
      missedCount: participant.missedCount,
      paidAmount: participant.paidAmount,
      unpaidAmount: participant.unpaidAmount,
      image: participant.image || "",
    });
    setEditingId(participant.id);
    setShowForm(true);
  };

  const refreshAdminData = () => {
    utils.admin.listParticipants.invalidate();
    utils.participant.list.invalidate();
    utils.participant.stats.invalidate();
    utils.participant.byId.invalidate();
  };

  const getAdminToken = () => localStorage.getItem("sahseh_admin_token") ?? "";

  const saveParticipant = async () => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), SAVE_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(
        editingId ? `/api/admin/participants/${editingId}` : "/api/admin/participants",
        {
          method: editingId ? "PUT" : "POST",
          headers: {
            authorization: `Bearer ${getAdminToken()}`,
            "content-type": "application/json",
          },
          body: JSON.stringify({
            name: formData.name.trim(),
            missedCount: formData.missedCount,
            paidAmount: formData.paidAmount,
            unpaidAmount: formData.unpaidAmount,
            image: formData.image.trim() || undefined,
          }),
          signal: controller.signal,
        },
      );
    } finally {
      window.clearTimeout(timeout);
    }

    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      throw new Error(data?.error || "Save failed");
    }
  };

  const handleImageUpload = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("اختر ملف صورة فقط");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("حجم الصورة يجب أن يكون أقل من 2MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setFormData((current) => ({ ...current, image: reader.result as string }));
        toast.success("تم اختيار الصورة بنجاح");
      }
    };
    reader.onerror = () => {
      toast.error("تعذر رفع الصورة");
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error("الاسم مطلوب");
      return;
    }

    setSavingPending(true);
    try {
      await saveParticipant();
      refreshAdminData();
      setShowForm(false);
      setEditingId(null);
      setFormData(emptyForm);
      toast.success(editingId ? "تم تحديث البيانات بنجاح" : "تم إضافة المشارك بنجاح");
    } catch (error) {
      const message = error instanceof Error && error.name === "AbortError"
        ? "الحفظ استغرق وقت أطول من المتوقع. حاول مرة أخرى."
        : "حدث خطأ أثناء الحفظ";
      toast.error(message);
    } finally {
      setSavingPending(false);
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (window.confirm(`هل أنت متأكد من حذف "${name}"؟`)) {
      try {
        const response = await fetch(`/api/admin/participants/${id}`, {
          method: "DELETE",
          headers: {
            authorization: `Bearer ${getAdminToken()}`,
          },
        });
        if (!response.ok) throw new Error("Delete failed");
        refreshAdminData();
        toast.success("تم حذف المشارك بنجاح");
      } catch {
        toast.error("حدث خطأ أثناء الحذف");
      }
    }
  };

  const handleAddNew = () => {
    setFormData(emptyForm);
    setEditingId(null);
    setShowForm(true);
  };

  // Login Screen
  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center relative" dir="rtl">
        <div className="absolute inset-0 sunrise-gradient" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(234,179,8,0.1)_0%,_transparent_60%)]" />

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="relative z-10 w-full max-w-md mx-4"
        >
          <div className="glass-strong rounded-3xl p-8 shadow-2xl">
            <div className="text-center mb-8">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", damping: 15 }}
                className="w-20 h-20 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto mb-5 border border-amber-500/20"
              >
                <Shield className="w-10 h-10 text-amber-400" />
              </motion.div>
              <h1 className="text-2xl font-bold text-gradient mb-2">لوحة التحكم</h1>
              <p className="text-sm text-muted-foreground">يجب تسجيل الدخول للوصول إلى لوحة التحكم</p>
            </div>

            <form onSubmit={handleLogin}>
              <div className="space-y-4">
                <div className="relative">
                  <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="كلمة المرور"
                    className="w-full pr-12 pl-4 py-3 rounded-xl glass border border-border/50 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30 transition-all"
                  />
                </div>
                {loginError && (
                  <motion.p
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-red-400 text-sm text-center"
                  >
                    {loginError}
                  </motion.p>
                )}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={loginPending}
                  className="w-full py-3 rounded-xl gold-gradient text-[#0a0e1a] font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loginPending ? "جاري تسجيل الدخول..." : "تسجيل الدخول"}
                </motion.button>
              </div>
            </form>

            <button
              onClick={() => navigate("/")}
              className="w-full mt-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-1"
            >
              <ChevronLeft className="w-4 h-4" />
              العودة للرئيسية
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // Dashboard
  return (
    <div className="min-h-screen relative" dir="rtl">
      <div className="absolute inset-0 sunrise-gradient" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(234,179,8,0.05)_0%,_transparent_60%)]" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8"
        >
          <div className="flex items-center gap-3">
            <img src="/assets/logo.png" alt="" className="w-10 h-10 object-contain" />
            <div>
              <h1 className="text-xl font-bold text-gradient">لوحة التحكم</h1>
              <p className="text-xs text-muted-foreground">إدارة المشاركين والإحصائيات</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleAddNew}
              className="px-4 py-2 rounded-xl gold-gradient text-[#0a0e1a] font-bold text-sm flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              إضافة مشارك
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                logout();
                toast.success("تم تسجيل الخروج");
              }}
              className="p-2 rounded-xl glass hover:bg-white/10 transition-colors"
              title="تسجيل الخروج"
            >
              <LogOut className="w-5 h-5 text-muted-foreground" />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate("/")}
              className="px-3 py-2 rounded-xl glass hover:bg-white/10 transition-colors text-sm text-muted-foreground"
            >
              العودة للرئيسية
            </motion.button>
          </div>
        </motion.div>

        {/* Stats Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
        >
          {[
            { icon: <Coins className="w-5 h-5" />, label: "المبالغ المجمعة", value: `${stats?.totalCollected ?? 0} جنيه`, color: "text-amber-400", bg: "bg-amber-500/10" },
            { icon: <Users className="w-5 h-5" />, label: "عدد المشاركين", value: `${stats?.totalParticipants ?? 0}`, color: "text-blue-400", bg: "bg-blue-500/10" },
            { icon: <XCircle className="w-5 h-5" />, label: "مرات التغيب", value: `${stats?.totalMissed ?? 0}`, color: "text-red-400", bg: "bg-red-500/10" },
            { icon: <AlertCircle className="w-5 h-5" />, label: "غير مسدد", value: `${stats?.totalUnpaid ?? 0} جنيه`, color: "text-emerald-400", bg: "bg-emerald-500/10" },
          ].map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.05 }}
              className="glass-strong rounded-xl p-4"
            >
              <div className={`inline-flex items-center justify-center w-10 h-10 rounded-lg ${stat.bg} ${stat.color} mb-3`}>
                {stat.icon}
              </div>
              <div className="text-lg md:text-xl font-bold text-foreground">{stat.value}</div>
              <div className="text-xs text-muted-foreground mt-1">{stat.label}</div>
            </motion.div>
          ))}
        </motion.div>

        {/* Participants Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-strong rounded-2xl overflow-hidden"
        >
          <div className="p-4 md:p-6 border-b border-border/50">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Users className="w-5 h-5 text-amber-400" />
              قائمة المشاركين
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/30">
                  <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">المشارك</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground">التغيبات</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground">المسدد</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground">المستحق</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence mode="popLayout">
                  {participantsList?.map((p, i) => (
                    <motion.tr
                      key={p.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ delay: i * 0.03 }}
                      className="border-b border-border/20 hover:bg-white/5 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full overflow-hidden border border-border/50 flex-shrink-0">
                            {p.image ? (
                              <img src={p.image} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full bg-muted flex items-center justify-center">
                                <User className="w-4 h-4 text-muted-foreground" />
                              </div>
                            )}
                          </div>
                          <span className="font-medium text-sm text-foreground">{p.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${p.missedCount > 0 ? "bg-red-500/15 text-red-400" : "bg-emerald-500/15 text-emerald-400"}`}>
                          {p.missedCount}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-sm text-emerald-400 font-medium">
                        {p.paidAmount} ج
                      </td>
                      <td className="px-4 py-3 text-center text-sm text-amber-400 font-medium">
                        {p.unpaidAmount} ج
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => handleEdit(p)}
                            className="p-1.5 rounded-lg glass hover:bg-blue-500/10 text-blue-400 transition-colors"
                          >
                            <Pencil className="w-4 h-4" />
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => handleDelete(p.id, p.name)}
                            className="p-1.5 rounded-lg glass hover:bg-red-500/10 text-red-400 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </motion.button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>

      {/* Form Modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={() => setShowForm(false)}
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-xl"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              onClick={(e) => e.stopPropagation()}
              className="relative z-10 w-full max-w-lg glass-strong rounded-2xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gradient">
                  {editingId ? "تعديل مشارك" : "إضافة مشارك جديد"}
                </h2>
                <motion.button
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setShowForm(false)}
                  className="p-2 rounded-full glass hover:bg-white/10"
                >
                  <X className="w-5 h-5" />
                </motion.button>
              </div>

              <form onSubmit={handleSave} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1.5">
                    الاسم
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl glass border border-border/50 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30 transition-all"
                    placeholder="اسم المشارك"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1.5">
                    صورة المشارك
                  </label>
                  <input
                    type="text"
                    value={formData.image}
                    onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl glass border border-border/50 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30 transition-all"
                    placeholder="/assets/image.jpg"
                  />
                  <label className="mt-2 flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-amber-400/40 bg-amber-500/10 px-4 py-3 text-sm font-medium text-amber-200 transition-colors hover:bg-amber-500/15">
                    <Upload className="h-4 w-4" />
                    رفع صورة من الجهاز
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload(e.target.files?.[0])}
                      className="sr-only"
                    />
                  </label>
                  {formData.image && (
                    <div className="mt-3 flex items-center gap-3">
                      <img
                        src={formData.image}
                        alt=""
                        className="w-14 h-14 rounded-full object-cover border border-border/50"
                      />
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, image: "" })}
                        className="text-xs text-red-400 hover:text-red-300"
                      >
                        حذف الصورة
                      </button>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1.5">
                      التغيبات
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={formData.missedCount}
                      onChange={(e) => setFormData({ ...formData, missedCount: parseInt(e.target.value) || 0 })}
                      className="w-full px-4 py-2.5 rounded-xl glass border border-border/50 text-foreground focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1.5">
                      المسدد
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={formData.paidAmount}
                      onChange={(e) => setFormData({ ...formData, paidAmount: parseInt(e.target.value) || 0 })}
                      className="w-full px-4 py-2.5 rounded-xl glass border border-border/50 text-foreground focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1.5">
                      المستحق
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={formData.unpaidAmount}
                      onChange={(e) => setFormData({ ...formData, unpaidAmount: parseInt(e.target.value) || 0 })}
                      className="w-full px-4 py-2.5 rounded-xl glass border border-border/50 text-foreground focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30 transition-all"
                    />
                  </div>
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={savingPending}
                  className="w-full py-3 rounded-xl gold-gradient text-[#0a0e1a] font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50 mt-6"
                >
                  <Save className="w-4 h-4" />
                  {savingPending
                    ? "جاري الحفظ..."
                    : editingId
                    ? "حفظ التعديلات"
                    : "إضافة المشارك"}
                </motion.button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
