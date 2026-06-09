/* eslint-disable @typescript-eslint/no-explicit-any */
export const GA_TRACKING_ID = process.env.NEXT_PUBLIC_GA_ID;

// Safe wrapper to trigger page views
export const pageview = (url: string) => {
  if (typeof window !== 'undefined' && (window as any).gtag && GA_TRACKING_ID) {
    (window as any).gtag('config', GA_TRACKING_ID, {
      page_path: url,
    });
  }
};

// Safe wrapper to trigger custom events
export const event = ({ action, category, label, value }: {
  action: string;
  category?: string;
  label?: string;
  value?: number;
}) => {
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', action, {
      event_category: category,
      event_label: label,
      value: value,
    });
  }
};
