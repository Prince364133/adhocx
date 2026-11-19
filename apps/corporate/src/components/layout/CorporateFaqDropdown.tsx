"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowRight,
  Building2,
  ChevronDown,
  HelpCircle,
  LifeBuoy,
  ReceiptText,
  Route,
  Search,
  ThumbsDown,
  ThumbsUp,
  UsersRound,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  CORPORATE_FAQ_CATEGORIES,
  CORPORATE_FAQS,
  type CorporateFaqCategoryId,
} from "../../lib/corporateFaq";
import styles from "./CorporateFaqDropdown.module.css";

type HelpCategoryId =
  | "employees"
  | "routes-trips"
  | "billing-payments"
  | "support-tickets"
  | "account-company";

const HELP_CATEGORIES: Array<{
  id: HelpCategoryId;
  label: string;
  description: string;
  sourceCategories: CorporateFaqCategoryId[];
  icon: LucideIcon;
}> = [
  {
    id: "employees",
    label: "Employees",
    description: "Employee management, profiles and access.",
    sourceCategories: ["employee-management"],
    icon: UsersRound,
  },
  {
    id: "routes-trips",
    label: "Routes & Trips",
    description: "Routes, trip schedules and tracking.",
    sourceCategories: ["routes-trips"],
    icon: Route,
  },
  {
    id: "billing-payments",
    label: "Billing & Payments",
    description: "Invoices, payments and financial details.",
    sourceCategories: ["billing-payments"],
    icon: ReceiptText,
  },
  {
    id: "support-tickets",
    label: "Support & Tickets",
    description: "Support tickets, employee complaints and responses.",
    sourceCategories: ["support-tickets"],
    icon: LifeBuoy,
  },
  {
    id: "account-company",
    label: "Account & Company",
    description: "Company profile, settings and users.",
    sourceCategories: ["company-profile", "account-login"],
    icon: Building2,
  },
];

export function CorporateFaqDropdown() {
  const pathname = usePathname();
  const isActive = pathname === "/help" || pathname.startsWith("/help/");

  return (
    <Link
      href="/help"
      aria-label="Help and FAQs"
      aria-current={isActive ? "page" : undefined}
      title="Help & FAQs"
      className={styles.trigger}
    >
      <HelpCircle size={16} />
    </Link>
  );
}

