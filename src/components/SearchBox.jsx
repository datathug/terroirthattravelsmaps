import { useCallback, useEffect, useRef, useState } from "react";

// Strips diacritics so "e" matches "ę", "o" matches "ó", "u" matches "ü", etc.
const normalize = (str) =>
  str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

export default function SearchBox({ features, onSelect }) {
  const [query, setQuery] = useState("");
  const [filtered, setFiltered] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  // Filter as query changes
  useEffect(() => {
    if (!query.trim()) {
      setFiltered([]);
      setIsOpen(false);
      return;
    }
    const q = normalize(query.trim());
    const results = features
      .filter(
        ({ properties: p }) =>
          normalize(p.unit_id ?? "").includes(q) ||
          normalize(p.Name ?? "").includes(q) ||
          normalize(p.Country ?? "").includes(q),
      )
      .slice(0, 8);
    setFiltered(results);
    setIsOpen(results.length > 0);
    setActiveIndex(-1);
  }, [query, features]);

  // Close on outside click
  useEffect(() => {
    const onOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, []);

  const handleSelect = useCallback(
    (feature) => {
      setQuery(feature.properties.unit_id);
      setIsOpen(false);
      setActiveIndex(-1);
      onSelect(feature);
    },
    [onSelect],
  );

  const handleKeyDown = (e) => {
    if (!isOpen) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, -1));
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      handleSelect(filtered[activeIndex]);
    } else if (e.key === "Escape") {
      setIsOpen(false);
      inputRef.current?.blur();
    }
  };

  const handleClear = () => {
    setQuery("");
    setFiltered([]);
    setIsOpen(false);
    inputRef.current?.focus();
  };

  return (
    <div className="search-container" ref={containerRef}>
      <div className="search-input-wrapper">
        <svg
          className="search-icon"
          viewBox="0 0 20 20"
          fill="none"
          aria-hidden="true"
        >
          <circle
            cx="8.5"
            cy="8.5"
            r="5.5"
            stroke="currentColor"
            strokeWidth="1.8"
          />
          <path
            d="M13 13l3.5 3.5"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
        <input
          ref={inputRef}
          type="text"
          className="search-input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => filtered.length > 0 && setIsOpen(true)}
          placeholder="Search by ID, name or country…"
          autoComplete="off"
          spellCheck="false"
          aria-label="Search PGI / PDO features"
          aria-autocomplete="list"
          aria-expanded={isOpen}
        />
        {query && (
          <button
            className="search-clear"
            onClick={handleClear}
            aria-label="Clear search"
          >
            ×
          </button>
        )}
      </div>

      {isOpen && (
        <ul className="search-dropdown" role="listbox">
          {filtered.map((f, i) => {
            const name = f.properties.Name?.split("/")[0]?.trim();
            return (
              <li
                key={f.properties.unit_id}
                className={`search-item${i === activeIndex ? " search-item--active" : ""}`}
                onMouseDown={() => handleSelect(f)}
                onMouseEnter={() => setActiveIndex(i)}
                role="option"
                aria-selected={i === activeIndex}
              >
                <span className="search-item-id">{f.properties.unit_id}</span>
                <span className="search-item-name">
                  {name}
                  {f.properties.Country && (
                    <span className="search-item-country">
                      {" "}
                      · {f.properties.Country}
                    </span>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
