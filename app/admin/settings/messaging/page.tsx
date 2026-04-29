"use client";
export const dynamic = "force-dynamic";
import { useState, useEffect } from "react";
import Link from "next/link";

interface Template {
  key: string;
  label: string;
  description: string;
  variables: string[];
  value: string;
}

const DEFAULT_TEMPLATES: Template[] = [
  {
    key: "whatsapp_welcome_template",
    label: "Driver Welcome (Activation)",
    description: "Sent when a cohort is approved and goes live. Includes the magic link.",
    variables: ["{{driver_name}}", "{{programme_name}}", "{{company_name}}", "{{portal_link}}"],
    value: "Hi {{driver_name}}, welcome to BetterDriver! Your {{programme_name}} training has been activated by {{company_name}}. Click here to get started: {{portal_link}}",
  },
  {
    key: "whatsapp_reminder_template",
    label: "Training Reminder",
    description: "Sent to drivers who have not started their training after 7 days.",
    variables: ["{{driver_name}}", "{{programme_name}}", "{{portal_link}}"],
    value: "Hi {{driver_name}}, just a reminder that your {{programme_name}} training is waiting for you. Start here: {{portal_link}}",
  },
  {
    key: "whatsapp_bulletin_template",
    label: "Driver Bulletin",
    description: "Sent when a new driver bulletin is issued to a cohort.",
    variables: ["{{driver_name}}", "{{bulletin_title}}", "{{urgency}}", "{{portal_link}}"],
    value: "Hi {{driver_name}}, a new {{urgency}} bulletin has been issued: {{bulletin_title}}. Please review it here: {{portal_link}}",
  },
  {
    key: "whatsapp_cpd_template",
    label: "CPD Module Available",
    description: "Sent when a new quarterly CPD module is published.",
    variables: ["{{driver_name}}", "{{module_title}}", "{{quarter}}", "{{portal_link}}"],
    value: "Hi {{driver_name}}, your {{quarter}} CPD module is now available: {{module_title}}. Complete it here: {{portal_link}}",
  },
  {
    key: "whatsapp_certificate_template",
    label: "Certificate Issued",
    description: "Sent when a driver receives their programme certificate.",
    variables: ["{{driver_name}}", "{{programme_name}}", "{{certificate_number}}", "{{portal_link}}"],
    value: "Congratulations {{driver_name}}! You have completed {{programme_name}} and your certificate ({{certificate_number}}) is ready. View it here: {{portal_link}}",
  },
  {
    key: "whatsapp_trial_template",
    label: "Trial Voucher Invitation",
    description: "Sent to prospective clients with a trial voucher.",
    variables: ["{{contact_name}}", "{{company_name}}", "{{seats}}", "{{expires_date}}", "{{activation_link}}", "{{welcome_message}}"],
    value: "Hi {{contact_name}}, {{welcome_message}} You have been invited to trial GreenFreightAcademy with {{seats}} driver seat(s). Activate your trial here: {{activation_link}} (expires {{expires_date}})",
  },
];

