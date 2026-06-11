import React, { useEffect, useState } from "react";
import { Counter } from "@/components/lazy-ui/counter";
import { cn } from "@/lib/utils";
import "./github-stars-button.css";

const STAR_CLASSES = {
  default: "star-fill-default",
};

const Star = ({ className, strokeWidth, ...props }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth || 2}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

const ArrowUpRight = ({ className, strokeWidth, ...props }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth || 2}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <line x1="7" y1="17" x2="17" y2="7" />
    <polyline points="7 7 17 7 17 17" />
  </svg>
);

function formatStars(value, format) {
  const v = Math.max(0, Math.round(value));
  if (format === "full") return v.toLocaleString("en-US");
  if (format === "plus") return formatPlus(v);
  return formatCompact(v);
}

function formatCompact(v) {
  if (v < 1000) return String(v);
  return `${(v / 1000).toFixed(1).replace(/\.0$/, "")}k`;
}

function formatPlus(v) {
  if (v < 10) return String(v);
  const order = Math.pow(10, Math.floor(Math.log10(v)) - 1);
  return `${Math.floor(v / order) * order}+`;
}

function githubRepoHref(username, repo) {
  return `https://github.com/${username}/${repo}`;
}

function starsUrl(username, repo, apiEndpoint) {
  if (!apiEndpoint) {
    return `https://api.github.com/repos/${encodeURIComponent(username)}/${encodeURIComponent(repo)}`;
  }
  const params = new URLSearchParams({ owner: username, repo });
  const separator = apiEndpoint.includes("?") ? "&" : "?";
  return `${apiEndpoint}${separator}${params.toString()}`;
}

