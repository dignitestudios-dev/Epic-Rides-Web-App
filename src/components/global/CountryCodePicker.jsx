import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Search, X, Check } from 'lucide-react';
import { COUNTRIES, DEFAULT_COUNTRY } from '../../data/countries';

export default function CountryCodePicker({
  selectedCountry = DEFAULT_COUNTRY,
  onSelectCountry,
  disabled = false,
  className = '',
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);

  // Filter countries by name, dialCode, or ISO code
  const filteredCountries = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return COUNTRIES;
    const cleanQ = q.replace(/\+/g, '');
    return COUNTRIES.filter((country) => {
      const nameMatch = country.name.toLowerCase().includes(q);
      const codeMatch = country.code.toLowerCase().includes(q);
      const dialCodeMatch =
        country.dialCode.includes(q) ||
        country.dialCode.replace(/\+/g, '').includes(cleanQ);
      return nameMatch || codeMatch || dialCodeMatch;
    });
  }, [searchQuery]);

  // Handle outside clicks to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleSelect = (country) => {
    onSelectCountry?.(country);
    setIsOpen(false);
    setSearchQuery('');
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        className="h-11 rounded-xl relative backdrop-blur-[42px] flex items-center justify-between gap-1.5 sm:gap-2 px-2.5 sm:px-3 shrink-0 cursor-pointer transition-all duration-200 select-none"
        style={{
          background:
            'linear-gradient(180deg, rgba(97, 203, 8, 0.12) 0%, rgba(97, 203, 8, 0.04) 50%, rgba(97, 203, 8, 0.07) 100%)',
          border: isOpen
            ? '1px solid #61CB08'
            : '1px solid rgba(97, 203, 8, 0.32)',
          WebkitBackdropFilter: 'blur(42px)',
          minWidth: '95px',
        }}
        aria-label="Select Country Code"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
          <img
            src={selectedCountry?.flag}
            alt={selectedCountry?.name || 'Flag'}
            className="w-5 sm:w-6 h-3.5 sm:h-4 rounded-[2px] object-cover shrink-0 shadow-sm"
            loading="lazy"
            onError={(e) => {
              e.target.style.display = 'none';
            }}
          />
          <span className="font-poppins font-normal text-xs sm:text-sm text-white whitespace-nowrap">
            {selectedCountry?.dialCode || '+1'}
          </span>
        </div>
        <ChevronDown
          size={14}
          className={`text-white/70 transition-transform duration-200 shrink-0 ${
            isOpen ? 'rotate-180 text-[#61CB08]' : ''
          }`}
        />
      </button>

      {/* Simple Unified Combobox Dropdown */}
      {isOpen && (
        <div
          className="flex flex-col absolute top-[calc(100%+6px)] left-0 w-[290px] sm:w-[320px] max-w-[calc(100vw-32px)] z-50 rounded-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150"
          style={{
            background: 'rgba(16, 18, 15, 0.98)',
            border: '1px solid rgba(97, 203, 8, 0.35)',
            backdropFilter: 'blur(30px)',
            WebkitBackdropFilter: 'blur(30px)',
            boxShadow: '0 12px 32px rgba(0, 0, 0, 0.7), 0 0 16px rgba(97, 203, 8, 0.12)',
            maxHeight: 'min(300px, calc(100vh - 120px))',
          }}
        >
          {/* Search Bar */}
          <div className="p-2.5 sm:p-3 border-b border-white/10 shrink-0">
            <div className="relative w-full flex items-center">
              <Search
                size={15}
                className="absolute left-2.5 text-white/50 pointer-events-none"
              />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search country or code..."
                className="w-full h-9 pl-8 pr-8 bg-white/10 rounded-lg font-poppins text-xs text-white placeholder:text-white/40 outline-none border border-white/10 focus:border-[#61CB08] transition-colors"
              />
              {searchQuery.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    searchInputRef.current?.focus();
                  }}
                  className="absolute right-2 p-1 rounded-full hover:bg-white/20 text-white/60 hover:text-white transition-colors cursor-pointer"
                  title="Clear search"
                >
                  <X size={13} />
                </button>
              )}
            </div>
          </div>

          {/* Country List */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-1.5 flex flex-col gap-0.5">
            {filteredCountries.length > 0 ? (
              filteredCountries.map((country) => {
                const isSelected = country.code === selectedCountry?.code;
                return (
                  <button
                    key={`${country.code}-${country.dialCode}`}
                    type="button"
                    onClick={() => handleSelect(country)}
                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-[#61CB08]/20 text-[#61CB08]'
                        : 'hover:bg-white/10 text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 pr-2">
                      <img
                        src={country.flag}
                        alt={country.name}
                        className="w-5 h-3.5 rounded-[2px] object-cover shrink-0 shadow-sm"
                        loading="lazy"
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                      <span className="font-poppins text-xs font-normal truncate">
                        {country.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="font-poppins text-xs font-semibold text-white/70">
                        {country.dialCode}
                      </span>
                      {isSelected && (
                        <Check size={14} className="text-[#61CB08] ml-1 shrink-0" />
                      )}
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="py-6 text-center text-white/50 font-poppins text-xs">
                No country found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