export function CorporateHelpCenter() {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<
    HelpCategoryId | "all"
  >("all");
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null);
  const [helpfulVotes, setHelpfulVotes] = useState<
    Record<string, "yes" | "no">
  >({});

  const filteredFaqs = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return CORPORATE_FAQS.filter((faq) => {
      const selectedHelpCategory = HELP_CATEGORIES.find(
        (category) => category.id === selectedCategory,
      );
      const matchesCategory =
        selectedCategory === "all" ||
        selectedHelpCategory?.sourceCategories.includes(faq.category) === true;
      const categoryLabel =
        CORPORATE_FAQ_CATEGORIES.find(
          (category) => category.id === faq.category,
        )?.label ?? "";
      const matchesSearch =
        !query ||
        `${categoryLabel} ${faq.question} ${faq.answer}`
          .toLocaleLowerCase()
          .includes(query);
      return matchesCategory && matchesSearch;
    });
  }, [search, selectedCategory]);

  const selectCategory = (category: HelpCategoryId | "all") => {
    setSelectedCategory(category);
    setExpandedFaq(null);
  };

  return (
    <div className={styles.helpCenter}>
      <header className={styles.header}>
        <h1 className={styles.brand}>
          Adhoc<span className={styles.brandAccent}>X</span> Help Center
        </h1>
      </header>

      <div className={styles.panelBody}>
        <section className={styles.intro} aria-labelledby="help-center-heading">
          <div>
            <h2 id="help-center-heading">How can we help you?</h2>
            <p>
              Find answers, explore help topics or contact our support team.
            </p>
          </div>
          <label className={styles.searchBox}>
            <Search size={19} aria-hidden="true" />
            <input
              type="search"
              aria-label="Search help articles"
              placeholder="Search help articles..."
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setExpandedFaq(null);
              }}
            />
          </label>
        </section>

        <section aria-labelledby="help-topics-heading">
          <div className={styles.sectionHeading}>
            <h3 id="help-topics-heading">Browse help topics</h3>
            <button
              type="button"
              onClick={() => selectCategory("all")}
              className={styles.allTopicsButton}
            >
              View all FAQs
            </button>
          </div>
          <div className={styles.categoryGrid}>
            {HELP_CATEGORIES.map((category) => {
              const Icon = category.icon;
              const selected = selectedCategory === category.id;
              return (
                <button
                  type="button"
                  key={category.id}
                  aria-pressed={selected}
                  onClick={() => selectCategory(category.id)}
                  className={`${styles.categoryCard} ${selected ? styles.categoryCardActive : ""}`}
                >
                  <span className={styles.categoryIcon}>
                    <Icon size={20} aria-hidden="true" />
                  </span>
                  <span className={styles.categoryText}>
                    <strong>{category.label}</strong>
                    <span>{category.description}</span>
                  </span>
                  <ArrowRight
                    size={16}
                    aria-hidden="true"
                    className={styles.categoryArrow}
                  />
                </button>
              );
            })}
          </div>
        </section>

        <section aria-labelledby="faq-heading">
          <div className={styles.sectionHeading}>
            <h3 id="faq-heading">Frequently Asked Questions</h3>
            <span className={styles.articleCount} aria-live="polite">
              {filteredFaqs.length}{" "}
              {filteredFaqs.length === 1 ? "answer" : "answers"}
            </span>
          </div>
          <nav className={styles.filters} aria-label="Filter FAQs">
            <button
              type="button"
              aria-pressed={selectedCategory === "all"}
              onClick={() => selectCategory("all")}
              className={`${styles.filterButton} ${selectedCategory === "all" ? styles.filterButtonActive : ""}`}
            >
              All FAQs
            </button>
            {HELP_CATEGORIES.map((category) => (
              <button
                type="button"
                key={category.id}
                aria-pressed={selectedCategory === category.id}
                onClick={() => selectCategory(category.id)}
                className={`${styles.filterButton} ${selectedCategory === category.id ? styles.filterButtonActive : ""}`}
              >
                {category.label}
              </button>
            ))}
          </nav>

          {filteredFaqs.length === 0 ? (
            <div className={styles.emptyState}>
              <Search size={21} aria-hidden="true" />
              <p>No FAQs match your search.</p>
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  selectCategory("all");
                }}
              >
                Clear search and filters
              </button>
            </div>
          ) : (
            <div className={styles.faqList}>
              {filteredFaqs.map((faq) => {
                const expanded = expandedFaq === faq.id;
                const vote = helpfulVotes[faq.id];
                return (
                  <article key={faq.id} className={styles.faqItem}>
                    <button
                      type="button"
                      id={`faq-question-${faq.id}`}
                      aria-expanded={expanded}
                      aria-controls={`faq-answer-${faq.id}`}
                      onClick={() => setExpandedFaq(expanded ? null : faq.id)}
                      className={styles.question}
                    >
                      <span>{faq.question}</span>
                      <ChevronDown
                        size={17}
                        aria-hidden="true"
                        className={`${styles.chevron} ${expanded ? styles.chevronOpen : ""}`}
                      />
                    </button>
                    {expanded && (
                      <div
                        id={`faq-answer-${faq.id}`}
                        role="region"
                        aria-labelledby={`faq-question-${faq.id}`}
                        className={styles.answer}
                      >
                        <p>{faq.answer}</p>
                        <div className={styles.feedback}>
                          <span>Was this answer helpful?</span>
                          {vote ? (
                            <span className={styles.thanks} role="status">
                              Thanks for your feedback.
                            </span>
                          ) : (
                            <div className={styles.feedbackActions}>
                              <button
                                type="button"
                                aria-label="Yes, this answer was helpful"
                                onClick={() =>
                                  setHelpfulVotes((current) => ({
                                    ...current,
                                    [faq.id]: "yes",
                                  }))
                                }
                                className={styles.feedbackButton}
                              >
                                <ThumbsUp size={14} aria-hidden="true" /> Yes
                              </button>
                              <button
                                type="button"
                                aria-label="No, this answer was not helpful"
                                onClick={() =>
                                  setHelpfulVotes((current) => ({
                                    ...current,
                                    [faq.id]: "no",
                                  }))
                                }
                                className={styles.feedbackButton}
                              >
                                <ThumbsDown size={14} aria-hidden="true" /> No
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section
          className={styles.supportCard}
          aria-labelledby="still-need-help-heading"
        >
          <div className={styles.supportIcon}>
            <LifeBuoy size={20} aria-hidden="true" />
          </div>
          <div className={styles.supportCopy}>
            <h3 id="still-need-help-heading">Still need help?</h3>
            <p>
              Can&apos;t find the answer? Our support team is here to help you
              resolve your issue.
            </p>
          </div>
          <div className={styles.supportActions}>
            <Link
              href="/support?openTicket=1"
              onClick={(event) => {
                if (window.location.pathname === "/support") {
                  event.preventDefault();
                  window.dispatchEvent(new Event("adhocx:open-support-ticket"));
                }
              }}
              className={styles.primarySupportButton}
            >
              Raise a Ticket
            </Link>
            <Link href="/support" className={styles.secondarySupportButton}>
              Track My Tickets
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
