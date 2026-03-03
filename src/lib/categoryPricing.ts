export interface CategoryPrice {
  category: string;
  description: string;
  lowRange: number;
  highRange: number;
  typical: number;
}

export const CATEGORY_PRICING: CategoryPrice[] = [
  {
    category: "CRM Setup & Configuration",
    description: "Basic HubSpot CRM setup, properties, pipelines, and user configuration",
    lowRange: 500,
    highRange: 5000,
    typical: 2000,
  },
  {
    category: "Marketing Hub Implementation",
    description: "Email marketing, lead nurturing workflows, forms, and landing pages",
    lowRange: 1500,
    highRange: 15000,
    typical: 5000,
  },
  {
    category: "Sales Hub Implementation",
    description: "Sales pipelines, sequences, playbooks, and reporting setup",
    lowRange: 1000,
    highRange: 12000,
    typical: 4000,
  },
  {
    category: "Service Hub Implementation",
    description: "Ticketing, knowledge base, feedback surveys, and customer portal",
    lowRange: 1500,
    highRange: 12000,
    typical: 4500,
  },
  {
    category: "CMS Hub / Website",
    description: "Website development, templates, themes, and content migration",
    lowRange: 2000,
    highRange: 25000,
    typical: 8000,
  },
  {
    category: "Integration",
    description: "Third-party integrations, API development, data syncing",
    lowRange: 1000,
    highRange: 20000,
    typical: 5000,
  },
  {
    category: "Data Migration",
    description: "CRM data import, mapping, cleansing, and validation from other platforms",
    lowRange: 1000,
    highRange: 15000,
    typical: 4000,
  },
  {
    category: "RevOps / Strategy",
    description: "Revenue operations consulting, process optimization, reporting architecture",
    lowRange: 2000,
    highRange: 20000,
    typical: 7000,
  },
  {
    category: "Training & Onboarding",
    description: "User training, documentation, and adoption support",
    lowRange: 500,
    highRange: 5000,
    typical: 1500,
  },
  {
    category: "Audit & Optimization",
    description: "Portal audit, performance review, and optimization recommendations",
    lowRange: 500,
    highRange: 8000,
    typical: 2500,
  },
];

export function detectCategories(text: string): CategoryPrice[] {
  const lower = text.toLowerCase();
  const matched: CategoryPrice[] = [];

  const patterns: [string[], string][] = [
    [["crm setup", "crm config", "hubspot setup", "portal setup", "crm implementation"], "CRM Setup & Configuration"],
    [["marketing hub", "email marketing", "lead nurture", "landing page", "marketing automation", "email campaign"], "Marketing Hub Implementation"],
    [["sales hub", "sales pipeline", "sales process", "sequences", "playbook", "deal pipeline"], "Sales Hub Implementation"],
    [["service hub", "ticketing", "knowledge base", "customer portal", "help desk", "support ticket"], "Service Hub Implementation"],
    [["cms hub", "website", "web design", "web development", "theme", "template design"], "CMS Hub / Website"],
    [["integrat", "salesforce", "api", "zapier", "middleware", "sync", "connect"], "Integration"],
    [["migrat", "data import", "data transfer", "data move", "switch from", "transition from"], "Data Migration"],
    [["revops", "revenue operations", "strategy", "consulting", "process optim", "reporting architect"], "RevOps / Strategy"],
    [["training", "onboarding", "adoption", "coaching", "user training", "documentation"], "Training & Onboarding"],
    [["audit", "review", "optimization", "health check", "portal review", "assessment"], "Audit & Optimization"],
  ];

  for (const [keywords, categoryName] of patterns) {
    if (keywords.some((kw) => lower.includes(kw))) {
      const cat = CATEGORY_PRICING.find((c) => c.category === categoryName);
      if (cat) matched.push(cat);
    }
  }

  return matched;
}
