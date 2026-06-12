export const EMERGENCY_PUBLIC_SLUG = "milo-shea";

export type EmergencyContact = {
  id: string;
  name: string;
  relation: string;
  phone: string;
  email: string;
  priority: number;
  hasKey: boolean;
  notes?: string;
};

export type PetProfile = {
  id: string;
  name: string;
  species: string;
  breed: string;
  age: string;
  weight: string;
  microchip: string;
  photoEmoji: string;
  temperament: string;
  allergies: string[];
};

export type VetInfo = {
  clinic: string;
  phone: string;
  address: string;
  hours: string;
};

export type CarePlan = {
  feeding: string;
  medications: string;
  exercise: string;
  litterOrPotty: string;
  triggers: string;
  comfort: string;
};

export const mockPet: PetProfile = {
  id: "pet-1",
  name: "Milo",
  species: "Cat",
  breed: "Domestic shorthair",
  age: "7 years",
  weight: "11 lbs",
  microchip: "982 000 123 456 789",
  photoEmoji: "🐱",
  temperament: "Shy with strangers; gentle once settled. Hides under the bed when stressed.",
  allergies: ["Chicken-based kibble (digestive upset)"],
};

export const mockVet: VetInfo = {
  clinic: "Riverside Animal Hospital",
  phone: "(555) 010-4420",
  address: "1200 Grove St, Portland, OR",
  hours: "Mon–Sat 8a–6p; urgent line after hours",
};

export const mockContacts: EmergencyContact[] = [
  {
    id: "c1",
    name: "Jordan Lee",
    relation: "Sister · primary",
    phone: "(555) 010-2211",
    email: "jordan.lee@example.com",
    priority: 1,
    hasKey: true,
    notes: "Has spare key; knows feeding routine.",
  },
  {
    id: "c2",
    name: "Alex Rivera",
    relation: "Neighbor · backup",
    phone: "(555) 010-8899",
    email: "alex.r@example.com",
    priority: 2,
    hasKey: false,
    notes: "Can pet-sit short notice; no building key.",
  },
  {
    id: "c3",
    name: "Riverside Animal Hospital",
    relation: "Veterinary",
    phone: mockVet.phone,
    email: "care@riverside-vet.example.com",
    priority: 3,
    hasKey: false,
  },
];

export const mockCarePlan: CarePlan = {
  feeding: "½ cup Hill’s Sensitive Stomach dry, morning and evening. Fresh water daily; fountain cleaned Sundays.",
  medications: "None daily. Gabapentin 100mg only before vet visits (in carrier kit).",
  exercise: "Two 10-minute play sessions with wand toy; window perch time mid-day.",
  litterOrPotty: "Scoop twice daily; full change every 10 days. Litter: unscented clumping, box in hall closet.",
  triggers: "Loud knocking, vacuum, unfamiliar dogs. Keep TV low if responders are home.",
  comfort: "Favorite blanket on couch; chin scratches help him relax. Safe room: primary bedroom.",
};

export const mockOwner = {
  displayName: "Sam Shea",
  homeAddress: "42 Cedar Lane, Apt 3B, Portland, OR",
};

export const mockEscalationSteps = [
  {
    id: "s0",
    label: "Check-in window",
    detail: "You set a gentle reminder every 36 hours. No stress if life gets busy—we only escalate if we truly cannot reach you.",
    tone: "calm" as const,
  },
  {
    id: "s1",
    label: "Soft nudge (in-app)",
    detail: "A calm notification asks you to tap “I’m okay” when you can.",
    tone: "calm" as const,
  },
  {
    id: "s2",
    label: "Backup contacts notified",
    detail: "Jordan, then Alex, receive a pre-written message you approved—asking them to check on Milo, not on you.",
    tone: "care" as const,
  },
  {
    id: "s3",
    label: "Vet card on file",
    detail: "If care is urgent, your vet’s number is included so responders can coordinate quickly.",
    tone: "care" as const,
  },
];
