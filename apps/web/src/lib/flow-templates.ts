/**
 * Starter flow templates — complete, contract-valid `FlowConfig` graphs that
 * seed a new flow agent with a proven conversation structure.
 *
 * Each template obeys the same rules `validateFlowGraph` enforces: exactly one
 * `initial` node, at least one `end` node, every non-end node has an outgoing
 * transition, and every transition targets a real node. Copy is deliberately
 * generic so a template drops cleanly into any business domain — swap the
 * custom-variable defaults and prompt wording to taste.
 */

import type { FlowConfig } from "@/lib/flow-contract";

export type FlowTemplateCategory = "support" | "sales" | "booking" | "survey";

export interface FlowTemplate {
  id: string;
  name: string;
  description: string;
  nodeCount: number;
  category: FlowTemplateCategory;
  config: FlowConfig;
}

// ── Customer support router (6 nodes) ────────────────────────────────────────

const customerSupport: FlowTemplate = {
  id: "customer-support-router",
  name: "Customer support",
  description:
    "Greets the caller, routes them by intent to billing, technical, or general help, then wraps up.",
  nodeCount: 6,
  category: "support",
  config: {
    meta: {
      name: "Customer support",
      version: "1.0.0",
      description: "Intent-routed support line",
    },
    globalRoleMessages: [
      {
        role: "system",
        content:
          "You are a warm, efficient support assistant for {{companyName}}. Keep replies short and conversational, confirm the caller's intent before acting, and never invent account details.",
      },
    ],
    globalContextStrategy: "append",
    customVariables: [
      { name: "companyName", defaultValue: "the company", description: "Business name" },
      { name: "supportHours", defaultValue: "9am to 6pm on weekdays", description: "Support availability" },
    ],
    globalCallSettings: {
      maxCallDurationSecs: 300,
      inactivityTimeoutSecs: 30,
      goodbyeMessage: "Thanks for calling. Have a great day!",
    },
    nodes: [
      {
        id: "start",
        type: "initial",
        position: { x: 40, y: 260 },
        data: {
          label: "Greeting",
          taskMessages: [
            {
              role: "system",
              content:
                "Greet the caller, introduce yourself as the assistant for {{companyName}}, and ask what they need help with today.",
            },
          ],
          respondImmediately: true,
          firstMessage: "Hi, thanks for calling {{companyName}}. How can I help you today?",
          functions: [
            {
              name: "route_billing",
              description: "The caller has a billing, payment, or invoice question.",
              handlerType: "transition",
              targetNode: "billing",
            },
            {
              name: "route_technical",
              description: "The caller is reporting a technical problem or outage.",
              handlerType: "transition",
              targetNode: "technical",
            },
            {
              name: "route_general",
              description: "The caller has a general question that isn't billing or technical.",
              handlerType: "transition",
              targetNode: "general",
            },
          ],
        },
      },
      {
        id: "billing",
        type: "node",
        position: { x: 420, y: 80 },
        data: {
          label: "Billing help",
          taskMessages: [
            {
              role: "system",
              content:
                "Help the caller with their billing question. Confirm the account they're asking about, answer clearly, and let them know when the issue is resolved.",
            },
          ],
          functions: [
            {
              name: "billing_resolved",
              description: "The caller's billing question has been fully answered.",
              handlerType: "transition",
              targetNode: "wrap_up",
              properties: {
                topic: { type: "string", description: "Short summary of the billing request" },
              },
            },
          ],
        },
      },
      {
        id: "technical",
        type: "node",
        position: { x: 420, y: 260 },
        data: {
          label: "Technical help",
          taskMessages: [
            {
              role: "system",
              content:
                "Troubleshoot the caller's technical issue. Ask one clarifying question at a time, suggest the most likely fix, and confirm whether it worked.",
            },
          ],
          functions: [
            {
              name: "issue_resolved",
              description: "The technical issue is resolved or a clear next step is agreed.",
              handlerType: "transition",
              targetNode: "wrap_up",
              properties: {
                issue: { type: "string", description: "Short summary of the reported issue" },
              },
            },
          ],
        },
      },
      {
        id: "general",
        type: "node",
        position: { x: 420, y: 440 },
        data: {
          label: "General help",
          taskMessages: [
            {
              role: "system",
              content:
                "Answer the caller's general question. If it's out of scope, let them know support is available {{supportHours}} and offer to note the request.",
            },
          ],
          functions: [
            {
              name: "question_answered",
              description: "The caller's general question has been addressed.",
              handlerType: "transition",
              targetNode: "wrap_up",
            },
          ],
        },
      },
      {
        id: "wrap_up",
        type: "node",
        position: { x: 800, y: 260 },
        data: {
          label: "Anything else",
          taskMessages: [
            {
              role: "system",
              content:
                "Ask whether there's anything else you can help with. If yes, route back to the greeting; otherwise close the call politely.",
            },
          ],
          functions: [
            {
              name: "more_help",
              description: "The caller has another, unrelated request.",
              handlerType: "transition",
              targetNode: "start",
            },
            {
              name: "all_done",
              description: "The caller is finished and ready to hang up.",
              handlerType: "end_conversation",
            },
          ],
        },
      },
      {
        id: "end_call",
        type: "end",
        position: { x: 1180, y: 260 },
        data: {
          label: "End call",
          taskMessages: [{ role: "system", content: "Thank the caller and end the conversation." }],
          functions: [],
        },
      },
    ],
  },
};

