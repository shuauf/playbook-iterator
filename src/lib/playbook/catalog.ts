import type { TypicalStage } from "@/lib/playbook/types"

export type CanonicalPlay = {
  id: string
  name: string
  typicalStage: TypicalStage
  purpose: string
  prerequisites: Array<{
    id: string
    text: string
    intent: "required" | "recommended"
  }>
}

export const CANONICAL_PLAYS: CanonicalPlay[] = [
  {
    id: "discovery",
    name: "Discovery",
    typicalStage: "Qualify",
    purpose:
      "Establish the business problem, stakeholders, and whether SE involvement is justified.",
    prerequisites: [
      {
        id: "d-aligned",
        text: "AE and SE have aligned on the meeting objective",
        intent: "required",
      },
    ],
  },
  {
    id: "product-demo",
    name: "Product Demo",
    typicalStage: "Evaluate",
    purpose:
      "A working-product walkthrough for a known business problem and a named audience.",
    prerequisites: [
      {
        id: "pd-direct-discovery",
        text: "The SE has completed direct discovery",
        intent: "required",
      },
      {
        id: "pd-business-problem",
        text: "The business problem is understood",
        intent: "required",
      },
      {
        id: "pd-champion",
        text: "A champion or accountable stakeholder is involved",
        intent: "recommended",
      },
    ],
  },
  {
    id: "custom-demo",
    name: "Custom Demo",
    typicalStage: "Evaluate",
    purpose:
      "A tailored demonstration against a specific environment or dataset. Expensive.",
    prerequisites: [
      {
        id: "cd-env",
        text: "The unique environment or dataset is prepared",
        intent: "required",
      },
    ],
  },
  {
    id: "architecture-deep-dive",
    name: "Architecture Deep Dive",
    typicalStage: "Validate",
    purpose:
      "A technical design conversation with the people who will own risk and integration.",
    prerequisites: [
      {
        id: "ad-risks",
        text: "Technical risks have been identified",
        intent: "recommended",
      },
    ],
  },
  {
    id: "proof-of-concept",
    name: "Proof of Concept",
    typicalStage: "Prove",
    purpose:
      "A time-boxed evaluation against agreed success criteria. Occurs late by design.",
    prerequisites: [
      {
        id: "poc-criteria",
        text: "The customer has agreed to success criteria",
        intent: "required",
      },
    ],
  },
]
