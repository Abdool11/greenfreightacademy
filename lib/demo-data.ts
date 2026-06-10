// ─── GFA Demo Mode — Mock Data Layer ─────────────────────────────────────────
// All data here is fictional and used exclusively for the guided demo walkthrough.
// No database reads or writes occur when demo mode is active.

export const DEMO_COMPANY = {
  id: "demo-company-001",
  name: "Horizon Freight (Pty) Ltd",
  contact_name: "Sarah Nkosi",
  contact_email: "sarah.nkosi@horizonfreight.co.za",
  phone: "+27 11 555 0100",
  fleet_size: 48,
  region: "Gauteng",
};

export const DEMO_DRIVERS = [
  { id: "d1", first_name: "Thabo",    last_name: "Dlamini",   mobile: "+27 82 111 0001", email: "thabo.d@horizonfreight.co.za",   branch: "Johannesburg", region: "Gauteng" },
  { id: "d2", first_name: "Sipho",    last_name: "Mokoena",   mobile: "+27 82 111 0002", email: "sipho.m@horizonfreight.co.za",   branch: "Johannesburg", region: "Gauteng" },
  { id: "d3", first_name: "Lungelo",  last_name: "Zulu",      mobile: "+27 82 111 0003", email: "lungelo.z@horizonfreight.co.za",  branch: "Johannesburg", region: "Gauteng" },
  { id: "d4", first_name: "Bongani",  last_name: "Khumalo",   mobile: "+27 82 111 0004", email: "bongani.k@horizonfreight.co.za", branch: "Pretoria",     region: "Gauteng" },
  { id: "d5", first_name: "Andile",   last_name: "Nxumalo",   mobile: "+27 82 111 0005", email: "andile.n@horizonfreight.co.za",  branch: "Pretoria",     region: "Gauteng" },
  { id: "d6", first_name: "Nhlanhla", last_name: "Sithole",   mobile: "+27 82 111 0006", email: "nhlanhla.s@horizonfreight.co.za",branch: "Pretoria",     region: "Gauteng" },
  { id: "d7", first_name: "Mandla",   last_name: "Mthembu",   mobile: "+27 82 111 0007", email: "mandla.m@horizonfreight.co.za",  branch: "Durban",       region: "KZN" },
  { id: "d8", first_name: "Siyanda",  last_name: "Ntuli",     mobile: "+27 82 111 0008", email: "siyanda.n@horizonfreight.co.za", branch: "Durban",       region: "KZN" },
  { id: "d9", first_name: "Ayanda",   last_name: "Mkhize",    mobile: "+27 82 111 0009", email: "ayanda.m@horizonfreight.co.za",  branch: "Durban",       region: "KZN" },
  { id: "d10",first_name: "Lwazi",    last_name: "Hadebe",    mobile: "+27 82 111 0010", email: "lwazi.h@horizonfreight.co.za",   branch: "Cape Town",    region: "Western Cape" },
];

export const DEMO_COURSES = [
  { id: "c1", name: "Professional Truck Driver Programme", slug: "ptdp", module_count: 8, status: "active" },
  { id: "c2", name: "Eco-Driver Training",                 slug: "eco-driver", module_count: 6, status: "active" },
];

export const DEMO_ENROLMENTS = [
  // Thabo — PTDP — certified
  { id: "e1",  driver_id: "d1", course_id: "c1", status: "certified",    progress_modules: 8, link_activated: true,  certified: true,  nudge_sent_at: null },
  // Sipho — PTDP — in progress
  { id: "e2",  driver_id: "d2", course_id: "c1", status: "in-progress",  progress_modules: 5, link_activated: true,  certified: false, nudge_sent_at: null },
  // Lungelo — PTDP — in progress
  { id: "e3",  driver_id: "d3", course_id: "c1", status: "in-progress",  progress_modules: 3, link_activated: true,  certified: false, nudge_sent_at: null },
  // Bongani — PTDP — not started
  { id: "e4",  driver_id: "d4", course_id: "c1", status: "enrolled",     progress_modules: 0, link_activated: false, certified: false, nudge_sent_at: null },
  // Andile — PTDP — not started
  { id: "e5",  driver_id: "d5", course_id: "c1", status: "enrolled",     progress_modules: 0, link_activated: false, certified: false, nudge_sent_at: null },
  // Nhlanhla — Eco — certified
  { id: "e6",  driver_id: "d6", course_id: "c2", status: "certified",    progress_modules: 6, link_activated: true,  certified: true,  nudge_sent_at: null },
  // Mandla — Eco — in progress
  { id: "e7",  driver_id: "d7", course_id: "c2", status: "in-progress",  progress_modules: 4, link_activated: true,  certified: false, nudge_sent_at: null },
  // Siyanda — Eco — not started
  { id: "e8",  driver_id: "d8", course_id: "c2", status: "enrolled",     progress_modules: 0, link_activated: false, certified: false, nudge_sent_at: null },
  // Ayanda — Eco — in progress
  { id: "e9",  driver_id: "d9", course_id: "c2", status: "in-progress",  progress_modules: 2, link_activated: true,  certified: false, nudge_sent_at: null },
  // Lwazi — PTDP — certified
  { id: "e10", driver_id: "d10",course_id: "c1", status: "certified",    progress_modules: 8, link_activated: true,  certified: true,  nudge_sent_at: null },
];