// ── Lead qualification (5 nodes) ─────────────────────────────────────────────

const leadQualification: FlowTemplate = {
  id: "lead-qualification",
  name: "Lead qualification",
  description:
    "Qualifies an inbound lead against simple criteria, then books a follow-up or politely bows out.",
  nodeCount: 5,
  category: "sales",
  config: {
    meta: {
      name: "Lead qualification",
      version: "1.0.0",
      description: "Qualify and route inbound interest",
    },
    globalRoleMessages: [
      {
        role: "system",
        content:
          "You are an upbeat but honest sales assistant for {{companyName}}. Ask qualifying questions naturally, never pressure the caller, and be transparent about fit.",
      },
    ],
    globalContextStrategy: "append",
    customVariables: [
      { name: "companyName", defaultValue: "the company", description: "Business name" },
      { name: "productName", defaultValue: "our product", description: "Product or service on offer" },
    ],
    globalCallSettings: {
      maxCallDurationSecs: 300,
      inactivityTimeoutSecs: 30,
      goodbyeMessage: "Thanks for your time. Take care!",
    },
    nodes: [
      {
        id: "start",
        type: "initial",
        position: { x: 40, y: 220 },
        data: {
          label: "Intro",
          taskMessages: [
            {
              role: "system",
              content:
                "Greet the caller, thank them for their interest in {{productName}}, and ask what prompted them to reach out.",
            },
          ],
          respondImmediately: true,
          firstMessage: "Hi! Thanks for your interest in {{productName}}. What can I tell you about it?",
          functions: [
            {
              name: "begin_qualifying",
              description: "The caller has shared their interest and is ready for a few questions.",
              handlerType: "transition",
              targetNode: "qualify",
            },
          ],
        },
      },
      {
        id: "qualify",
        type: "node",
        position: { x: 420, y: 220 },
        data: {
          label: "Qualify",
          taskMessages: [
            {
              role: "system",
              content:
                "Ask about the caller's use case, team size, and timeline. Capture their answers, then decide whether they're a good fit for {{productName}}.",
            },
          ],
          functions: [
            {
              name: "qualified",
              description: "The caller is a good fit and wants to move forward.",
              handlerType: "transition",
              targetNode: "book_followup",
              properties: {
                use_case: { type: "string", description: "What the caller wants to solve" },
                timeline: { type: "string", description: "When they want to start" },
              },
              required: ["use_case"],
            },
            {
              name: "not_a_fit",
              description: "The caller isn't a fit right now or isn't interested in continuing.",
              handlerType: "transition",
              targetNode: "polite_close",
            },
          ],
        },
      },
      {
        id: "book_followup",
        type: "node",
        position: { x: 800, y: 100 },
        data: {
          label: "Book follow-up",
          taskMessages: [
            {
              role: "system",
              content:
                "Offer to schedule a follow-up with a specialist. Collect a good day and time and the caller's preferred contact method, then confirm the details.",
            },
          ],
          functions: [
            {
              name: "followup_booked",
              description: "A follow-up time and contact method are confirmed.",
              handlerType: "end_conversation",
            },
          ],
        },
      },
      {
        id: "polite_close",
        type: "node",
        position: { x: 800, y: 340 },
        data: {
          label: "Polite close",
          taskMessages: [
            {
              role: "system",
              content:
                "Thank the caller for their time, let them know they're welcome to reach back out anytime, and wrap up warmly.",
            },
          ],
          functions: [
            {
              name: "closed",
              description: "The caller has acknowledged and is ready to end.",
              handlerType: "end_conversation",
            },
          ],
        },
      },
      {
        id: "end_call",
        type: "end",
        position: { x: 1180, y: 220 },
        data: {
          label: "End call",
          taskMessages: [{ role: "system", content: "End the conversation politely." }],
          functions: [],
        },
      },
    ],
  },
};

