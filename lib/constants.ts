// ─── GreenFreightAcademy — Static Constants ───────────────────────────────────
// All static strings, configuration, and mock data live here.
// Dynamic data (API responses, live metrics) is handled by Asif's API layer.

import type {
  Programme,
  AcademyMetrics,
  CareerPathway,
  EmployeeCSVRow,
  Employee,
} from "@/types";

// ─── Brand ────────────────────────────────────────────────────────────────────
export const SITE_NAME = "GreenFreightAcademy";
export const SITE_TAGLINE = "South Africa's specialist capability platform for the road freight sector";
export const SITE_DESCRIPTION =
  "GreenFreightAcademy helps road freight companies reduce risk and increase profits by building capability across drivers, managers, procurement teams, and transition leaders through scalable training, certification, reporting, and ongoing development.";
export const SITE_SHORT_DESCRIPTOR = "A scalable capability platform for practical road freight transformation.";

// ─── Logo URLs (CDN) ──────────────────────────────────────────────────────────
// TODO: Asif — upload GFA logo to CDN and replace these URLs
export const LOGO_URL = process.env.NEXT_PUBLIC_GFA_LOGO_URL ?? "/logo-placeholder.svg";

// ─── External URLs ────────────────────────────────────────────────────────────
export const ECOSYSTEM_URLS = {
  tag: process.env.NEXT_PUBLIC_TAG_URL ?? "https://www.transportactiongroup.com",
  betterDriver: process.env.NEXT_PUBLIC_BETTERDRIVER_URL ?? "https://www.betterdriver.co.za",
  zeroAfrica: process.env.NEXT_PUBLIC_ZERO_AFRICA_URL ?? "https://www.zeroafrica.org",
};

// ─── Navigation ───────────────────────────────────────────────────────────────
export const NAV_LINKS = [
  { label: "Programmes", href: "/programmes" },
  { label: "Pricing", href: "/pricing" },
  { label: "Publications", href: "/publications" },
  { label: "My Dashboard", href: "/dashboard" },
  { label: "Driver Search", href: "/registry" },
  { label: "About Us", href: "/about" },
] as const;

export const NAV_CTA_PRIMARY = { label: "JOIN NOW", href: "/contact?type=fleet-company" };
export const NAV_CTA_SECONDARY = { label: "Log in", href: "/login" };

// ─── Hero ─────────────────────────────────────────────────────────────────────
export const HERO = {
  headline: "Road freight runs on people.",
  headlineGradient: "We develop the people who run road freight.",
  supporting:
    "GreenFreightAcademy is South Africa\u2019s specialist capability platform for the road freight sector \u2014 practical training, certification, and development built by transport experts who understand trucks, drivers, and trucking.",
  strategicLine: "",
  ctaPrimary: { label: "JOIN NOW", href: "/contact?type=fleet-company" },
  ctaSecondary: { label: "", href: "" },
  ctaTertiary: { label: "", href: "" },
} as const;