export const DEMO_CAMPAIGNS = [
  {
    id: "camp1",
    name: "PTDP — Johannesburg & Pretoria Cohort",
    duration_days: 60,
    start_date: "2026-04-01",
    end_date: "2026-05-31",
    status: "active" as const,
    closed_at: null,
    refunded_credits: 0,
    created_at: "2026-03-28T08:00:00Z",
    stats: {
      total: 5,
      notStarted: 2,
      inProgress: 2,
      completed: 1,
      outstanding: [
        { id: "e4", status: "enrolled",    progress_percent: 0,  link_activated: false, nudge_sent_at: null, drivers: { id: "d4", first_name: "Bongani",  last_name: "Khumalo", mobile: "+27 82 111 0004" }, courses: { id: "c1", name: "Professional Truck Driver Programme" } },
        { id: "e5", status: "enrolled",    progress_percent: 0,  link_activated: false, nudge_sent_at: null, drivers: { id: "d5", first_name: "Andile",   last_name: "Nxumalo", mobile: "+27 82 111 0005" }, courses: { id: "c1", name: "Professional Truck Driver Programme" } },
        { id: "e3", status: "in-progress", progress_percent: 38, link_activated: true,  nudge_sent_at: null, drivers: { id: "d3", first_name: "Lungelo",  last_name: "Zulu",    mobile: "+27 82 111 0003" }, courses: { id: "c1", name: "Professional Truck Driver Programme" } },
      ],
      avgFeedback: { understanding: 4.2, enjoyment: 4.5, more_learning: 4.8, count: 3 },
    },
    daysRemaining: 12,
    daysElapsed: 48,
    progressPct: 80,
  },
  {
    id: "camp2",
    name: "Eco-Driver — KZN & Cape Town Cohort",
    duration_days: 45,
    start_date: "2026-04-15",
    end_date: "2026-05-30",
    status: "active" as const,
    closed_at: null,
    refunded_credits: 0,
    created_at: "2026-04-10T08:00:00Z",
    stats: {
      total: 4,
      notStarted: 1,
      inProgress: 2,
      completed: 1,
      outstanding: [
        { id: "e8", status: "enrolled",    progress_percent: 0,  link_activated: false, nudge_sent_at: null, drivers: { id: "d8", first_name: "Siyanda", last_name: "Ntuli",  mobile: "+27 82 111 0008" }, courses: { id: "c2", name: "Eco-Driver Training" } },
        { id: "e9", status: "in-progress", progress_percent: 33, link_activated: true,  nudge_sent_at: null, drivers: { id: "d9", first_name: "Ayanda", last_name: "Mkhize", mobile: "+27 82 111 0009" }, courses: { id: "c2", name: "Eco-Driver Training" } },
      ],
      avgFeedback: { understanding: 4.6, enjoyment: 4.7, more_learning: 4.9, count: 2 },
    },
    daysRemaining: 8,
    daysElapsed: 37,
    progressPct: 82,
  },
];

