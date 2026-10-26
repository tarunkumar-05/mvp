import type { SampleRfq } from "./types";

/**
 * Mirrors backend/data/sample_rfqs.json so the simulation modal works without
 * exposing the backend filesystem to the browser bundle.
 */
export const SAMPLE_RFQS: SampleRfq[] = [
  {
    id: "rfq_01",
    sender: "purchase@buildcorp.in",
    subject: "Urgent quotation required - Site Phase 2",
    body: "Hi, Please quote for 250 meters 4 core 6 sqmm copper armoured cable polycab make, and 4 pieces schneider 32A 3 pole breaker. Need delivery by Friday.",
  },
  {
    id: "rfq_02",
    sender: "electricals@apexinfra.com",
    subject: "Requirement list for sub-station project",
    body: "Need urgent price for: 500m 4c 16sqmm cable copper armoured polycab, 2 nos 100A 4 pole mccb L&T make, and 10 nos 63A three pole mcb schneider. Site delivery required.",
  },
  {
    id: "rfq_03",
    sender: "contact@srivinayaka.co",
    subject: "Pricing inquiry",
    body: "Send quotation for 10 bundles 25mm heavy duty pvc conduit pipes and 100m 4 core 10sqmm copper cable.",
  },
];
