import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { AlertCircle, ArrowDownLeft, ArrowUpLeft, CalendarDays, Check, Clock3, FilePlus2, MapPin, MessageCircle, RefreshCw, Send, ShieldAlert, Timer, UserRound } from "lucide-react";
import "./user-dashboard.css";

type AttendanceAction = "check_in" | "break_start" | "break_end" | "check_out";
type AttendanceEvent = { id: number; action: AttendanceAction; occurred_at: string; latitude: number; longitude: number; accuracy: number | null };
type Recipient = { id: number; display_name: string | null; display_name_ar: string | null };
type Message = { id: number; sender_id: number; recipient_id: number; sender_name: string; recipient_name: string; body: string; reply_to_id: number | null; created_at: string; read_at: string | null };
type RequestRecord = { id: number; type: "leave" | "permission" | "other"; title: string; details: string; status: "pending" | "approved" | "rejected"; response: string | null; created_at: string };
type Violation = { id: number; title: string; details: string; created_at: string; acknowledged_at: string | null };
type AttendanceData = { events: AttendanceEvent[]; status: "out" | "working" | "break"; month: string; daysPresent: number };

const api = async <T,>(path: string, options: RequestInit = {}): Promise<T> => {
  const response = await fetch(`/api/self${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.message || "تعذر تنفيذ الطلب");
  return body as T;
};

const post = (path: string, body: unknown) => api(path, { method: "POST", body: JSON.stringify(body) });
const dateTime = (value: string) => new Intl.DateTimeFormat("ar-SA-u-nu-latn", {
  dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Riyadh",
}).format(new Date(value));
const monthName = (value: string) => {
  const [year, month] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("ar-SA", { month: "long", year: "numeric", timeZone: "Asia/Riyadh" })
    .format(new Date(Date.UTC(year, month - 1, 15, 9)));
};
const actionNames: Record<AttendanceAction, string> = {
  check_in: "تسجيل الحضور", break_start: "بدء الاستراحة", break_end: "العودة من الاستراحة", check_out: "تسجيل الخروج",
};
const allAttendanceActions: AttendanceAction[] = ["check_in", "break_start", "break_end", "check_out"];
const requestNames: Record<RequestRecord["type"], string> = { leave: "إجازة", permission: "استئذان", other: "أخرى" };
const requestStatus: Record<RequestRecord["status"], string> = { pending: "قيد المراجعة", approved: "مقبول", rejected: "مرفوض" };

function locate(): Promise<{ latitude: number; longitude: number; accuracy: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("المتصفح لا يدعم تحديد الموقع. لا يمكن تسجيل الحضور من هذا الجهاز."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => resolve({ latitude: coords.latitude, longitude: coords.longitude, accuracy: coords.accuracy }),
      (error) => reject(new Error(error.code === error.PERMISSION_DENIED
        ? "يجب السماح بالوصول إلى الموقع لتسجيل هذا الإجراء."
        : error.code === error.TIMEOUT
          ? "تعذر تحديد الموقع في الوقت المحدد. حاول مرة أخرى في مكان مفتوح."
          : "تعذر تحديد الموقع. تحقق من إعدادات الموقع ثم أعد المحاولة.")),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  });
}

export default function UserDashboard({ user }: { user: Record<string, any> }) {
  const [attendance, setAttendance] = useState<AttendanceData | null>(null);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [requests, setRequests] = useState<RequestRecord[]>([]);
  const [violations, setViolations] = useState<Violation[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [recipientId, setRecipientId] = useState("");
  const [messageBody, setMessageBody] = useState("");
  const [replyTo, setReplyTo] = useState<number | null>(null);
  const [requestForm, setRequestForm] = useState({ type: "leave" as RequestRecord["type"], title: "", details: "" });

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    setError("");
    const results = await Promise.allSettled([
      api<AttendanceData>("/attendance"),
      api<Recipient[]>("/recipients"),
      api<Message[]>("/messages"),
      api<RequestRecord[]>("/requests"),
      api<Violation[]>("/violations"),
    ]);
    const failures: string[] = [];
    const apply = <T,>(result: PromiseSettledResult<T>, setValue: (value: T) => void, section: string) => {
      if (result.status === "fulfilled") setValue(result.value);
      else failures.push(`${section}: ${(result.reason as Error)?.message || "تعذر تحميل البيانات"}`);
    };
    apply(results[0], setAttendance, "الحضور");
    apply(results[1], setRecipients, "قائمة المستلمين");
    apply(results[2], setMessages, "الرسائل");
    apply(results[3], setRequests, "الطلبات");
    apply(results[4], setViolations, "المخالفات");
    if (failures.length) setError(failures.join(" · "));
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const attendanceActions = useMemo(() => {
    if (attendance?.status === "working") return ["break_start", "check_out"] as AttendanceAction[];
    if (attendance?.status === "break") return ["break_end"] as AttendanceAction[];
    return ["check_in"] as AttendanceAction[];
  }, [attendance?.status]);

  const registerAttendance = async (action: AttendanceAction) => {
    setBusy(action); setError(""); setNotice("");
    try {
      const location = await locate();
      await post("/attendance", { action, ...location });
      setNotice(`تم ${actionNames[action]} بنجاح بعد التحقق من الموقع.`);
      await load(true);
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy("");
    }
  };

  const sendMessage = async (event: FormEvent) => {
    event.preventDefault();
    if (!recipientId || !messageBody.trim()) return;
    setBusy("message"); setError(""); setNotice("");
    try {
      await post("/messages", { recipient_id: Number(recipientId), body: messageBody.trim(), ...(replyTo ? { reply_to_id: replyTo } : {}) });
      setMessageBody(""); setReplyTo(null);
      setNotice("تم إرسال الرسالة.");
      await load(true);
    } catch (cause) { setError((cause as Error).message); }
    finally { setBusy(""); }
  };

  const markRead = async (message: Message) => {
    setBusy(`read-${message.id}`); setError("");
    try { await post(`/messages/${message.id}/read`, {}); await load(true); }
    catch (cause) { setError((cause as Error).message); }
    finally { setBusy(""); }
  };

  const submitRequest = async (event: FormEvent) => {
    event.preventDefault();
    setBusy("request"); setError(""); setNotice("");
    try {
      await post("/requests", requestForm);
      setRequestForm({ type: "leave", title: "", details: "" });
      setNotice("تم إرسال الطلب إلى الإدارة.");
      await load(true);
    } catch (cause) { setError((cause as Error).message); }
    finally { setBusy(""); }
  };

  const acknowledge = async (violation: Violation) => {
    setBusy(`violation-${violation.id}`); setError(""); setNotice("");
    try {
      await post(`/violations/${violation.id}/ack`, {});
      setNotice("تم تأكيد الاطلاع على المخالفة.");
      await load(true);
    } catch (cause) { setError((cause as Error).message); }
    finally { setBusy(""); }
  };

  const displayName = user.display_name_ar || user.display_name || user.username || "زميل";
  const statusLabel = attendance?.status === "working" ? "على رأس العمل" : attendance?.status === "break" ? "في الاستراحة" : "خارج العمل";

  return (
    <div className="self-page" dir="rtl">
      <div className="self-welcome">
        <div>
          <div className="self-eyebrow">مساحة الموظف · {displayName}</div>
          <h2>مرحباً بعودتك</h2>
          <p>تابع يومك وسجلاتك وتواصل مع فريقك من مكان واحد.</p>
        </div>
        <button className="self-refresh" type="button" onClick={() => void load()} disabled={loading || !!busy} aria-label="تحديث البيانات">
          <RefreshCw size={16} /> تحديث
        </button>
      </div>

      {error && <div className="self-alert self-alert-error" role="alert"><AlertCircle size={18} /><span>{error}</span></div>}
      {notice && <div className="self-alert self-alert-success" role="status"><Check size={18} /><span>{notice}</span></div>}

      <div className="self-summary" aria-label="إحصاءاتك الشخصية">
        <div className="self-summary-item"><span>أيام الحضور هذا الشهر</span><strong>{attendance?.daysPresent ?? "—"}</strong></div>
        <div className="self-summary-item"><span>الرسائل غير المقروءة</span><strong>{messages.filter((message) => message.recipient_id === user.id && !message.read_at).length}</strong></div>
        <div className="self-summary-item"><span>طلبات قيد المراجعة</span><strong>{requests.filter((request) => request.status === "pending").length}</strong></div>
        <div className="self-summary-item"><span>مخالفات بانتظار الاطلاع</span><strong>{violations.filter((violation) => !violation.acknowledged_at).length}</strong></div>
      </div>

      <section className="self-attendance self-panel" aria-labelledby="self-attendance-title">
        <div className="self-attendance-main">
          <div className="self-section-kicker"><MapPin size={15} /> الحضور والانصراف</div>
          <h3 id="self-attendance-title">{loading && !attendance ? "جارٍ تحميل الحالة…" : statusLabel}</h3>
          <p>الموقع إلزامي لكل تسجيل. سيُطلب إذن الموقع عند تنفيذ كل إجراء.</p>
          <div className="self-attendance-actions">
            {allAttendanceActions.map((action) => (
              <button
                className={`self-attendance-btn ${action === "check_out" ? "is-out" : ""}`}
                key={action}
                type="button"
                onClick={() => void registerAttendance(action)}
                disabled={loading || !!busy || !attendance || !attendanceActions.includes(action)}
              >
                {busy === action ? <span className="self-spinner" /> : action === "check_out" ? <ArrowUpLeft size={18} /> : action === "break_start" ? <Timer size={18} /> : <MapPin size={18} />}
                {busy === action ? "جارٍ تحديد الموقع…" : actionNames[action]}
              </button>
            ))}
          </div>
        </div>
        <div className="self-attendance-stat">
          <span className="self-stat-icon"><CalendarDays size={19} /></span>
          <div><span>أيام الحضور</span><strong>{loading && !attendance ? "—" : attendance?.daysPresent ?? "—"}</strong><small>{attendance?.month ? monthName(attendance.month) : "الشهر الحالي"}</small></div>
        </div>
      </section>

      <section className="self-panel">
        <div className="self-panel-heading"><div><span className="self-section-kicker"><Clock3 size={15} /> سجل الشهر</span><h3>أحداث الحضور</h3></div><span className="self-muted">{attendance?.month ? monthName(attendance.month) : "الشهر الحالي"}</span></div>
        {loading && !attendance ? <div className="self-empty">جارٍ تحميل سجل الحضور…</div> : !attendance?.events.length ? <div className="self-empty">لا توجد أحداث حضور مسجلة لهذا الشهر.</div> : (
          <div className="self-event-list">
            {attendance.events.map((event) => <article className="self-event" key={event.id}>
              <span className={`self-event-dot ${event.action === "check_out" ? "is-soft" : ""}`} />
              <div className="self-event-copy"><strong>{actionNames[event.action]}</strong><small><MapPin size={12} /> تم حفظ الموقع</small></div>
              <time dateTime={event.occurred_at}>{dateTime(event.occurred_at)}</time>
            </article>)}
          </div>
        )}
      </section>

      <div className="self-columns">
        <section className="self-panel">
          <div className="self-panel-heading"><div><span className="self-section-kicker"><MessageCircle size={15} /> تواصل الفريق</span><h3>الرسائل الداخلية</h3></div><span className="self-count">{messages.length}</span></div>
          <form className="self-form" onSubmit={sendMessage}>
            <div className="self-field">
              <label htmlFor="self-recipient">إلى</label>
              <select id="self-recipient" value={recipientId} onChange={(event) => setRecipientId(event.target.value)} required>
                <option value="">اختر مستلمًا</option>
                {recipients.map((recipient) => <option key={recipient.id} value={recipient.id}>{recipient.display_name_ar || recipient.display_name || `مستخدم ${recipient.id}`}</option>)}
              </select>
            </div>
            {replyTo && <div className="self-replying">الرد على رسالة #{replyTo}<button type="button" onClick={() => setReplyTo(null)}>إلغاء</button></div>}
            <label className="self-field" htmlFor="self-message"><span>الرسالة</span><textarea id="self-message" value={messageBody} onChange={(event) => setMessageBody(event.target.value)} rows={3} maxLength={5000} placeholder="اكتب رسالتك هنا…" required /></label>
            <button className="self-submit" type="submit" disabled={busy === "message" || !recipientId || !messageBody.trim()}><Send size={16} />{busy === "message" ? "جارٍ الإرسال…" : "إرسال الرسالة"}</button>
          </form>
          <div className="self-list">
            {loading && !messages.length ? <div className="self-empty">جارٍ تحميل الرسائل…</div> : !messages.length ? <div className="self-empty">لا توجد رسائل بعد.</div> : messages.map((message) => (
              <article className={`self-message ${!message.read_at && message.recipient_id === user.id ? "is-unread" : ""}`} key={message.id}>
                <div className="self-message-top"><strong>{message.sender_id === user.id ? <><ArrowUpLeft size={13} /> إلى {message.recipient_name}</> : <><ArrowDownLeft size={13} /> من {message.sender_name}</>}</strong><time dateTime={message.created_at}>{dateTime(message.created_at)}</time></div>
                {message.reply_to_id && <small className="self-reply-reference">رد على رسالة سابقة</small>}
                <p>{message.body}</p>
                <div className="self-message-actions">
                  <button type="button" onClick={() => { setReplyTo(message.id); if (message.sender_id !== user.id) setRecipientId(String(message.sender_id)); else setRecipientId(String(message.recipient_id)); }}><MessageCircle size={13} /> رد</button>
                  {message.recipient_id === user.id && !message.read_at && <button type="button" disabled={busy === `read-${message.id}`} onClick={() => void markRead(message)}><Check size={13} /> {busy === `read-${message.id}` ? "جارٍ الحفظ…" : "تحديد كمقروءة"}</button>}
                  {message.read_at && message.sender_id === user.id && <small>قُرئت {dateTime(message.read_at)}</small>}
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="self-panel">
          <div className="self-panel-heading"><div><span className="self-section-kicker"><FilePlus2 size={15} /> خدمات الموظفين</span><h3>طلب إداري</h3></div></div>
          <form className="self-form" onSubmit={submitRequest}>
            <div className="self-form-grid">
              <div className="self-field"><label htmlFor="self-request-type">نوع الطلب</label><select id="self-request-type" value={requestForm.type} onChange={(event) => setRequestForm({ ...requestForm, type: event.target.value as RequestRecord["type"] })}><option value="leave">إجازة</option><option value="permission">استئذان</option><option value="other">أخرى</option></select></div>
              <div className="self-field"><label htmlFor="self-request-title">العنوان</label><input id="self-request-title" value={requestForm.title} maxLength={200} onChange={(event) => setRequestForm({ ...requestForm, title: event.target.value })} required /></div>
            </div>
            <label className="self-field" htmlFor="self-request-details"><span>التفاصيل</span><textarea id="self-request-details" value={requestForm.details} onChange={(event) => setRequestForm({ ...requestForm, details: event.target.value })} rows={3} maxLength={5000} required /></label>
            <button className="self-submit" type="submit" disabled={busy === "request"}><Send size={16} />{busy === "request" ? "جارٍ الإرسال…" : "إرسال الطلب"}</button>
          </form>
          <div className="self-list">
            {!requests.length ? <div className="self-empty">لم ترسل أي طلبات حتى الآن.</div> : requests.map((request) => <article className="self-request" key={request.id}>
              <div className="self-request-top"><span className={`self-status status-${request.status}`}>{requestStatus[request.status] || "قيد المراجعة"}</span><small>{requestNames[request.type]} · {dateTime(request.created_at)}</small></div>
              <h4>{request.title}</h4><p>{request.details}</p>
              {request.response && <div className="self-response"><strong>رد الإدارة</strong><p>{request.response}</p></div>}
            </article>)}
          </div>
        </section>
      </div>

      <section className="self-panel">
        <div className="self-panel-heading"><div><span className="self-section-kicker"><ShieldAlert size={15} /> المتابعة الإدارية</span><h3>المخالفات</h3></div><span className="self-count">{violations.length}</span></div>
        {!violations.length ? <div className="self-empty">لا توجد مخالفات مسجلة.</div> : <div className="self-violation-list">
          {violations.map((violation) => <article className="self-violation" key={violation.id}>
            <div className="self-violation-mark"><ShieldAlert size={19} /></div>
            <div className="self-violation-content"><div className="self-violation-top"><strong>{violation.title}</strong><time dateTime={violation.created_at}>{dateTime(violation.created_at)}</time></div><p>{violation.details}</p></div>
            {violation.acknowledged_at
              ? <span className="self-acknowledged"><Check size={14} /> تم الاطلاع {dateTime(violation.acknowledged_at)}</span>
              : <button className="self-ack-btn" type="button" disabled={busy === `violation-${violation.id}`} onClick={() => void acknowledge(violation)}>{busy === `violation-${violation.id}` ? "جارٍ الحفظ…" : "تأكيد الاطلاع"}</button>}
          </article>)}
        </div>}
      </section>
    </div>
  );
}