// ─── Programmes ───────────────────────────────────────────────────────────────
export const PROGRAMMES: Programme[] = [
  {
    id: "ptdp",
    slug: "professional-truck-driver",
    title: "The Professional Truck Driver Programme",
    tier: "workforce",
    audience: "drivers",
    audienceLabel: "Drivers",
    shortDescription:
      "A comprehensive development programme that builds professional driving capability, safety discipline, and operational professionalism.",
    fullDescription:
      "The Professional Truck Driver Programme develops drivers across safety, professionalism, fuel efficiency, vehicle care, and operational discipline. Includes training, evaluation, certification, and quarterly CPD. Designed for fleet-wide rollout at an adoption-friendly price point.",
    outcomes: [
      "Improved safety discipline and incident reduction",
      "Better fuel efficiency and vehicle care",
      "Stronger professional identity and motivation",
      "Recognised certification and CPD record",
      "Useful evidence for RTMS and compliance reporting",
    ],
    price: 35,
    pricingModel: "monthly-per-driver",
    priceLabel: "R35 per driver per month",
    deliveryModel: "online-self-paced",
    durationLabel: "12-month programme with quarterly CPD",
    available: true,
    status: "active",
  },
  {
    id: "eco-driver",
    slug: "eco-driver-training",
    title: "Eco-Driver Training",
    tier: "workforce",
    audience: "drivers",
    audienceLabel: "Drivers",
    shortDescription:
      "Practical eco-driving skills that reduce fuel consumption, lower emissions, and improve vehicle longevity.",
    fullDescription:
      "Eco-Driver Training builds practical fuel-efficient driving skills that reduce fuel costs, lower emissions, and extend vehicle life. Includes training, evaluation, certification, and quarterly CPD. Designed for fleet-wide rollout at the same adoption-friendly price point as the Professional Truck Driver Programme.",
    outcomes: [
      "Measurable fuel consumption reduction",
      "Lower CO₂ emissions per kilometre",
      "Extended vehicle and tyre life",
      "Stronger driver environmental awareness",
      "Recognised eco-driver certification",
    ],
    price: 35,
    pricingModel: "monthly-per-driver",
    priceLabel: "R35 per driver per month",
    deliveryModel: "online-self-paced",
    durationLabel: "12-month programme with quarterly CPD",
    available: true,
    status: "active",
  },
  {
    id: "intro-green-freight",
    slug: "introduction-to-green-freight",
    title: "Introduction to Green Freight",
    tier: "enterprise",
    audience: "all-staff",
    audienceLabel: "All staff",
    shortDescription:
      "A foundational programme that builds shared understanding of green freight principles across the business.",
    fullDescription:
      "Introduction to Green Freight builds a common language and understanding of green freight principles, emissions performance, and sustainability in road transport. Suitable for all staff levels as a foundation for deeper capability development.",
    outcomes: [
      "Shared understanding of green freight across the business",
      "Awareness of emissions, efficiency, and sustainability",
      "Foundation for deeper programme participation",
    ],
    price: 1000,
    pricingModel: "once-off",
    priceLabel: "R1,000 per person",
    deliveryModel: "online-self-paced",
    durationLabel: "Self-paced, approximately 4–6 hours",
    available: true,
    status: "in-development",
  },
  {
    id: "road-freight-manager",
    slug: "road-freight-manager-training",
    title: "Green Road Freight Management",
    tier: "enterprise",
    audience: "managers",
    audienceLabel: "Managers",
    shortDescription:
      "Builds management capability for emissions reduction, profit improvement, and operational discipline in road freight.",
    fullDescription:
      "Green Road Freight Management equips freight managers with the tools, frameworks, and understanding needed to improve emissions performance, reduce operational costs, and strengthen profitability. Covers management of driver performance, fleet efficiency, sustainability reporting, and operational improvement.",
    outcomes: [
      "Improved management of driver and fleet performance",
      "Stronger understanding of emissions and cost reduction levers",
      "Better operational discipline and profitability",
      "Capability to support sustainability and compliance reporting",
    ],
    price: 1000,
    pricingModel: "once-off",
    priceLabel: "R1,000 per person",
    deliveryModel: "blended",
    durationLabel: "Structured programme — duration confirmed on enrolment",
    available: true,
    status: "in-development",
  },
  {
    id: "electric-truck-transformation",
    slug: "electric-truck-transformation",
    title: "Electric Truck Transformation Training",
    tier: "transition",
    audience: "transition-leaders",
    audienceLabel: "Transition leaders",
    shortDescription:
      "Prepares companies for zero-emission truck transition through practical planning, TCO understanding, and implementation readiness.",
    fullDescription:
      "Electric Truck Transformation Training builds the knowledge and planning capability needed to navigate the transition to zero-emission trucks. Covers total cost of ownership, infrastructure requirements, fleet readiness, driver adaptation, and implementation planning.",
    outcomes: [
      "Clear understanding of EV truck TCO and business case",
      "Infrastructure and charging readiness planning",
      "Fleet transition sequencing and risk management",
      "Driver and operational adaptation planning",
    ],
    price: 5000,
    pricingModel: "once-off",
    priceLabel: "R5,000 per person",
    deliveryModel: "blended",
    durationLabel: "Structured programme — duration confirmed on enrolment",
    available: true,
    status: "in-development",
  },
  {
    id: "green-freight-procurement",
    slug: "green-freight-procurement",
    title: "Green Freight Procurement Training",
    tier: "transition",
    audience: "procurement",
    audienceLabel: "Procurement teams",
    shortDescription:
      "Equips procurement teams to embed green freight requirements into supplier selection, contracts, and performance management.",
    fullDescription:
      "Green Freight Procurement Training helps procurement and supply chain teams understand how to embed green freight criteria into their procurement processes. Covers supplier evaluation, contract requirements, emissions performance measurement, and alignment with sustainability commitments.",
    outcomes: [
      "Ability to embed green freight criteria in procurement",
      "Stronger supplier evaluation and performance management",
      "Alignment with corporate sustainability commitments",
      "Practical procurement frameworks for greener freight",
    ],
    price: 5000,
    pricingModel: "once-off",
    priceLabel: "R5,000 per person",
    deliveryModel: "blended",
    durationLabel: "Structured programme — duration confirmed on enrolment",
    available: true,
    status: "in-development",
  },
];
// ─── Capability Pillars ───────────────────────────────────────────────────────
export const CAPABILITY_PILLARS = [
  {
    id: "workforce",
    title: "Workforce Capability",
    description: "Professional driver and eco-driving development for stronger daily performance.",
    icon: "users",
    programmes: ["ptdp", "eco-driver"],
  },
  {
    id: "management",
    title: "Management Capability",
    description: "Training for managers to improve emissions performance, profitability, and operational discipline.",
    icon: "briefcase",
    programmes: ["road-freight-manager"],
  },
  {
    id: "procurement",
    title: "Procurement Capability",
    description: "Green freight procurement understanding for better decision-making and alignment.",
    icon: "clipboard-list",
    programmes: ["green-freight-procurement"],
  },
  {
    id: "transition",
    title: "Transition Capability",
    description: "Electric truck transformation training for future readiness and implementation.",
    icon: "zap",
    programmes: ["electric-truck-transformation"],
  },
  {
    id: "certification",
    title: "Certification and Reporting",
    description: "Track progress, completions, certification, and cohort performance with management visibility.",
    icon: "award",
    programmes: [],
  },
  {
    id: "cpd",
    title: "Continuous Professional Development",
    description: "Keep learning alive through structured CPD and field-informed updates.",
    icon: "refresh-cw",
    programmes: [],
  },
] as const;

