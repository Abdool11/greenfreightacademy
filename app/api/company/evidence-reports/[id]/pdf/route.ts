import { NextRequest, NextResponse } from "next/server";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { getSession } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
export const dynamic = "force-dynamic";
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
 const session = await getSession(); if (!session) return new NextResponse("Unauthorized", { status: 401 });
 const { id } = await params;
 const actorId = session.supabase_user_id ?? session.id ?? session.companyId;
 const { data: report } = await supabaseAdmin.from("evidence_reports").select("*").eq("id", id).eq("company_id", session.companyId).eq("status", "active").single();
 if (!report) return new NextResponse("Report not found", { status: 404 });
 const snap = report.snapshot_json as { company?: string; reportType?: string; generatedAt?: string; drivers?: Array<{ id:string; first_name:string; last_name:string; mobile?:string }>; enrolments?: Array<{ driver_id:string; status:string; progress_percent:number; completed_at?:string; courses?: {name?:string} }> };
 const doc = new jsPDF("p", "mm", "a4"), w = doc.internal.pageSize.getWidth();
 doc.setFillColor(15,31,61); doc.rect(0,0,w,30,"F"); doc.setTextColor(255,255,255); doc.setFont("helvetica","bold"); doc.setFontSize(17); doc.text("Green Freight Academy",14,14); doc.setFontSize(11); doc.text("Compliance & Safety Evidence Pack",14,22);
 doc.setTextColor(20,30,45); doc.setFontSize(10); doc.text(`Control No: ${report.control_number}`,14,40); doc.text(`Report type: ${report.report_type}`,14,46); doc.text(`Generated: ${new Date(report.generated_at).toLocaleString("en-ZA")}`,14,52); doc.text(`Integrity checksum: ${report.sha256_checksum}`,14,58,{maxWidth:w-28});
 const drivers = snap.drivers || [], enrolments = snap.enrolments || [];
 autoTable(doc,{startY:68,head:[["Driver","Mobile","Programme","Status","Progress","Completed"]],body: enrolments.map(e=>{const d=drivers.find(x=>x.id===e.driver_id);return [`${d?.first_name||""} ${d?.last_name||""}`.trim()||"—",d?.mobile||"—",e.courses?.name||"—",e.status||"—",`${e.progress_percent||0}%`,e.completed_at?new Date(e.completed_at).toLocaleDateString("en-ZA"):"—"];}),theme:"grid",headStyles:{fillColor:[15,31,61]}});
 doc.setFontSize(8); doc.setTextColor(90,100,110); doc.text("This controlled report is generated from an immutable GFA evidence snapshot. Validate using the report control number before relying on it.",14,285,{maxWidth:w-28});
 await supabaseAdmin.from("evidence_report_events").insert({report_id:report.id,event_type:"downloaded",actor_id:actorId});
 return new NextResponse(Buffer.from(doc.output("arraybuffer")),{headers:{"Content-Type":"application/pdf","Content-Disposition":`attachment; filename="${report.control_number}.pdf"`}});
}
