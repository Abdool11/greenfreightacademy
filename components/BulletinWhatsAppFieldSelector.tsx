"use client";

import { MessageCircle, Eye } from "lucide-react";

export type BulletinNotificationField =
  | "title"
  | "category"
  | "urgency"
  | "driver_action"
  | "mitigation_message"
  | "portal_link";

interface FieldOption {
  key: BulletinNotificationField;
  label: string;
  description: string;
  recommended?: boolean;
}

const FIELD_OPTIONS: FieldOption[] = [
  { key: "title", label: "Topic / Title", description: "The bulletin subject line", recommended: true },
  { key: "urgency", label: "Urgency Level", description: "URGENT or Standard label with emoji", recommended: true },
  { key: "category", label: "Category", description: "Safety, Compliance, Process, etc." },
  { key: "driver_action", label: "Driver Action Required", description: "What the driver must do" },
  { key: "mitigation_message", label: "What To Do", description: "The mitigation or corrective message" },
  { key: "portal_link", label: "Portal Link", description: "Link to read & acknowledge in BetterDriver", recommended: true },
];

interface Props {
  selected: BulletinNotificationField[];
  onChange: (fields: BulletinNotificationField[]) => void;
  driverName?: string;
  bulletinTitle?: string;
  urgency?: "standard" | "urgent";
  driverAction?: string;
}

export default function BulletinWhatsAppFieldSelector({
  selected,
  onChange,
  driverName = "Sipho",
  bulletinTitle = "Tyre pressure check procedure",
  urgency = "standard",
  driverAction = "Check all tyre pressures before departure",
}: Props) {
  const toggle = (field: BulletinNotificationField) => {
    if (selected.includes(field)) {
      onChange(selected.filter((f) => f !== field));
    } else {
      onChange([...selected, field]);
    }
  };

  // Build preview message
  const preview = buildPreview(selected, driverName, bulletinTitle, urgency, driverAction);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
          <MessageCircle size={15} style={{ color: "#25d366" }} />
          <span style={{ fontSize: "0.875rem", fontWeight: 700, color: "rgba(255,255,255,0.85)" }}>
            WhatsApp Notification Fields
          </span>
        </div>
        <p style={{ fontSize: "0.8125rem", color: "rgba(255,255,255,0.45)", margin: 0 }}>
          Select which fields to include in the WhatsApp message sent to each driver.
        </p>
      </div>

      {/* Field checkboxes */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        {FIELD_OPTIONS.map((opt) => {
          const isSelected = selected.includes(opt.key);
          return (
            <label
              key={opt.key}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                padding: "0.625rem 0.875rem",
                background: isSelected ? "rgba(37,211,102,0.07)" : "rgba(255,255,255,0.03)",
                border: `1px solid ${isSelected ? "rgba(37,211,102,0.25)" : "rgba(255,255,255,0.08)"}`,
                borderRadius: "0.5rem",
                cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => toggle(opt.key)}
                style={{ width: "1rem", height: "1rem", accentColor: "#25d366", flexShrink: 0 }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <span style={{ fontSize: "0.875rem", fontWeight: 600, color: isSelected ? "#f9fafb" : "rgba(255,255,255,0.6)" }}>
                    {opt.label}
                  </span>
                  {opt.recommended && (
                    <span style={{ fontSize: "0.625rem", padding: "0.1rem 0.375rem", background: "rgba(37,211,102,0.15)", border: "1px solid rgba(37,211,102,0.3)", borderRadius: "9999px", color: "#25d366", fontWeight: 700 }}>
                      REC
                    </span>
                  )}
                </div>
                <span style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.35)" }}>{opt.description}</span>
              </div>
            </label>
          );
        })}
      </div>

      {/* Live preview */}
      <div style={{ background: "#0a1628", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "0.75rem", padding: "1rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.375rem", marginBottom: "0.75rem" }}>
          <Eye size={13} style={{ color: "rgba(255,255,255,0.4)" }} />
          <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Preview</span>
        </div>
        <div
          style={{
            background: "#1a2a1a",
            border: "1px solid rgba(37,211,102,0.15)",
            borderRadius: "0.625rem",
            padding: "0.875rem",
            fontFamily: "monospace",
            fontSize: "0.8125rem",
            color: "#d1fae5",
            lineHeight: 1.6,
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
        >
          {preview}
        </div>
      </div>
    </div>
  );
}

function buildPreview(
  fields: BulletinNotificationField[],
  driverName: string,
  title: string,
  urgency: "standard" | "urgent",
  driverAction: string
): string {
  const emoji = urgency === "urgent" ? "🚨" : "📋";
  const urgencyLabel = urgency === "urgent" ? "URGENT" : "Standard";
  const lines: string[] = [];

  lines.push(`Hi ${driverName},`);
  lines.push("");

  if (fields.includes("urgency")) {
    lines.push(`${emoji} *${urgencyLabel} Driver Bulletin*`);
  } else {
    lines.push(`${emoji} *Driver Bulletin*`);
  }

  if (fields.includes("title") && title) lines.push(`*Topic:* ${title}`);
  if (fields.includes("category")) lines.push(`*Category:* Safety`);
  if (fields.includes("driver_action") && driverAction) lines.push(`*Action required:* ${driverAction}`);
  if (fields.includes("mitigation_message")) lines.push(`*What to do:* Inspect all tyres before departure and report any issues to your supervisor immediately.`);

  if (fields.includes("portal_link")) {
    lines.push("");
    lines.push(`Read the full bulletin and acknowledge receipt here:`);
    lines.push(`https://betterdriver.co.za/portal/bulletins/abc123`);
  }

  lines.push("");
  lines.push("— Green Freight Academy");

  return lines.join("\n");
}
