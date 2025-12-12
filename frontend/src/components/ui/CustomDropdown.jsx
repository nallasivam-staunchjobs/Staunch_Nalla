import React, { useState, useRef, useEffect } from 'react';

const CustomDropdown = ({
  options = [],
  value,
  onChange,
  placeholder = "Select option",
  isSearchable = true,
  isClearable = true,
  isDisabled = false,
  noOptionsMessage = "No options found",
  tabIndex,
  className = "",
  error = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  // Filter options based on search term
  const filteredOptions = options.filter(option =>
    option.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Find selected option
  const selectedOption = options.find(option => option.value === value);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm('');
        setHighlightedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (!isOpen) return;

      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          setHighlightedIndex(prev => 
            prev < filteredOptions.length - 1 ? prev + 1 : 0
          );
          break;
        case 'ArrowUp':
          event.preventDefault();
          setHighlightedIndex(prev => 
            prev > 0 ? prev - 1 : filteredOptions.length - 1
          );
          break;
        case 'Enter':
          event.preventDefault();
          if (highlightedIndex >= 0 && filteredOptions[highlightedIndex]) {
            handleOptionSelect(filteredOptions[highlightedIndex]);
          }
          break;
        case 'Escape':
          setIsOpen(false);
          setSearchTerm('');
          setHighlightedIndex(-1);
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, highlightedIndex, filteredOptions]);

  // Scroll highlighted option into view
  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const highlightedElement = listRef.current.children[highlightedIndex];
      if (highlightedElement) {
        highlightedElement.scrollIntoView({
          block: 'nearest',
          behavior: 'smooth'
        });
      }
    }
  }, [highlightedIndex]);

  const handleInputClick = () => {
    if (isDisabled) return;
    setIsOpen(!isOpen);
    if (!isOpen) {
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  };

  const handleInputChange = (e) => {
    setSearchTerm(e.target.value);
    setHighlightedIndex(-1);
    if (!isOpen) setIsOpen(true);
  };

  const handleOptionSelect = (option) => {
    onChange(option);
    setIsOpen(false);
    setSearchTerm('');
    setHighlightedIndex(-1);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange(null);
    setSearchTerm('');
  };

  const displayValue = isOpen && isSearchable ? searchTerm : (selectedOption?.label || '');

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      {/* Input Container */}
      <div
        className={`
          relative w-full min-h-[28px] h-[28px] px-2 py-1 
          border rounded-md shadow-sm cursor-pointer
          flex items-center justify-between
          text-xs font-light
          transition-colors duration-200
          ${error 
            ? 'border-red-300 focus-within:border-red-500 focus-within:ring-red-500' 
            : 'border-gray-300 focus-within:border-blue-500 focus-within:ring-blue-500'
          }
          ${isDisabled 
            ? 'bg-gray-100 cursor-not-allowed' 
            : 'bg-white hover:border-gray-400'
          }
          ${isOpen ? 'ring-1' : ''}
        `}
        onClick={handleInputClick}
      >
        {/* Input/Display */}
        {isSearchable ? (
          <input
            ref={inputRef}
            type="text"
            value={displayValue}
            onChange={handleInputChange}
            placeholder={selectedOption ? selectedOption.label : placeholder}
            disabled={isDisabled}
            tabIndex={tabIndex}
            className={`
              flex-1 outline-none bg-transparent text-xs font-light
              ${isDisabled ? 'cursor-not-allowed' : 'cursor-pointer'}
              ${selectedOption && !isOpen ? 'text-gray-900' : 'text-gray-500'}
            `}
            style={{ caretColor: isOpen ? 'auto' : 'transparent' }}
          />
        ) : (
          <span className={`flex-1 text-xs font-light ${selectedOption ? 'text-gray-900' : 'text-gray-500'}`}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        )}

        {/* Icons */}
        <div className="flex items-center space-x-1">
          {/* Clear Button */}
          {isClearable && selectedOption && !isDisabled && (
            <button
              type="button"
              onClick={handleClear}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}

          {/* Dropdown Arrow */}
          <svg 
            className={`w-3 h-3 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-auto">
          {filteredOptions.length > 0 ? (
            <ul ref={listRef} className="py-1">
              {filteredOptions.map((option, index) => (
                <li
                  key={option.value}
                  onClick={() => handleOptionSelect(option)}
                  className={`
                    px-3 py-2 text-xs font-light cursor-pointer transition-colors
                    ${index === highlightedIndex 
                      ? 'bg-blue-50 text-blue-900' 
                      : 'text-gray-900 hover:bg-gray-50'
                    }
                    ${selectedOption?.value === option.value 
                      ? 'bg-blue-100 text-blue-900 font-medium' 
                      : ''
                    }
                  `}
                >
                  {option.label}
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-3 py-2 text-xs text-gray-500 text-center">
              {noOptionsMessage}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CustomDropdown;
