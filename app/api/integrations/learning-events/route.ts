import { createHmac, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
export const dynamic = "force-dynamic";
const eventTypes = new Set(["training_link_activated","training_started","module_completed","training_completed","certificate_issued","briefing_delivered","briefing_acknowledged"]);
export async function POST(req: NextRequest) {
 if (process.env.ENABLE_R6_EVENT_INGEST !== "true") return NextResponse.json({ error: "Learning-event ingestion is disabled for this release." }, { status: 503 });
 const secret=process.env.BD_EVENT_SECRET;if(!secret)return NextResponse.json({error:"Integration not configured"},{status:503});
 const raw=await req.text(), signature=req.headers.get("x-gfa-event-signature")||"";
 const expected=createHmac("sha256",secret).update(raw).digest("hex");
 if(!signature||signature.length!==expected.length||!timingSafeEqual(Buffer.from(signature),Buffer.from(expected))) return NextResponse.json({error:"Invalid signature"},{status:401});
 let e: Record<string,unknown>;try{e=JSON.parse(raw);}catch{return NextResponse.json({error:"Invalid JSON"},{status:400});}
 const source=String(e.source||""), externalEventId=String(e.externalEventId||""), eventType=String(e.eventType||""), companyId=String(e.companyId||""), driverId=String(e.driverId||""), enrolmentId=String(e.enrolmentId||""), occurredAt=String(e.occurredAt||"");
 if(!["betterdriver","moodle"].includes(source)||!externalEventId||!eventTypes.has(eventType)||!companyId||!driverId||!enrolmentId||Number.isNaN(Date.parse(occurredAt))) return NextResponse.json({error:"Invalid event envelope"},{status:400});
 const {data: enrolment}=await supabaseAdmin.from("enrolments").select("id,company_id,driver_id,status,progress_percent").eq("id",enrolmentId).eq("company_id",companyId).eq("driver_id",driverId).maybeSingle();
 if(!enrolment)return NextResponse.json({error:"Enrolment mapping not found"},{status:404});
 const {data: event,error}=await supabaseAdmin.from("learning_events").insert({source,external_event_id:externalEventId,event_type:eventType,company_id:companyId,driver_id:driverId,enrolment_id:enrolmentId,occurred_at:occurredAt,payload:e.payload||{}}).select("id").single();
 if(error?.code==="23505")return NextResponse.json({ok:true,duplicate:true});
 if(error||!event)return NextResponse.json({error:"Could not persist event"},{status:500});
 const updates:Record<string,unknown>={moodle_last_synced_at:new Date().toISOString()};
 if(eventType==="training_link_activated")updates.link_activated=true;
 if(eventType==="training_started"){updates.status="in_progress";updates.training_started_event_id=event.id;}
 if(eventType==="module_completed"){const p=Number((e.payload as Record<string,unknown>)?.progressPercent);if(Number.isFinite(p))updates.progress_percent=Math.max(Number(enrolment.progress_percent||0),Math.min(100,Math.round(p)));}
 if(eventType==="training_completed"){updates.status="completed";updates.completed_at=occurredAt;updates.progress_percent=100;}
 if(eventType==="certificate_issued"){updates.status="certified";updates.certified=true;updates.certified_at=occurredAt;updates.progress_percent=100;}
 const {error:updateError}=await supabaseAdmin.from("enrolments").update(updates).eq("id",enrolmentId);
 if(updateError){await supabaseAdmin.from("learning_events").update({processing_error:updateError.message}).eq("id",event.id);return NextResponse.json({error:"Event recorded but enrolment update failed"},{status:500});}
 await supabaseAdmin.from("learning_events").update({processed_at:new Date().toISOString()}).eq("id",event.id);
 return NextResponse.json({ok:true,eventId:event.id});
}
