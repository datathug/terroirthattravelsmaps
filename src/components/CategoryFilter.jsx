import { useState, useEffect, useRef } from 'react';

// The CODE field is messy: it may contain multiple chapter codes either
// separated by "\n" or simply concatenated without any separator, e.g.:
//   "07 - EDIBLE VEGETABLES...\n0703 - Onions..."          ← normal
//   "07 - EDIBLE VEGETABLES...08 - EDIBLE FRUIT..."        ← concatenated
//   "07 - VEGETABLES...08 - FRUIT...10 - CEREALS..."       ← many concatenated
//
// Strategy:
//   1. Insert a newline before any chapter-code boundary that was concatenated
//      (a non-digit char immediately followed by "NN - [A-Z]").
//   2. Split on newlines and keep only lines starting with exactly a 2-digit
//      code ("07 - ") — 4-digit sub-codes ("0703 - ") are excluded because
//      "\d{2} - " requires the 3rd char to be a space, which "0703 - " is not.
const extractChapters = (code) => {
  const normalized = code.replace(/([^\n\d])(\d{2} - [A-Z])/g, '$1\n$2');
  return normalized
    .split('\n')
    .map(l => l.trim())
    .filter(l => /^\d{2} - /.test(l));
};

export default function CategoryFilter({ features, onCategoryChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [codes, setCodes] = useState([]);
  const containerRef = useRef(null);

  // Build a sorted list of unique chapter headings across all features
  useEffect(() => {
    const seen = new Set();
    for (const f of features) {
      const code = f.properties?.CODE;
      if (!code) continue;
      for (const chapter of extractChapters(code)) {
        seen.add(chapter);
      }
    }
    setCodes(Array.from(seen).sort());
  }, [features]);

  // Close dropdown on outside click
  useEffect(() => {
    const onOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, []);

  const handleSelect = (code) => {
    setSelected(code);
    setIsOpen(false);
    onCategoryChange?.(code);
  };

  const handleClear = () => {
    setSelected(null);
    setIsOpen(false);
    onCategoryChange?.(null);
  };

  return (
    <div className="filter-container" ref={containerRef}>
      <button
        className={`filter-button${isOpen ? ' filter-button--open' : ''}${selected ? ' filter-button--active' : ''}`}
        onClick={() => setIsOpen((o) => !o)}
      >
        <span className={`filter-button-label${!selected ? ' filter-button-label--placeholder' : ''}`}>
          {selected ?? 'Filter by product category…'}
        </span>
        <svg
          className="filter-chevron"
          viewBox="0 0 12 8"
          fill="none"
          aria-hidden="true"
          style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
        >
          <path d="M1 1l5 5 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {isOpen && (
        <div className="filter-dropdown">
          <ul className="filter-list" role="listbox">
            {codes.map((code) => (
              <li
                key={code}
                className={`filter-item${selected === code ? ' filter-item--selected' : ''}`}
                onClick={() => handleSelect(code)}
                role="option"
                aria-selected={selected === code}
              >
                {code}
              </li>
            ))}
          </ul>
          <div className="filter-footer">
            <button className="filter-clear-btn" onClick={handleClear}>
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
