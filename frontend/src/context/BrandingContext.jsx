import { createContext, useCallback, useContext, useEffect, useState } from "react";

import API from "@/lib/api";

const BACKEND = process.env.REACT_APP_BACKEND_URL;

const DEFAULTS = {
  app_name: "Application Name",
  tagline: "",
  meta_description: "",
  meta_keywords: "",
  og_title: "",
  og_description: "",
  site_url: "",
  canonical_url: "",
  allow_indexing: true,
  support_email: "",
  copyright_text: "",
  assets: { logo_light: null, logo_dark: null, favicon: null, og_image: null },
};

const BrandingContext = createContext({
  branding: DEFAULTS,
  loading: true,
  refresh: async () => {},
  assetUrl: () => null,
});

/** Build an absolute, cache-busted URL for a stored asset. */
const toAbsolute = (rel, stamp) => {
  if (!rel) return null;
  const sep = rel.includes("?") ? "&" : "?";
  return `${BACKEND}${rel}${stamp ? `${sep}v=${stamp}` : ""}`;
};

const upsertMeta = (attr, key, content) => {
  if (content == null) return;
  let el = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
};

const applyHead = (b, stamp) => {
  const title = b.app_name || "Application";
  document.title = b.tagline ? `${title} — ${b.tagline}` : title;

  upsertMeta("name", "description", b.meta_description || "");
  upsertMeta("name", "keywords", b.meta_keywords || "");
  upsertMeta("name", "robots", b.allow_indexing ? "index, follow" : "noindex, nofollow");

  upsertMeta("property", "og:title", b.og_title || title);
  upsertMeta("property", "og:description", b.og_description || b.meta_description || "");
  if (b.site_url) upsertMeta("property", "og:url", b.canonical_url || b.site_url);
  const og = b.assets?.og_image?.url;
  if (og) upsertMeta("property", "og:image", toAbsolute(og, stamp));

  const fav = b.assets?.favicon?.url;
  if (fav) {
    let link = document.head.querySelector('link[rel="icon"]');
    if (!link) {
      link = document.createElement("link");
      link.setAttribute("rel", "icon");
      document.head.appendChild(link);
    }
    link.setAttribute("href", toAbsolute(fav, stamp));
  }

  if (b.canonical_url) {
    let link = document.head.querySelector('link[rel="canonical"]');
    if (!link) {
      link = document.createElement("link");
      link.setAttribute("rel", "canonical");
      document.head.appendChild(link);
    }
    link.setAttribute("href", b.canonical_url);
  }
};

export function BrandingProvider({ children }) {
  const [branding, setBranding] = useState(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [stamp, setStamp] = useState(0);

  const refresh = useCallback(async () => {
    try {
      const { data } = await API.get("/branding");
      setBranding({ ...DEFAULTS, ...data, assets: { ...DEFAULTS.assets, ...(data.assets || {}) } });
      setStamp(Date.now());
    } catch {
      /* keep defaults on failure */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    applyHead(branding, stamp);
  }, [branding, stamp]);

  const assetUrl = useCallback((kind) => toAbsolute(branding.assets?.[kind]?.url, stamp), [branding, stamp]);

  return (
    <BrandingContext.Provider value={{ branding, loading, refresh, assetUrl }}>
      {children}
    </BrandingContext.Provider>
  );
}

export const useBranding = () => useContext(BrandingContext);
