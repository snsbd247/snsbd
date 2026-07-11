import type { Plan } from "@/components/marketing/pricing-card";

export const webHostingPlans: Plan[] = [
  {
    name: "Starter",
    tagline: "For personal sites & blogs",
    price: "৳99",
    period: "mo",
    features: ["1 Website", "10 GB SSD Storage", "100 GB Bandwidth", "Free SSL", "5 Email Accounts", "cPanel Control Panel"],
  },
  {
    name: "Business",
    tagline: "For growing businesses",
    price: "৳299",
    period: "mo",
    features: ["10 Websites", "50 GB SSD Storage", "Unlimited Bandwidth", "Free SSL & Daily Backup", "Unlimited Emails", "Free .com Domain", "LiteSpeed Web Server"],
    featured: true,
    badge: "Most Popular",
  },
  {
    name: "Pro",
    tagline: "For heavy traffic sites",
    price: "৳599",
    period: "mo",
    features: ["Unlimited Websites", "150 GB NVMe Storage", "Unlimited Bandwidth", "Free SSL, CDN & Backup", "Priority Support", "Dedicated IP Available", "Higher CPU / RAM"],
  },
];

export const bdixHostingPlans: Plan[] = [
  {
    name: "BDIX Lite",
    price: "৳149",
    period: "mo",
    features: ["1 Website", "5 GB NVMe", "BDIX Optimized", "Free SSL", "cPanel"],
  },
  {
    name: "BDIX Pro",
    price: "৳399",
    period: "mo",
    features: ["10 Websites", "25 GB NVMe", "BDIX + International", "Free SSL & Backup", "LiteSpeed", "Unlimited Bandwidth"],
    featured: true,
    badge: "Best Value",
  },
  {
    name: "BDIX Max",
    price: "৳799",
    period: "mo",
    features: ["Unlimited Sites", "80 GB NVMe", "Priority BDIX Route", "Daily Backup", "Priority Support", "Dedicated Resources"],
  },
];

export const resellerPlans: Plan[] = [
  {
    name: "R1",
    price: "৳799",
    period: "mo",
    features: ["30 Accounts", "50 GB SSD", "500 GB Bandwidth", "WHM & cPanel", "Free WHMCS Module"],
  },
  {
    name: "R2",
    price: "৳1,499",
    period: "mo",
    features: ["100 Accounts", "150 GB SSD", "Unlimited Bandwidth", "Free Migration", "White-label"],
    featured: true,
    badge: "Recommended",
  },
  {
    name: "R3",
    price: "৳2,999",
    period: "mo",
    features: ["Unlimited Accounts", "400 GB SSD", "Priority Support", "Free SSL for all", "Dedicated IP"],
  },
];

export const vpsPlans: Plan[] = [
  {
    name: "VPS 1",
    price: "৳1,200",
    period: "mo",
    features: ["2 vCPU", "2 GB RAM", "50 GB NVMe", "2 TB Bandwidth", "Root Access", "1 IPv4"],
  },
  {
    name: "VPS 2",
    price: "৳2,400",
    period: "mo",
    features: ["4 vCPU", "4 GB RAM", "100 GB NVMe", "4 TB Bandwidth", "KVM Virtualization", "Free Setup"],
    featured: true,
    badge: "Popular",
  },
  {
    name: "VPS 3",
    price: "৳4,800",
    period: "mo",
    features: ["6 vCPU", "8 GB RAM", "200 GB NVMe", "6 TB Bandwidth", "Managed Support", "Snapshots"],
  },
];

export const tlds = [
  { tld: ".com", register: "৳1,150", renew: "৳1,250", transfer: "৳1,150" },
  { tld: ".net", register: "৳1,350", renew: "৳1,450", transfer: "৳1,350" },
  { tld: ".org", register: "৳1,250", renew: "৳1,350", transfer: "৳1,250" },
  { tld: ".xyz", register: "৳299", renew: "৳1,100", transfer: "৳1,100" },
  { tld: ".info", register: "৳499", renew: "৳1,850", transfer: "৳1,850" },
  { tld: ".io", register: "৳4,500", renew: "৳4,500", transfer: "৳4,500" },
  { tld: ".co", register: "৳2,600", renew: "৳2,600", transfer: "৳2,600" },
  { tld: ".online", register: "৳299", renew: "৳3,900", transfer: "৳3,900" },
  { tld: ".shop", register: "৳299", renew: "৳2,700", transfer: "৳2,700" },
  { tld: ".dev", register: "৳1,600", renew: "৳1,600", transfer: "৳1,600" },
];