// ── Appointment booking (5 nodes) ────────────────────────────────────────────

const appointmentBooking: FlowTemplate = {
  id: "appointment-booking",
  name: "Appointment booking",
  description:
    "Collects the caller's details, offers time slots, confirms the booking, and closes the call.",
  nodeCount: 5,
  category: "booking",
  config: {
    meta: {
      name: "Appointment booking",
      version: "1.0.0",
      description: "Book a time slot end to end",
    },
    globalRoleMessages: [
      {
        role: "system",
        content:
          "You are a friendly booking assistant for {{businessName}}. Be concise, always read back details before confirming, and only offer times within {{operatingHours}}.",
      },
    ],
    globalContextStrategy: "append",
    customVariables: [
      { name: "businessName", defaultValue: "the business", description: "Business name" },
      { name: "operatingHours", defaultValue: "9am to 5pm on weekdays", description: "Bookable hours" },
    ],
    globalCallSettings: {
      maxCallDurationSecs: 300,
      inactivityTimeoutSecs: 30,
      goodbyeMessage: "You're all set. See you soon!",
    },
    nodes: [
      {
        id: "start",
        type: "initial",
        position: { x: 40, y: 200 },
        data: {
          label: "Greeting",
          taskMessages: [
            {
              role: "system",
              content:
                "Greet the caller, introduce yourself as the booking assistant for {{businessName}}, and ask what they'd like to book.",
            },
          ],
          respondImmediately: true,
          firstMessage: "Hi, thanks for calling {{businessName}}. I can help you book a time — what are you after?",
          functions: [
            {
              name: "collect_details",
              description: "The caller has said what they want to book.",
              handlerType: "transition",
              targetNode: "details",
            },
          ],
        },
      },
      {
        id: "details",
        type: "node",
        position: { x: 420, y: 200 },
        data: {
          label: "Collect details",
          taskMessages: [
            {
              role: "system",
              content:
                "Collect the caller's name and a contact number, and confirm the service they'd like. Read the details back before continuing.",
            },
          ],
          functions: [
            {
              name: "details_collected",
              description: "The caller's name, number, and requested service are confirmed.",
              handlerType: "transition",
              targetNode: "offer_slot",
              properties: {
                full_name: { type: "string", description: "Caller's name" },
                phone: { type: "string", description: "Contact number" },
                service: { type: "string", description: "Requested service" },
              },
              required: ["full_name", "service"],
            },
          ],
        },
      },
      {
        id: "offer_slot",
        type: "node",
        position: { x: 800, y: 200 },
        data: {
          label: "Offer times",
          taskMessages: [
            {
              role: "system",
              content:
                "Ask for the caller's preferred day and time within {{operatingHours}}. Offer two or three concrete options and let them pick one.",
            },
          ],
          functions: [
            {
              name: "slot_selected",
              description: "The caller has chosen a specific day and time.",
              handlerType: "transition",
              targetNode: "confirm",
              properties: {
                date: { type: "string", description: "Chosen date" },
                time: { type: "string", description: "Chosen time" },
              },
              required: ["date", "time"],
            },
          ],
        },
      },
      {
        id: "confirm",
        type: "node",
        position: { x: 1180, y: 200 },
        data: {
          label: "Confirm booking",
          taskMessages: [
            {
              role: "system",
              content:
                "Read back the full booking — name, service, date, and time — and ask the caller to confirm. If they want a change, send them back to pick another time.",
            },
          ],
          functions: [
            {
              name: "booking_confirmed",
              description: "The caller confirmed all booking details are correct.",
              handlerType: "end_conversation",
            },
            {
              name: "change_time",
              description: "The caller wants a different day or time.",
              handlerType: "transition",
              targetNode: "offer_slot",
            },
          ],
        },
      },
      {
        id: "end_call",
        type: "end",
        position: { x: 1560, y: 200 },
        data: {
          label: "End call",
          taskMessages: [{ role: "system", content: "Confirm the booking is set and end the call." }],
          functions: [],
        },
      },
    ],
  },
};

