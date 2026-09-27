import { RefreshCw } from "lucide-react";
import type { ReactNode } from "react";
import "./page-hero.css";

type PageHeroProps = {
  kicker: string;
  title: string;
  description: string;
  onRefresh: () => void;
  refreshing?: boolean;
  actions?: ReactNode;
};

export default function PageHero({ kicker, title, description, onRefresh, refreshing = false, actions }: PageHeroProps) {
  return (
    <div className="page-hero" dir="rtl">
      <div className="page-hero-copy">
        <span>{kicker}</span>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      <div className="page-hero-actions">
        {actions}
        <button className="page-hero-refresh" type="button" onClick={onRefresh} disabled={refreshing} aria-label={`تحديث بيانات ${title}`}>
          <RefreshCw size={17} /> تحديث
        </button>
      </div>
    </div>
  );
}