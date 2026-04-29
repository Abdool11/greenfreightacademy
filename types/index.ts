// ─── GreenFreightAcademy — TypeScript Interfaces ──────────────────────────────
// All data shapes used across the GFA platform.
// Dynamic data is fetched by Asif's API layer; these types define the contract.

// ─── Programme ────────────────────────────────────────────────────────────────

export type ProgrammeTier = "workforce" | "enterprise" | "transition";
export type ProgrammeAudience = "drivers" | "managers" | "procurement" | "all-staff" | "transition-leaders";
export type PricingModel = "monthly-per-driver" | "once-off";
export type DeliveryModel = "online-self-paced" | "blended" | "facilitated";

export interface Programme {
  id: string;
  slug: string;
  title: string;
  tier: ProgrammeTier;
  audience: ProgrammeAudience;
  audienceLabel: string;
  shortDescription: string;
  fullDescription: string;
  outcomes: string[];
  price: number;
  pricingModel: PricingModel;
  priceLabel: string;
  deliveryModel: DeliveryModel;
  durationLabel: string;
  modules?: ProgrammeModule[];
  available: boolean;
  status?: "active" | "in-development" | "coming-soon";
}

export interface ProgrammeModule {
  id: string;
  title: string;
  description: string;
  durationMinutes: number;
}

// ─── Employee / Candidate ─────────────────────────────────────────────────────

export type EnrolmentStatus = "not-enrolled" | "in-progress" | "completed" | "certified" | "overdue";

export interface Employee {
  id: string;
  name: string;
  email: string;
  mobile?: string;
  role: string;
  companyId: string;
  enrolments: EmployeeEnrolment[];
  createdAt: string; // ISO8601
}

export interface EmployeeEnrolment {
  programmeId: string;
  programmeTitle: string;
  status: EnrolmentStatus;
  progressPercent: number;
  startedAt?: string; // ISO8601
  completedAt?: string; // ISO8601
  certificateUrl?: string;
  cpdCompletions: number;
  lastActivityAt?: string; // ISO8601
}

// ─── Company / Organisation ───────────────────────────────────────────────────

export interface Company {
  id: string;
  name: string;
  contactName: string;
  contactEmail: string;
  contactMobile?: string;
  fleetSize?: number;
  organisationRole?: string;
  createdAt: string; // ISO8601
}

// ─── Enrolment Campaign ───────────────────────────────────────────────────────

export type CampaignStatus = "draft" | "active" | "completed" | "cancelled";

export interface EnrolmentCampaign {
  id: string;
  companyId: string;
  programmeId: string;
  programmeTitle: string;
  employeeIds: string[];
  seatCount: number;
  status: CampaignStatus;
  startedAt: string; // ISO8601
  completedCount: number;
  certifiedCount: number;
}

// ─── CPD Submission ───────────────────────────────────────────────────────────

export type CPDVisibility = "anonymous-public" | "confidential";
export type CPDDispatch = "urgent" | "standard";
export type CPDStatus = "submitted" | "under-review" | "accepted" | "in-development" | "published" | "declined";

export interface CPDSubmission {
  id: string;
  companyId: string;
  incidentDescription: string;
  mitigationLesson: string;
  visibility: CPDVisibility;
  dispatch: CPDDispatch;
  urgentFeePaid: boolean;
  status: CPDStatus;
  submittedAt: string; // ISO8601
  publishedAt?: string; // ISO8601
}

// ─── Reporting ────────────────────────────────────────────────────────────────

export interface CohortReport {
  programmeId: string;
  programmeTitle: string;
  companyId: string;
  totalEnrolled: number;
  inProgress: number;
  completed: number;
  certified: number;
  overdue: number;
  averageProgressPercent: number;
  generatedAt: string; // ISO8601
}

export interface EmployeeCertification {
  employeeId: string;
  employeeName: string;
  programmeId: string;
  programmeTitle: string;
  certifiedAt: string; // ISO8601
  certificateUrl: string;
  cpdCompletions: number;
}

// ─── Registry ─────────────────────────────────────────────────────────────────

export interface RegistryDriver {
  id: string;
  name: string;
  certifications: RegistryCertification[];
  registeredAt: string; // ISO8601
}

export interface RegistryCertification {
  programmeTitle: string;
  certifiedAt: string; // ISO8601
  certificateId: string;
}

// ─── Enquiry Form ─────────────────────────────────────────────────────────────

export type EnquiryType = "fleet-company" | "individual-learner" | "partnership" | "general";

export interface EnquiryFormData {
  organisationName: string;
  organisationRole?: string;
  contactName: string;
  email: string;
  mobile: string;
  fleetSize?: string;
  enquiryType: EnquiryType;
  message: string;
}

// ─── Metrics (Academy Impact Strip) ──────────────────────────────────────────

export interface AcademyMetrics {
  seatsBooked: number;
  certificationsCompleted: number;
  companiesEnrolled: number;
  lastUpdated: string; // ISO8601
  dataSource: "live" | "demo";
}

// ─── Career Path Planner ──────────────────────────────────────────────────────

export type EmployeeRoleType = "driver" | "manager" | "procurement" | "transition-leader" | "all-staff";

export interface CareerPathway {
  roleType: EmployeeRoleType;
  roleLabel: string;
  description: string;
  recommendedProgrammes: string[]; // programme IDs
  optionalProgrammes: string[]; // programme IDs
}

// ─── CSV Import ───────────────────────────────────────────────────────────────

export interface EmployeeCSVRow {
  name: string;
  role: string;
  email: string;
  mobile?: string;
}
