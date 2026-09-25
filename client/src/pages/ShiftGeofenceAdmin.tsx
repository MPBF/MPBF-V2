import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { AlertCircle, Check, Crosshair, MapPin, Save } from "lucide-react";
import { Circle, MapContainer, TileLayer, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";

type Row = Record<string, unknown>;
type Shift = {
  id: string;
  name_ar: string;
  name_en: string;
  start_time: string;
  end_time: string;
  geofence_enabled?: boolean;
  geofence_center_lat?: number;
  geofence_center_lng?: number;
  geofence_radius_meters?: number;
};

type SettingRow = {
  id?: number;
  setting_key: string;
  setting_value: string;
  setting_type?: string;
  description?: string;
};

const DEFAULT_CENTER: [number, number] = [24.7136, 46.6753];
const DEFAULT_RADIUS = 200;

const api = async <T,>(path: string, options: RequestInit = {}): Promise<T> => {
  const response = await fetch(`/api${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.message || "تعذر تنفيذ الطلب");
  return body as T;
};

const list = (path: string, search = "") =>
  api<Row[]>(`${path}?limit=200${search ? `&search=${encodeURIComponent(search)}` : ""}`);

function parseShifts(raw: unknown): Shift[] {
  try {
    const payload = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!Array.isArray(payload)) return [];
    return payload.map((item) => ({
      id: String(item?.id ?? ""),
      name_ar: String(item?.name_ar ?? ""),
      name_en: String(item?.name_en ?? ""),
      start_time: String(item?.start_time ?? ""),
      end_time: String(item?.end_time ?? ""),
      geofence_enabled: String(item?.geofence_enabled).toLowerCase() === "true" || item?.geofence_enabled === true,
      geofence_center_lat: Number.isFinite(Number(item?.geofence_center_lat)) ? Number(item?.geofence_center_lat) : undefined,
      geofence_center_lng: Number.isFinite(Number(item?.geofence_center_lng)) ? Number(item?.geofence_center_lng) : undefined,
      geofence_radius_meters: Number.isFinite(Number(item?.geofence_radius_meters)) ? Number(item?.geofence_radius_meters) : undefined,
    }));
  } catch {
    return [];
  }
}

function ShiftMapPicker({
  center,
  radius,
  onPick,
}: {
  center: [number, number];
  radius: number;
  onPick: (lat: number, lng: number) => void;
}) {
  function ClickCapture() {
    useMapEvents({
      click(event) {
        onPick(event.latlng.lat, event.latlng.lng);
      },
    });
    return null;
  }

  return (
    <div style={{ border: "1px solid var(--line)", borderRadius: 12, overflow: "hidden" }}>
      <MapContainer center={center} zoom={14} style={{ height: 260, width: "100%" }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Circle center={center} radius={Math.max(1, radius)} pathOptions={{ color: "#0c8c95", fillOpacity: 0.18 }} />
        <ClickCapture />
      </MapContainer>
    </div>
  );
}

export default function ShiftGeofenceAdmin() {
  const [settings, setSettings] = useState<SettingRow[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");

  const selected = useMemo(() => shifts.find((shift) => shift.id === selectedId) ?? null, [shifts, selectedId]);
  const center: [number, number] = selected?.geofence_center_lat !== undefined && selected?.geofence_center_lng !== undefined
    ? [selected.geofence_center_lat, selected.geofence_center_lng]
    : DEFAULT_CENTER;

  const radius = Number(selected?.geofence_radius_meters ?? DEFAULT_RADIUS);

  useEffect(() => {
    void (async () => {
      setError("");
      try {
        const rows = await list("/system-settings");
        const normalized = (Array.isArray(rows) ? rows : []) as unknown as SettingRow[];
        setSettings(normalized);
        const shiftRaw = normalized.find((row) => row.setting_key === "work_shifts")?.setting_value;
        const parsed = parseShifts(shiftRaw);
        setShifts(parsed);
        if (parsed[0]) setSelectedId(parsed[0].id);
      } catch (cause) {
        setError((cause as Error).message);
      }
    })();
  }, []);

  const updateSelected = (patch: Partial<Shift>) => {
    if (!selected) return;
    setShifts((current) => current.map((shift) => (shift.id === selected.id ? { ...shift, ...patch } : shift)));
  };

  const onCoordinateInput = (event: ChangeEvent<HTMLInputElement>, key: "geofence_center_lat" | "geofence_center_lng") => {
    const value = Number(event.target.value);
    updateSelected({ [key]: Number.isFinite(value) ? value : undefined } as Partial<Shift>);
  };

  const useCurrentLocation = () => {
    setError("");
    if (!navigator.geolocation) {
      setError("المتصفح لا يدعم تحديد الموقع.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => updateSelected({ geofence_center_lat: coords.latitude, geofence_center_lng: coords.longitude }),
      (geoError) => {
        if (geoError.code === geoError.PERMISSION_DENIED) setError("يجب السماح بالوصول إلى الموقع لتحديد النطاق.");
        else setError("تعذر تحديد موقعك الحالي. حاول مرة أخرى.");
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 },
    );
  };

  const save = async () => {
    setError("");
    setSaved("");
    if (!selected) {
      setError("لا توجد وردية محددة.");
      return;
    }

    if (selected.geofence_enabled) {
      if (!Number.isFinite(Number(selected.geofence_center_lat)) || !Number.isFinite(Number(selected.geofence_center_lng))) {
        setError("حدد مركز النطاق على الخريطة قبل الحفظ.");
        return;
      }
      const r = Number(selected.geofence_radius_meters);
      if (!Number.isFinite(r) || r < 20 || r > 5000) {
        setError("نصف القطر يجب أن يكون بين 20 و 5000 متر.");
        return;
      }
    }

    setBusy(true);
    try {
      const existing = settings.find((row) => row.setting_key === "work_shifts");
      const payload = JSON.stringify(shifts);
      if (existing?.id) {
        await api(`/system-settings/${existing.id}`, {
          method: "PUT",
          body: JSON.stringify({ setting_value: payload }),
        });
      } else {
        await api("/system-settings", {
          method: "POST",
          body: JSON.stringify({
            setting_key: "work_shifts",
            setting_value: payload,
            setting_type: "json",
            description: "تعريف ورديات العمل",
            is_editable: true,
          }),
        });
      }
      setSaved("تم حفظ نطاق الموقع للورديات بنجاح.");
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="panel settings-section">
      <div className="panel-head">
        <div>
          <div className="eyebrow">نطاق الحضور الجغرافي</div>
          <h3>خريطة نطاق قبول الحضور والانصراف</h3>
        </div>
        <MapPin size={20} color="var(--teal)" />
      </div>

      {error && <div className="error" role="alert"><AlertCircle size={15} /> {error}</div>}
      {saved && <div className="success" role="status"><Check size={15} /> {saved}</div>}

      {!shifts.length ? (
        <div className="empty"><strong>لا توجد ورديات معرفة</strong>أضف ورديات أولًا من إعدادات المصنع.</div>
      ) : (
        <div className="form-grid">
          <div className="field">
            <label htmlFor="shift-select">الوردية</label>
            <select id="shift-select" value={selectedId} onChange={(event) => setSelectedId(event.target.value)}>
              {shifts.map((shift) => (
                <option key={shift.id} value={shift.id}>
                  {shift.name_ar || shift.name_en || shift.id} · {shift.start_time} - {shift.end_time}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="geofence-enabled">تفعيل نطاق الموقع</label>
            <select
              id="geofence-enabled"
              value={selected?.geofence_enabled ? "true" : "false"}
              onChange={(event) => updateSelected({ geofence_enabled: event.target.value === "true" })}
            >
              <option value="true">مفعّل</option>
              <option value="false">معطّل</option>
            </select>
          </div>

          <div className="field">
            <label htmlFor="geofence-radius">نصف القطر (متر)</label>
            <input
              id="geofence-radius"
              type="number"
              min={20}
              max={5000}
              value={String(selected?.geofence_radius_meters ?? DEFAULT_RADIUS)}
              onChange={(event) => updateSelected({ geofence_radius_meters: Number(event.target.value) || DEFAULT_RADIUS })}
            />
          </div>

          <div className="field">
            <label htmlFor="geofence-lat">خط العرض</label>
            <input
              id="geofence-lat"
              type="number"
              step="0.000001"
              value={selected?.geofence_center_lat ?? ""}
              onChange={(event) => onCoordinateInput(event, "geofence_center_lat")}
            />
          </div>

          <div className="field">
            <label htmlFor="geofence-lng">خط الطول</label>
            <input
              id="geofence-lng"
              type="number"
              step="0.000001"
              value={selected?.geofence_center_lng ?? ""}
              onChange={(event) => onCoordinateInput(event, "geofence_center_lng")}
            />
          </div>

          <div className="field wide">
            <button className="btn btn-muted" type="button" onClick={useCurrentLocation}>
              <Crosshair size={15} /> تحديد موقعي الحالي كمركز نطاق
            </button>
          </div>

          <div className="field wide">
            <label>الخريطة (اضغط لتحديد المركز)</label>
            <ShiftMapPicker
              center={center}
              radius={radius}
              onPick={(lat, lng) => updateSelected({ geofence_center_lat: lat, geofence_center_lng: lng })}
            />
            <small className="cell-sub">
              يتم قبول الحضور والانصراف فقط إذا كان المستخدم داخل الدائرة المحددة عند تفعيل النطاق.
            </small>
          </div>

          <div className="field wide">
            <button className="btn btn-primary" type="button" onClick={save} disabled={busy}>
              <Save size={15} /> {busy ? "جارٍ الحفظ…" : "حفظ نطاق الوردية"}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
