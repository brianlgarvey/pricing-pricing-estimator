import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Layers, Plug, Code2, Sparkles, Users, Info } from "lucide-react";

const DRIVERS = [
  {
    icon: Layers,
    title: "Number of HubSpot Hubs involved",
    description:
      "Projects spanning multiple Hubs (Marketing, Sales, Service, CMS, Operations) require more setup, configuration, and cross-Hub coordination than a single-Hub engagement.",
  },
  {
    icon: Plug,
    title: "Integrations with other systems",
    description:
      "Connecting HubSpot to a CRM, ERP, data warehouse, or other tools adds discovery, field mapping, and sync work that varies significantly by system and complexity.",
  },
  {
    icon: Code2,
    title: "Custom development",
    description:
      "Custom objects, modules, workflows, and reports built specifically for your business sit higher than out-of-the-box configuration.",
  },
  {
    icon: Sparkles,
    title: "Enterprise features",
    description:
      "Advanced capabilities like multi-touch attribution, account-based marketing, and predictive scoring need additional configuration and modeling.",
  },
  {
    icon: Users,
    title: "Team size, training, and enablement",
    description:
      "The number of users, depth of training, and ongoing enablement needs all influence the overall effort to deliver a successful rollout.",
  },
] as const;

export function PricingDrivers() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Info className="w-5 h-5 text-muted-foreground" />
          <div>
            <CardTitle className="text-lg">
              What drives pricing in projects like this
            </CardTitle>
            <CardDescription>
              Ranges are wide because every project's mix of these factors
              is different.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ul className="space-y-4">
          {DRIVERS.map(({ icon: Icon, title, description }) => (
            <li key={title} className="flex items-start gap-3">
              <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-secondary/60 flex items-center justify-center">
                <Icon className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">
                  {title}
                </p>
                <p className="text-sm text-muted-foreground leading-relaxed mt-0.5">
                  {description}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