export const DEMO_QUOTE = {
  id: "q1",
  reference: "GFA-2026-0042",
  total: 8550.00,
  status: "deployed",
  created_at: "2026-03-28T08:30:00Z",
  paid_at: "2026-03-29T10:15:00Z",
  deployed_at: "2026-03-29T10:20:00Z",
  line_items: [
    { driverName: "Thabo Dlamini",   courseName: "Professional Truck Driver Programme", price: 855 },
    { driverName: "Sipho Mokoena",   courseName: "Professional Truck Driver Programme", price: 855 },
    { driverName: "Lungelo Zulu",    courseName: "Professional Truck Driver Programme", price: 855 },
    { driverName: "Bongani Khumalo", courseName: "Professional Truck Driver Programme", price: 855 },
    { driverName: "Andile Nxumalo",  courseName: "Professional Truck Driver Programme", price: 855 },
    { driverName: "Nhlanhla Sithole",courseName: "Eco-Driver Training",                 price: 855 },
    { driverName: "Mandla Mthembu",  courseName: "Eco-Driver Training",                 price: 855 },
    { driverName: "Siyanda Ntuli",   courseName: "Eco-Driver Training",                 price: 855 },
    { driverName: "Ayanda Mkhize",   courseName: "Eco-Driver Training",                 price: 855 },
    { driverName: "Lwazi Hadebe",    courseName: "Professional Truck Driver Programme", price: 855 },
  ],
};

export const DEMO_BULLETINS = [
  {
    id: "b1",
    title: "Tyre Blowout at High Speed — Corrective Action Required",
    category: "safety",
    date_observed: "2026-05-14",
    urgency: "urgent",
    confidential: true,
    description: "On 14 May 2026, unit HF-024 experienced a rear left tyre blowout at approximately 110 km/h on the N3 between Johannesburg and Durban. The driver maintained control and brought the vehicle to a safe stop on the hard shoulder. Investigation revealed the tyre had been running 18% below the recommended inflation pressure for an estimated 3 days prior to the incident.",
    why_it_matters: "An under-inflated tyre at highway speed generates excessive heat, dramatically increasing the risk of a catastrophic blowout. At 110 km/h, a blowout can cause the driver to lose control, resulting in a rollover or collision with other road users.",
    mitigation_message: "All drivers must conduct a full pre-departure inspection including tyre pressure checks using the calibrated gauge in the cab. Any tyre reading more than 10% below the recommended pressure must be reported to the fleet controller before departure.",
    driver_action: "Check all 18 tyre pressures before every departure using the cab gauge. Record readings on the pre-trip inspection sheet. Do not depart if any tyre is more than 10% below the recommended pressure.",
    status: "published",
    audience_type: "all",
    submitted_at: "2026-05-15T07:30:00Z",
    waive_fee: false,
  },
  {
    id: "b2",
    title: "Fuel Efficiency Drop — Eco-Driving Reminder",
    category: "operational",
    date_observed: "2026-05-01",
    urgency: "standard",
    confidential: false,
    description: "Fleet telematics data for April 2026 shows an average fuel consumption of 42 litres per 100 km across the Gauteng fleet, representing a 7% increase compared to the Q1 average of 39.2 litres per 100 km. Analysis of driving data identifies excessive engine braking, high idle time, and aggressive acceleration as the primary contributors.",
    why_it_matters: "A 7% increase in fuel consumption across a 48-truck fleet operating 15,000 km per month translates to an additional R126,000 in fuel costs per month at current diesel prices. Eco-driving practices directly protect the company's profitability and each driver's performance record.",
    mitigation_message: "The GFA Eco-Driver programme covers all the techniques needed to reverse this trend. Drivers who have completed the programme should revisit Module 3 (Momentum Management) and Module 5 (Idle Reduction) as a refresher.",
    driver_action: "Anticipate traffic flow and use engine momentum rather than braking where safe. Limit idle time to 3 minutes maximum. Maintain a following distance that allows smooth deceleration without hard braking.",
    status: "published",
    audience_type: "all",
    submitted_at: "2026-05-02T09:00:00Z",
    waive_fee: true,
  },
];

export const DEMO_REPORTS = {
  summary: {
    total_drivers: 10,
    activated: 8,
    in_progress: 4,
    certified: 3,
    completion_rate: 30,
    avg_progress_pct: 62,
  },
  by_programme: [
    { programme: "Professional Truck Driver Programme", enrolled: 6, certified: 3, in_progress: 2, not_started: 1 },
    { programme: "Eco-Driver Training",                 enrolled: 4, certified: 1, in_progress: 2, not_started: 1 },
  ],
  by_branch: [
    { branch: "Johannesburg", enrolled: 3, certified: 1, avg_progress: 67 },
    { branch: "Pretoria",     enrolled: 3, certified: 1, avg_progress: 44 },
    { branch: "Durban",       enrolled: 3, certified: 1, avg_progress: 58 },
    { branch: "Cape Town",    enrolled: 1, certified: 1, avg_progress: 100 },
  ],
  feedback: {
    understanding: 4.4,
    enjoyment: 4.6,
    more_learning: 4.85,
    count: 5,
  },
};
