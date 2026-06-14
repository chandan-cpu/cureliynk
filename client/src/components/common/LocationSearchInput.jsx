import { useState, useEffect, useRef, useCallback } from "react";
import { searchLocationSuggestions } from "../../services/locationService";
import "./LocationSearchInput.css";

/**
 * LocationSearchInput
 *
 * Props:
 *  - value        {string}   controlled input value
 *  - onChange     {fn}       called with the raw string as user types
 *  - onSelect     {fn}       called with { lat, lng, address, shortLabel } when user picks a suggestion
 *  - placeholder  {string}
 *  - disabled     {bool}
 *  - className    {string}   extra class on the wrapper
 */
const LocationSearchInput = ({
  value = "",
  onChange,
  onSelect,
  placeholder = "Search location…",
  disabled = false,
  className = "",
}) => {
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [error, setError] = useState("");

  const debounceRef = useRef(null);
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);

  // Sync if parent changes value externally
  useEffect(() => {
    setQuery(value);
  }, [value]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setIsOpen(false);
        setActiveIndex(-1);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  // Debounced fetch
  const fetchSuggestions = useCallback(async (q) => {
    if (q.trim().length < 2) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }
    setIsLoading(true);
    setError("");
    try {
      const results = await searchLocationSuggestions(q);
      setSuggestions(results);
      setIsOpen(results.length > 0);
    } catch {
      setError("Could not fetch suggestions");
      setSuggestions([]);
      setIsOpen(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    setActiveIndex(-1);
    onChange?.(val);

    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(val), 350);
  };

  const handleSelect = (suggestion) => {
    const selected = {
      lat: suggestion.lat,
      lng: suggestion.lng,
      address: suggestion.label,
      shortLabel: suggestion.shortLabel,
    };
    setQuery(suggestion.shortLabel || suggestion.label);
    setSuggestions([]);
    setIsOpen(false);
    setActiveIndex(-1);
    onChange?.(suggestion.shortLabel || suggestion.label);
    onSelect?.(selected);
    inputRef.current?.blur();
  };

  const handleKeyDown = (e) => {
    if (!isOpen || !suggestions.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (activeIndex >= 0) handleSelect(suggestions[activeIndex]);
    } else if (e.key === "Escape") {
      setIsOpen(false);
      setActiveIndex(-1);
    }
  };

  const handleClear = () => {
    setQuery("");
    setSuggestions([]);
    setIsOpen(false);
    onChange?.("");
    inputRef.current?.focus();
  };

  const getTypeIcon = (type) => {
    const icons = {
      city: "🏙️", town: "🏘️", village: "🏡", suburb: "🏘️",
      road: "🛣️", hospital: "🏥", clinic: "🏥", pharmacy: "💊",
      school: "🏫", university: "🎓", park: "🌳", restaurant: "🍽️",
      default: "📍",
    };
    return icons[type] || icons.default;
  };

  return (
    <div
      ref={wrapperRef}
      className={`lsi-wrapper ${className} ${isOpen ? "lsi-open" : ""}`}
    >
      <div className={`lsi-input-row ${disabled ? "lsi-disabled" : ""}`}>
        {/* Search icon */}
        <span className="lsi-icon-search">
          {isLoading ? (
            <span className="lsi-spinner" />
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
          )}
        </span>

        <input
          ref={inputRef}
          id="location-search-input"
          type="text"
          className="lsi-input"
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => suggestions.length > 0 && setIsOpen(true)}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete="off"
          aria-autocomplete="list"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-activedescendant={activeIndex >= 0 ? `lsi-opt-${activeIndex}` : undefined}
          role="combobox"
        />

        {/* Clear button */}
        {query && !disabled && (
          <button className="lsi-btn-clear" onClick={handleClear} tabIndex={-1} aria-label="Clear">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Error */}
      {error && <p className="lsi-error">{error}</p>}

      {/* Dropdown */}
      {isOpen && suggestions.length > 0 && (
        <ul
          className="lsi-dropdown"
          role="listbox"
          aria-label="Location suggestions"
        >
          {suggestions.map((s, i) => (
            <li
              key={s.placeId || i}
              id={`lsi-opt-${i}`}
              role="option"
              aria-selected={i === activeIndex}
              className={`lsi-option ${i === activeIndex ? "lsi-option--active" : ""}`}
              onMouseEnter={() => setActiveIndex(i)}
              onMouseDown={(e) => { e.preventDefault(); handleSelect(s); }}
            >
              <span className="lsi-option-icon">{getTypeIcon(s.type)}</span>
              <span className="lsi-option-text">
                <span className="lsi-option-main">{s.shortLabel || s.label.split(",")[0]}</span>
                <span className="lsi-option-sub">{s.label}</span>
              </span>
              <span className="lsi-option-arrow">›</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default LocationSearchInput;