function readStarCount(data) {
  const value = data.stars ?? data.stargazers_count;
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

export function GithubStarsButton({
  username,
  repo,
  label = "GitHub",
  value,
  initialValue = 0,
  fetchStars,
  apiEndpoint,
  showCount = true,
  counterEffect = "3d",
  variant = "default",
  displayFormat = "compact",
  hoverMode = "none",
  hoverLabel = "Star this",
  hoverContent = "Star on GitHub",
  hoverDuration = 300,
  href,
  className = "",
  style,
  target = "_blank",
  rel,
  "aria-label": ariaLabel,
  ...props
}) {
  const shouldFetch = (fetchStars ?? value === undefined) && value === undefined;
  const [fetchedStars, setFetchedStars] = useState(initialValue);
  const [failed, setFailed] = useState(false);

  const repoKey = `${username}/${repo}`;
  const [prevRepoKey, setPrevRepoKey] = useState(repoKey);
  if (prevRepoKey !== repoKey) {
    setPrevRepoKey(repoKey);
    setFetchedStars(initialValue);
    setFailed(false);
  }
  const displayValue = value ?? (shouldFetch ? fetchedStars : initialValue);
  const repoHref = href ?? githubRepoHref(username, repo);

  useEffect(() => {
    if (!shouldFetch) return;

    const controller = new AbortController();
    let active = true;

    async function loadStars() {
      try {
        const response = await fetch(starsUrl(username, repo, apiEndpoint), {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("Unable to load GitHub stars");

        const data = await response.json();
        const next = readStarCount(data);
        if (active && next !== undefined) {
          setFetchedStars(next);
          setFailed(false);
        }
      } catch {
        if (active && !controller.signal.aborted) setFailed(true);
      }
    }

    void loadStars();

    return () => {
      active = false;
      controller.abort();
    };
  }, [apiEndpoint, repo, shouldFetch, username]);

  const formatFn = (n) => formatStars(n, displayFormat);

  const rootStyle = {
    ["--hover-dur"]: `${Math.max(0, hoverDuration)}ms`,
    ...style,
  };

  return (
    <a
      href={repoHref}
      target={target}
      rel={target === "_blank" ? (rel ?? "noreferrer") : rel}
      aria-label={ariaLabel ?? `Open ${username}/${repo} on GitHub`}
      data-github-stars-button=""
      data-variant={variant}
      data-fetch-error={failed || undefined}
      style={rootStyle}
      className={cn("github-stars-btn-root group", className)}
      {...props}
    >
      <span
        aria-hidden="true"
        className={cn("gs-shimmer", `gs-shimmer-${variant}`)}
      />

      <span
        className={cn(
          "gs-content",
          hoverMode === "full" && "gs-content-hover-full"
        )}
      >
        <span className="inline-grid size-4 place-items-center" style={{ width: "16px", height: "16px", display: "inline-flex" }}>
          <GithubMark />
        </span>

        {hoverMode === "label" ? (
          <span className="relative inline-grid overflow-hidden">
            {/* NHÃN GỐC (VÍ DỤ: GITHUB) - TRƯỢT LÊN VÀ BIẾN MẤT */}
            <span className="col-start-1 row-start-1 transform-gpu transition-[opacity,transform] ease-out [transition-duration:var(--hover-dur)] [will-change:opacity,transform] group-hover:-translate-y-2 group-hover:opacity-0">
              {label}
            </span>
            
            {/* NHÃN KHI HOVER (VÍ DỤ: STAR THIS) - TỪ DƯỚI TRƯỢT LÊN VÀ HIỆN RA */}
            <span className="col-start-1 row-start-1 translate-y-2 transform-gpu opacity-0 transition-[opacity,transform] ease-out [transition-duration:var(--hover-dur)] [will-change:opacity,transform] group-hover:translate-y-0 group-hover:opacity-100">
              {hoverLabel}
            </span>
          </span>
        ) : (
          <span>{label}</span>
        )}

        {showCount && (
          <>
            <span
              className="gs-divider"
              aria-hidden="true"
            />
            <Counter
              value={displayValue}
              speed={900}
              easing="ease-out"
              effect={counterEffect}
              format={formatFn}
              className={cn("gs-counter", `gs-count-${variant}`)}
            />
          </>
        )}

        <span className="relative inline-grid size-3.5 place-items-center">
          {/* LỚP 1: VÒNG SÁNG HALO BÙNG NỞ PHÍA SAU NGÔI SAO */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-[-5px] scale-75 rounded-full bg-yellow-400/0 opacity-0 blur-md transition-[opacity,transform,background-color] duration-[550ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-110 group-hover:bg-yellow-400/40 group-hover:opacity-100"
          />
          
          {/* LỚP 2: NGÔI SAO PHÓNG TO, XOAY 144 ĐỘ VÀ ĐỔ BÓNG PHÁT SÁNG */}
          <Star
            aria-hidden="true"
            className={cn(
              "relative size-3.5 transition-[transform,filter] duration-[650ms] ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:rotate-[144deg] group-hover:scale-[1.3] group-hover:drop-shadow-[0_0_8px_rgba(250,204,21,0.8)]",
              STAR_CLASSES[variant],
            )}
            strokeWidth={1.8}
          />
        </span>

        {/* LỚP 3: BA HẠT BỤI SÁNG BẮN LÊN (STAGGERED POP) */}
        <span className="pointer-events-none absolute inset-0 z-0" aria-hidden="true">
          {/* Hạt 1 */}
          <span className="absolute right-8 top-1.5 size-1 rounded-full bg-yellow-400 opacity-0 transition-[opacity,transform] duration-[550ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:-translate-y-2 group-hover:translate-x-0.5 group-hover:opacity-100" />
          {/* Hạt 2 (Chạy trễ hơn 80ms nhờ delay-[80ms]) */}
          <span className="absolute right-5 top-6 size-0.5 rounded-full bg-yellow-300 opacity-0 transition-[opacity,transform] delay-[80ms] duration-[550ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:-translate-y-2.5 group-hover:opacity-100" />
          {/* Hạt 3 (Chạy trễ hơn 160ms nhờ delay-[160ms]) */}
          <span className="absolute right-2.5 top-2 size-0.5 rounded-full bg-yellow-200 opacity-0 transition-[opacity,transform] delay-[160ms] duration-[550ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:-translate-y-1.5 group-hover:translate-x-1 group-hover:opacity-100" />
        </span>
      </span>

      {hoverMode === "full" && (
        <span
          aria-hidden="true"
          className="gs-overlay-full"
        >
          <Star
            className={STAR_CLASSES[variant]}
            strokeWidth={1.8}
          />
          <span className="whitespace-nowrap text-sm font-medium">
            {hoverContent}
          </span>
          <ArrowUpRight
            className="arrow-icon"
            strokeWidth={2}
          />
        </span>
      )}
    </a>
  );
}

function GithubMark() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      style={{ width: "100%", height: "100%" }}
    >
      <path d="M12 2C6.48 2 2 6.58 2 12.25c0 4.51 2.87 8.34 6.84 9.69.5.1.68-.22.68-.5v-1.73c-2.78.62-3.37-1.38-3.37-1.38-.45-1.18-1.1-1.5-1.1-1.5-.91-.63.06-.62.06-.62 1 .07 1.53 1.06 1.53 1.06.89 1.56 2.34 1.11 2.91.85.09-.66.35-1.11.63-1.36-2.22-.26-4.55-1.14-4.55-5.07 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.3.1-2.71 0 0 .84-.28 2.75 1.05A9.3 9.3 0 0 1 12 6.94c.85 0 1.7.12 2.5.34 1.9-1.33 2.74-1.05 2.74-1.05.55 1.41.2 2.45.1 2.71.64.72 1.03 1.63 1.03 2.75 0 3.94-2.34 4.8-4.57 5.06.36.32.68.94.68 1.9v2.82c0 .28.18.6.69.5A10.15 10.15 0 0 0 22 12.25C22 6.58 17.52 2 12 2Z" />
    </svg>
  );
}

GithubStarsButton.displayName = "GithubStarsButton";