// ─── Career Path Planner ──────────────────────────────────────────────────────
export const CAREER_PATHWAYS: CareerPathway[] = [
  {
    roleType: "driver",
    roleLabel: "Professional Driver",
    description: "Build professional driving capability, earn certification, and sustain growth through CPD.",
    recommendedProgrammes: ["ptdp", "eco-driver"],
    optionalProgrammes: ["intro-green-freight"],
  },
  {
    roleType: "manager",
    roleLabel: "Freight Manager",
    description: "Improve operational performance, emissions management, and profitability.",
    recommendedProgrammes: ["road-freight-manager"],
    optionalProgrammes: ["intro-green-freight", "electric-truck-transformation"],
  },
  {
    roleType: "procurement",
    roleLabel: "Procurement / Supply Chain",
    description: "Embed green freight criteria into procurement and supplier management.",
    recommendedProgrammes: ["green-freight-procurement"],
    optionalProgrammes: ["intro-green-freight"],
  },
  {
    roleType: "transition-leader",
    roleLabel: "Transition / Sustainability Leader",
    description: "Lead electric truck transition and green freight implementation across the business.",
    recommendedProgrammes: ["electric-truck-transformation", "road-freight-manager"],
    optionalProgrammes: ["intro-green-freight", "green-freight-procurement"],
  },
  {
    roleType: "all-staff",
    roleLabel: "All Staff",
    description: "Build a shared foundation of green freight understanding across the business.",
    recommendedProgrammes: ["intro-green-freight"],
    optionalProgrammes: [],
  },
];

// ─── Academy Metrics (Demo / Mock) ────────────────────────────────────────────
// TODO: Asif to replace with live data from /api/metrics
// Mock data derived from AutoCarriers (89 drivers) + KDG (63 drivers) registers
// at approximately 84% completion rate
export const DEMO_METRICS: AcademyMetrics = {
  seatsBooked: 252,
  certificationsCompleted: 207,
  companiesEnrolled: 7,
  lastUpdated: new Date().toISOString(),
  dataSource: "demo",
};

