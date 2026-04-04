export const GENDER_OPTIONS = [
  { value: "male", label: "Nam" },
  { value: "female", label: "Nữ" },
] as const;

export type Gender = (typeof GENDER_OPTIONS)[number]["value"];

type CampaignConcept = {
  id: string;
  sourceDirectory: string;
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
    sourceDirectory: "classic",
    label: "Classic - Quý phái",
    enabled: true,
    kicker: "Quý phái",
    description:
      "Tinh thần thanh lịch, chỉn chu và sang trọng cho visual mang cảm giác quý phái.",
    image: "/concepts/bar.svg",
    posterTitle: "CLASSIC QUY PHAI",
    accentColor: "#D89A16",
    backgroundColor: "#FBF4E3",
    panelColor: "#F8E6B9",
  },
  {
    id: "rooftop",
    sourceDirectory: "Passion",
    label: "Passion - Trẻ trung",
    enabled: true,
    kicker: "Trẻ trung",
    description:
      "Năng lượng tươi mới, nổi bật và hiện đại để tạo cảm giác trẻ trung, cuốn hút.",
    image: "/concepts/rooftop.svg",
    posterTitle: "PASSION TRE TRUNG",
    accentColor: "#E2AC2A",
    backgroundColor: "#FCF6E8",
    panelColor: "#F6E2A8",
  },
  {
    id: "home-kitchen",
    sourceDirectory: "Secret",
    label: "Secret - Quyến rũ",
    enabled: true,
    kicker: "Quyến rũ",
    description:
      "Bối cảnh giàu cảm xúc với điểm nhấn mềm mại, bí ẩn và gợi cảm giác quyến rũ.",
    image: "/concepts/home-kitchen.svg",
    posterTitle: "SECRET QUYEN RU",
    accentColor: "#C68D14",
    backgroundColor: "#FAF1DD",
    panelColor: "#F3D793",
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
