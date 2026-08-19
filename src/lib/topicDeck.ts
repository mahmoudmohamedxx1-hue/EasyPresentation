/* ------------------------------------------------------------------ */
/*  Generate an outline straight from a topic — Gamma's "Generate"     */
/*  flow. Rich canned structures for common requests, a strong         */
/*  generic skeleton for everything else. Fully editable afterwards.   */
/* ------------------------------------------------------------------ */

import { Deck, SlideData, Stat, uid } from "./types";

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

interface SectionSpec {
  title: string;
  bullets: string[];
  layout?: SlideData["layout"];
  stats?: Stat[];
  quote?: { text: string; attribution: string };
}

function slide(partial: {
  layout: SlideData["layout"];
  title: string;
  bullets?: string[];
  subtitle?: string;
  stats?: Stat[];
  quote?: { text: string; attribution: string };
}): SlideData {
  return {
    id: uid(),
    slide_number: 0,
    bullets: partial.bullets ?? [],
    notes: "",
    layout: partial.layout,
    title: partial.title,
    subtitle: partial.subtitle,
    stats: partial.stats,
    quote: partial.quote,
  };
}

function spec(title: string, bullets: string[]): SectionSpec {
  return { title, bullets };
}

/* ------------------------- rich canned topics ------------------------- */

function pitchSections(): SectionSpec[] {
  return [
    spec("The problem", [
      "Describe the pain in one sentence your audience has felt",
      "Show who suffers today and how often",
      "Quantify the cost of doing nothing",
    ]),
    {
      title: "Why now",
      bullets: [
        "Name the shift that makes this solvable today",
        "Point to the trend line, not the anecdote",
      ],
    },
    spec("Our solution", [
      "One line: what it does and for whom",
      "Walk the before → after in three steps",
      "Make the magic concrete with one demo moment",
    ]),
    {
      title: "Market size",
      bullets: ["Bottom-up: customers × price × frequency", "Show the beachhead you win first"],
      stats: [
        { value: "$42B", label: "total addressable market" },
        { value: "3.1x", label: "year-over-year growth" },
      ],
    },
    spec("Business model", [
      "How money flows in: pricing and packaging",
      "Unit economics: CAC, LTV, payback",
      "What compounds as you scale",
    ]),
    spec("Traction", [
      "Lead with the metric that grew fastest",
      "Name two logos or stories that prove pull",
      "Momentum: what changed in the last 90 days",
    ]),
    spec("The team", [
      "Why this team wins this market",
      "Relevant scars: what you've built before",
    ]),
    spec("The ask", [
      "Amount, terms, and what it buys",
      "The milestone this round reaches",
      "End with the vision sentence",
    ]),
  ];
}

function marketingSections(): SectionSpec[] {
  return [
    spec("Where we stand", [
      "Honest read: what worked last quarter",
      "The gap between promise and delivery",
    ]),
    spec("Goals and guardrails", [
      "One north-star metric for the quarter",
      "Supporting targets with owners and dates",
      "What we explicitly will not do",
    ]),
    spec("Who we're talking to", [
      "ICP in one paragraph, pains in three bullets",
      "The moment they realize they need us",
    ]),
    spec("Channels that earn attention", [
      "Double down on the top two performers",
      "One experiment channel with a kill date",
      "Message hierarchy: promise → proof → next step",
    ]),
    {
      title: "Budget split",
      bullets: ["Paid vs organic ratio and why", "Reserve for doubling down on winners"],
      stats: [
        { value: "60%", label: "proven channels" },
        { value: "25%", label: "scaling bets" },
        { value: "15%", label: "experiments" },
      ],
    },
    spec("90-day timeline", [
      "Weeks 1–4: foundation and creative",
      "Weeks 5–8: launch and learn",
      "Weeks 9–12: scale what works",
    ]),
    spec("How we'll know it worked", [
      "KPI tree from spend to revenue",
      "Review cadence and decision thresholds",
    ]),
  ];
}