export default function MessagingSettingsPage() {
  const [templates, setTemplates] = useState<Template[]>(DEFAULT_TEMPLATES);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [channel, setChannel] = useState<"both" | "whatsapp" | "email">("both");
  const [preview, setPreview] = useState<string | null>(null);
  const [previewKey, setPreviewKey] = useState<string | null>(null);

  useEffect(() => {
    // Load saved templates from site_config
    fetch("/api/admin/settings/messaging")
      .then((r) => r.json())
      .then((data) => {
        if (data.templates) {
          setTemplates((prev) =>
            prev.map((t) => ({
              ...t,
              value: data.templates[t.key] ?? t.value,
            }))
          );
        }
        if (data.channel) setChannel(data.channel);
      })
      .catch(() => {});
  }, []);

  function updateTemplate(key: string, value: string) {
    setTemplates((prev) => prev.map((t) => (t.key === key ? { ...t, value } : t)));
  }

  function showPreview(template: Template) {
    let text = template.value;
    // Replace variables with sample values
    const samples: Record<string, string> = {
      "{{driver_name}}": "John Smith",
      "{{programme_name}}": "Professional Truck Driver Programme",
      "{{company_name}}": "Transnet Freight",
      "{{portal_link}}": "https://betterdriver.co.za/activate?token=abc123",
      "{{bulletin_title}}": "Tyre Pressure Safety Check",
      "{{urgency}}": "urgent",
      "{{module_title}}": "Eco-Driving Fundamentals Q2 2026",
      "{{quarter}}": "Q2 2026",
      "{{certificate_number}}": "GFA-2026-001234",
      "{{contact_name}}": "Sarah Johnson",
      "{{seats}}": "5",
      "{{expires_date}}": "30 May 2026",
      "{{activation_link}}": "https://greenfreightacademy.com/trial?code=TRIAL-ZA-XK7",
      "{{welcome_message}}": "We would love for you to experience our platform firsthand.",
    };
    for (const [variable, sample] of Object.entries(samples)) {
      text = text.replace(new RegExp(variable.replace(/[{}]/g, "\\$&"), "g"), sample);
    }
    setPreview(text);
    setPreviewKey(template.key);
  }

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch("/api/admin/settings/messaging", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templates: Object.fromEntries(templates.map((t) => [t.key, t.value])),
          channel,
        }),
      });
      if (res.ok) setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0a1628] text-white">
      <nav className="bg-[#111f3a] border-b border-slate-700/50 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center gap-4">
          <Link href="/admin/dashboard" className="text-slate-400 hover:text-white text-sm">← Dashboard</Link>
          <span className="text-slate-600">/</span>
          <span className="text-white text-sm font-medium">Messaging Settings</span>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto p-8">
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">Messaging Settings</h1>
            <p className="text-slate-400 text-sm mt-1">
              Customise the 6 message templates sent to drivers and prospects
            </p>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-[#2ecc71] hover:bg-[#27ae60] disabled:opacity-50 text-white font-semibold px-6 py-2.5 rounded-lg transition-colors"
          >
            {saving ? "Saving…" : saved ? "✓ Saved" : "Save Changes"}
          </button>
        </div>

        {/* Channel toggle */}
        <div className="bg-[#111f3a] border border-slate-700/50 rounded-xl p-6 mb-6">
          <h2 className="text-white font-semibold mb-3">Default Delivery Channel</h2>
          <p className="text-slate-400 text-sm mb-4">
            Choose how messages are sent by default. Individual sends can override this.
          </p>
          <div className="flex gap-3">
            {(["both", "whatsapp", "email"] as const).map((c) => (
              <button
                key={c}
                onClick={() => setChannel(c)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${
                  channel === c
                    ? "bg-[#2ecc71] border-[#2ecc71] text-white"
                    : "bg-transparent border-slate-600 text-slate-400 hover:border-slate-400"
                }`}
              >
                {c === "both" ? "WhatsApp + Email" : c === "whatsapp" ? "WhatsApp only" : "Email only"}
              </button>
            ))}
          </div>
        </div>

        {/* Templates */}
        <div className="space-y-6">
          {templates.map((template) => (
            <div key={template.key} className="bg-[#111f3a] border border-slate-700/50 rounded-xl p-6">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <h3 className="text-white font-semibold">{template.label}</h3>
                  <p className="text-slate-400 text-sm mt-0.5">{template.description}</p>
                </div>
                <button
                  onClick={() => showPreview(template)}
                  className="text-[#2ecc71] hover:underline text-sm flex-shrink-0"
                >
                  Preview →
                </button>
              </div>

              {/* Variable chips */}
              <div className="flex flex-wrap gap-1.5 mb-3">
                {template.variables.map((v) => (
                  <span
                    key={v}
                    onClick={() => {
                      const el = document.getElementById(`template-${template.key}`) as HTMLTextAreaElement;
                      if (el) {
                        const pos = el.selectionStart;
                        const newVal = el.value.slice(0, pos) + v + el.value.slice(pos);
                        updateTemplate(template.key, newVal);
                      }
                    }}
                    className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 px-2 py-0.5 rounded cursor-pointer transition-colors font-mono"
                    title="Click to insert at cursor"
                  >
                    {v}
                  </span>
                ))}
              </div>

              <textarea
                id={`template-${template.key}`}
                value={template.value}
                onChange={(e) => updateTemplate(template.key, e.target.value)}
                rows={3}
                className="w-full bg-[#0a1628] border border-slate-600 rounded-lg px-4 py-3 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-[#2ecc71] focus:ring-1 focus:ring-[#2ecc71] transition-colors resize-none"
              />

              {/* Preview panel */}
              {previewKey === template.key && preview && (
                <div className="mt-3 bg-[#0a1628] border border-[#2ecc71]/30 rounded-lg p-4">
                  <div className="text-[#2ecc71] text-xs font-medium mb-2">Preview (with sample values)</div>
                  <p className="text-slate-300 text-sm leading-relaxed">{preview}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
