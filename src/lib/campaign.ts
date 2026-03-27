export const GENDER_OPTIONS = [
  { value: "male", label: "Nam" },
  { value: "female", label: "Nữ" },
] as const;

export type Gender = (typeof GENDER_OPTIONS)[number]["value"];

type CampaignConcept = {
  id: string;
  label: string;
  enabled: boolean;
  kicker: string;
  description: string;
  image: string;
  posterTitle: string;
  accentColor: string;
  backgroundColor: string;
  panelColor: string;
};

export const CAMPAIGN_CONCEPTS = [
  {
    id: "bar",
    label: "Bar",
    enabled: true,
    kicker: "Night mood",
    description:
      "Không khí nightlife đậm chất thành thị, phù hợp visual mạnh và nổi bật.",
    image: "/concepts/bar.svg",
    posterTitle: "BAR DEM NOI BAT",
    accentColor: "#A4121F",
    backgroundColor: "#F7ECE6",
    panelColor: "#FFD8CF",
  },
  {
    id: "rooftop",
    label: "Rooftop",
    enabled: true,
    kicker: "City lights",
    description:
      "Khung cảnh trên cao, thoáng, hiện đại và phù hợp các chiến dịch trẻ.",
    image: "/concepts/rooftop.svg",
    posterTitle: "ROOFTOP CITYLIGHT",
    accentColor: "#7F1720",
    backgroundColor: "#F4ECE7",
    panelColor: "#F4D7D1",
  },
  {
    id: "home-kitchen",
    label: "Bếp nhà",
    enabled: true,
    kicker: "Warm kitchen",
    description:
      "Ấm áp, gần gũi và mang cảm giác bữa ăn gia đình dễ chạm tới khách hàng.",
    image: "/concepts/home-kitchen.svg",
    posterTitle: "BEP NHA AM VI",
    accentColor: "#B61F2A",
    backgroundColor: "#F8EDE8",
    panelColor: "#FFE1D4",
  },
] as const satisfies readonly CampaignConcept[];

export type CampaignConceptId = (typeof CAMPAIGN_CONCEPTS)[number]["id"];

export const DEFAULT_CAMPAIGN_CONCEPT_ID =
  CAMPAIGN_CONCEPTS.find((concept) => concept.enabled)?.id ??
  CAMPAIGN_CONCEPTS[0].id;

export function getConceptById(conceptId: CampaignConceptId) {
  return (
    CAMPAIGN_CONCEPTS.find((concept) => concept.id === conceptId) ??
    CAMPAIGN_CONCEPTS[0]
  );
}

export function isCampaignConceptId(value: string): value is CampaignConceptId {
  return CAMPAIGN_CONCEPTS.some((concept) => concept.id === value);
}

export function isCampaignConceptEnabled(conceptId: CampaignConceptId) {
  return getConceptById(conceptId).enabled;
}