function onboardingSections(org: string): SectionSpec[] {
  return [
    spec("Welcome aboard", [
      `What ${org} exists to do, in one sentence`,
      "How this team fits into that mission",
      "What your first month will feel like",
    ]),
    spec("People and how we work", [
      "Who to ask for what: the buddy map",
      "Meetings worth keeping, rituals worth protecting",
    ]),
    spec("Tools of the trade", [
      "The five tools you'll touch every day",
      "Where things live: docs, code, dashboards",
    ]),
    spec("Your first week", [
      "Day one: accounts, access, and a win",
      "Days 2–5: shadow two teammates",
      "End of week one: ship something small",
    ]),
    spec("30 / 60 / 90", [
      "30: learn the system and its edges",
      "60: own one outcome end to end",
      "90: teach something back to the team",
    ]),
    spec("Questions are a feature", [
      "Ask early, ask often, write it down",
      "Office hours and escalation paths",
    ]),
  ];
}

/* ------------------------- generic skeleton ------------------------- */

function genericSections(t: string): SectionSpec[] {
  return [
    spec(`Why ${t} matters`, [
      `Set the stakes: what changes if ${t} is understood well`,
      "Who this affects and how directly",
      "The cost of ignoring it today",
    ]),
    spec("The big picture", [
      `Define ${t} in one plain-language sentence`,
      "The two or three parts that make it tick",
      "A mental model worth keeping",
    ]),
    spec("How it works", [
      "Inputs, process, outputs — the whole loop",
      "Where most friction and errors appear",
      "The step people most often get wrong",
    ]),
    {
      title: "The numbers that matter",
      bullets: ["Swap in the figures from your source", "Lead with the most surprising one"],
      stats: [
        { value: "3×", label: "typical impact reported" },
        { value: "80/20", label: "where effort concentrates" },
      ],
    },
    spec("Real-world impact", [
      "One concrete case, told in three beats",
      "What succeeded, and what quietly failed",
    ]),
    spec("Pitfalls to avoid", [
      "The mistake everyone makes first",
      "How to spot trouble early",
      "The fix that costs the least",
    ]),
    spec("What comes next", [
      "The next 90 days, concretely",
      "One small win to start with tomorrow",
    ]),
  ];
}

function closingSection(): SectionSpec {
  return {
    title: "Key takeaways",
    bullets: [
      "Recap the three ideas worth keeping",
      "Restate the single call to action",
      "End on the line you want remembered",
    ],
  };
}

/* ------------------------------ public API ------------------------------ */

export function buildTopicDeck(topicRaw: string, count: number): Deck {
  const topic = topicRaw.trim();
  const t = topic.length > 40 ? topic.slice(0, 40) + "…" : topic;
  const lower = topic.toLowerCase();

  let sections: SectionSpec[];
  let title: string;
  if (/(pitch|startup|invest|funding|seed)/.test(lower)) {
    sections = pitchSections();
    title = `Pitch: ${t}`;
  } else if (/(marketing|campaign|growth plan|go-to-market|gtm)/.test(lower)) {
    sections = marketingSections();
    title = `Marketing plan — ${t}`;
  } else if (/(onboard|new hire|orientation|welcome)/.test(lower)) {
    sections = onboardingSections(topic.replace(/\bonboarding\b/i, "the team") || "the team");
    title = `Onboarding — ${t}`;
  } else {
    sections = genericSections(t);
    title = t.charAt(0).toUpperCase() + t.slice(1);
  }

  const want = clamp(count, 4, 12);
  let pool = [...sections];
  while (pool.length > want - 1 && pool.length > 2) pool = pool.slice(0, pool.length - 1);
  while (pool.length < want - 1) pool = [...pool, closingSection()].slice(0, want - 1);

  const slides: SlideData[] = [
    slide({
      layout: "title",
      title,
      subtitle: `A ${pool.length + 1}-card deck drafted by SlideForge — edit anything`,
    }),
    ...pool.map((s) =>
      slide({
        layout: s.layout ?? (s.stats ? "stats" : "bullets"),
        title: s.title,
        bullets: s.bullets,
        stats: s.stats,
        quote: s.quote,
      })
    ),
    slide({
      layout: "closing",
      title: closingSection().title,
      bullets: closingSection().bullets,
    }),
  ].slice(0, want + 1);

  return {
    title,
    themeId: "signal",
    slides: slides.map((s, i) => ({ ...s, slide_number: i + 1 })),
  };
}