// ─── Mock Employees (Demo Dashboard) ─────────────────────────────────────────
// TODO: Asif to replace with live data from Supabase via /api/employees
// Mock data structure derived from uploaded driver registers
export const MOCK_EMPLOYEES: Employee[] = [
  {
    id: "emp-001",
    name: "Sipho Dlamini",
    email: "sipho.dlamini@autocarriers.co.za",
    mobile: "082 555 0101",
    role: "Driver",
    companyId: "company-001",
    createdAt: "2026-01-15T08:00:00Z",
    enrolments: [
      {
        programmeId: "ptdp",
        programmeTitle: "The Professional Truck Driver Programme",
        status: "certified",
        progressPercent: 100,
        startedAt: "2026-01-20T08:00:00Z",
        completedAt: "2026-03-15T08:00:00Z",
        certificateUrl: "#",
        cpdCompletions: 1,
        lastActivityAt: "2026-04-01T08:00:00Z",
      },
    ],
  },
  {
    id: "emp-002",
    name: "Thabo Mokoena",
    email: "thabo.mokoena@autocarriers.co.za",
    mobile: "083 555 0102",
    role: "Driver",
    companyId: "company-001",
    createdAt: "2026-01-15T08:00:00Z",
    enrolments: [
      {
        programmeId: "ptdp",
        programmeTitle: "The Professional Truck Driver Programme",
        status: "in-progress",
        progressPercent: 68,
        startedAt: "2026-01-20T08:00:00Z",
        cpdCompletions: 0,
        lastActivityAt: "2026-04-10T08:00:00Z",
      },
    ],
  },
  {
    id: "emp-003",
    name: "Nomsa Khumalo",
    email: "nomsa.khumalo@autocarriers.co.za",
    mobile: "084 555 0103",
    role: "Driver",
    companyId: "company-001",
    createdAt: "2026-01-15T08:00:00Z",
    enrolments: [
      {
        programmeId: "ptdp",
        programmeTitle: "The Professional Truck Driver Programme",
        status: "in-progress",
        progressPercent: 45,
        startedAt: "2026-02-01T08:00:00Z",
        cpdCompletions: 0,
        lastActivityAt: "2026-04-08T08:00:00Z",
      },
      {
        programmeId: "eco-driver",
        programmeTitle: "Eco-Driver Training",
        status: "not-enrolled",
        progressPercent: 0,
        cpdCompletions: 0,
      },
    ],
  },
  {
    id: "emp-004",
    name: "Bongani Zulu",
    email: "bongani.zulu@autocarriers.co.za",
    role: "Driver",
    companyId: "company-001",
    createdAt: "2026-01-15T08:00:00Z",
    enrolments: [],
  },
  {
    id: "emp-005",
    name: "Lungelo Nkosi",
    email: "lungelo.nkosi@autocarriers.co.za",
    role: "Fleet Manager",
    companyId: "company-001",
    createdAt: "2026-01-15T08:00:00Z",
    enrolments: [
      {
        programmeId: "road-freight-manager",
        programmeTitle: "Green Road Freight Management",
        status: "in-progress",
        progressPercent: 30,
        startedAt: "2026-03-01T08:00:00Z",
        cpdCompletions: 0,
        lastActivityAt: "2026-04-05T08:00:00Z",
      },
    ],
  },
];

// ─── CSV Template Fields ──────────────────────────────────────────────────────
export const CSV_TEMPLATE_HEADERS: (keyof EmployeeCSVRow)[] = [
  "name",
  "role",
  "email",
  "mobile",
];

export const CSV_TEMPLATE_EXAMPLE: EmployeeCSVRow[] = [
  { name: "John Smith", role: "Driver", email: "john.smith@company.co.za", mobile: "082 000 0001" },
  { name: "Mary Jones", role: "Fleet Manager", email: "mary.jones@company.co.za", mobile: "083 000 0002" },
];

// ─── Footer Links ─────────────────────────────────────────────────────────────
export const FOOTER_LINKS = [
  {
    heading: "Programmes",
    links: [
      { label: "Professional Truck Driver", href: "/programmes#ptdp" },
      { label: "Eco-Driver Training", href: "/programmes#eco-driver" },
      { label: "Green Road Freight Management", href: "/programmes#road-freight-manager" },
      { label: "Electric Truck Transformation", href: "/programmes#electric-truck" },
      { label: "Green Freight Procurement", href: "/programmes#procurement" },
    ],
  },
  {
    heading: "Platform",
    links: [
      { label: "Pricing", href: "/pricing" },
      { label: "My Dashboard", href: "/dashboard" },
      { label: "Driver Search", href: "/registry" },
      { label: "Career Path Planner", href: "/dashboard/career-planner" },
    ],
  },
  {
    heading: "Ecosystem",
    links: [
      { label: "Transport Action Group", href: ECOSYSTEM_URLS.tag },
      { label: "BetterDriver", href: ECOSYSTEM_URLS.betterDriver },
      { label: "ZeroAfrica", href: ECOSYSTEM_URLS.zeroAfrica },
    ],
  },
  {
    heading: "Company",
    links: [
      { label: "About GFA", href: "/about" },
      { label: "Publications", href: "/publications" },
      { label: "Contact", href: "/contact" },
      { label: "Register your company", href: "/register" },
      { label: "Log in", href: "/login" },
    ],
  },
] as const;