// ── Feedback survey (4 nodes) ────────────────────────────────────────────────

const feedbackSurvey: FlowTemplate = {
  id: "feedback-survey",
  name: "Feedback survey",
  description:
    "Runs a short satisfaction survey: a rating, an open comment, then a thank-you close.",
  nodeCount: 4,
  category: "survey",
  config: {
    meta: {
      name: "Feedback survey",
      version: "1.0.0",
      description: "Short post-interaction survey",
    },
    globalRoleMessages: [
      {
        role: "system",
        content:
          "You are a courteous survey assistant for {{companyName}}. Keep it brief, never argue with feedback, and thank the caller for their time.",
      },
    ],
    globalContextStrategy: "append",
    customVariables: [
      { name: "companyName", defaultValue: "the company", description: "Business name" },
    ],
    globalCallSettings: {
      maxCallDurationSecs: 180,
      inactivityTimeoutSecs: 25,
      goodbyeMessage: "Thank you for your feedback. Goodbye!",
    },
    nodes: [
      {
        id: "start",
        type: "initial",
        position: { x: 40, y: 180 },
        data: {
          label: "Intro",
          taskMessages: [
            {
              role: "system",
              content:
                "Greet the caller, explain this is a quick survey about their recent experience with {{companyName}}, and ask if now is a good time.",
            },
          ],
          respondImmediately: true,
          firstMessage: "Hi! I'd love to ask a couple of quick questions about your recent experience — is now a good time?",
          functions: [
            {
              name: "start_survey",
              description: "The caller agreed to take the survey.",
              handlerType: "transition",
              targetNode: "rating",
            },
            {
              name: "decline_survey",
              description: "The caller doesn't want to take the survey right now.",
              handlerType: "end_conversation",
            },
          ],
        },
      },
      {
        id: "rating",
        type: "node",
        position: { x: 420, y: 180 },
        data: {
          label: "Rating",
          taskMessages: [
            {
              role: "system",
              content:
                "Ask the caller to rate their experience from 1 to 5. Capture the number, then move on.",
            },
          ],
          functions: [
            {
              name: "rating_given",
              description: "The caller has given a numeric rating.",
              handlerType: "transition",
              targetNode: "comments",
              properties: {
                score: { type: "integer", description: "Rating from 1 to 5" },
              },
              required: ["score"],
            },
          ],
        },
      },
      {
        id: "comments",
        type: "node",
        position: { x: 800, y: 180 },
        data: {
          label: "Open comment",
          taskMessages: [
            {
              role: "system",
              content:
                "Ask what would have made the experience better, or what they liked most. Capture the comment, acknowledge it, and wrap up.",
            },
          ],
          functions: [
            {
              name: "comment_captured",
              description: "The caller has shared their comment (or declined to add one).",
              handlerType: "end_conversation",
              properties: {
                comment: { type: "string", description: "Open-ended feedback" },
              },
            },
          ],
        },
      },
      {
        id: "end_call",
        type: "end",
        position: { x: 1180, y: 180 },
        data: {
          label: "End call",
          taskMessages: [{ role: "system", content: "Thank the caller and end the survey." }],
          functions: [],
        },
      },
    ],
  },
};

// ── Registry ─────────────────────────────────────────────────────────────────

export const FLOW_TEMPLATES: FlowTemplate[] = [
  customerSupport,
  leadQualification,
  appointmentBooking,
  feedbackSurvey,
];

/** Look up a template by id. */
export function getFlowTemplate(id: string): FlowTemplate | undefined {
  return FLOW_TEMPLATES.find((t) => t.id === id);
}

/**
 * Deep-clone a template's config so the editor can mutate it freely without
 * corrupting the shared registry object.
 */
export function instantiateTemplate(id: string): FlowConfig | undefined {
  const tpl = getFlowTemplate(id);
  return tpl ? (structuredClone(tpl.config) as FlowConfig) : undefined;
}
