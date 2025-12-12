
import React, { useState, useEffect, useRef } from 'react';

const months = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const weekDays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

const getDaysInMonth = (date) => {
  const year = date.getFullYear();
  const month = date.getMonth();
  return new Date(year, month + 1, 0).getDate();
};

const formatDate = (date) => {
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
};

const DatePicker = ({ value, onChange, disableFuture = false, minDate, maxDate }) => {
  const getInitialDate = () => {
    if (value) return new Date(value);
    if (maxDate) return new Date(maxDate);
    return new Date();
  };

  const [showCalendar, setShowCalendar] = useState(false);
  const [currentDate, setCurrentDate] = useState(getInitialDate());
  const [selectedDate, setSelectedDate] = useState(value ? new Date(value) : null);
  const [view, setView] = useState('date');
  const calendarRef = useRef(null);
  const inputRef = useRef(null);
  const yearRefs = useRef({});

  const years = Array.from({ length: 201 }, (_, i) => new Date().getFullYear() - 100 + i);

  const handleDateClick = (day) => {
    const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day, 12);
    setSelectedDate(newDate);
    onChange(newDate.toISOString().split('T')[0]);
    setShowCalendar(false);
  };

  const handleClickOutside = (e) => {
    if (
      calendarRef.current &&
      !calendarRef.current.contains(e.target) &&
      !inputRef.current.contains(e.target)
    ) {
      setShowCalendar(false);
    }
  };

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (view === 'year' && yearRefs.current[currentDate.getFullYear()]) {
      yearRefs.current[currentDate.getFullYear()].scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    }
  }, [view, currentDate]);

  const renderHeader = () => {
    const prevMonth = () => {
      const newMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1);
      if (!minDate || newMonth >= new Date(minDate)) {
        setCurrentDate(newMonth);
      }
    };

    const nextMonth = () => {
      const newMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1);
      if (!maxDate || newMonth <= new Date(maxDate)) {
        setCurrentDate(newMonth);
      }
    };

    return (
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 rounded-t-lg border-b border-gray-200">
        <button onClick={prevMonth} className="p-1 rounded-full hover:bg-gray-100 text-gray-600 hover:text-gray-900 transition-colors">
          &lt;
        </button>
        <div className="flex gap-2">
          <button onClick={() => setView('month')} className="px-3 py-1 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md">
            {months[currentDate.getMonth()]}
          </button>
          <button onClick={() => setView('year')} className="px-3 py-1 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md">
            {currentDate.getFullYear()}
          </button>
        </div>
        <button onClick={nextMonth} className="p-1 rounded-full hover:bg-gray-100 text-gray-600 hover:text-gray-900 transition-colors">
          &gt;
        </button>
      </div>
    );
  };

  const renderMonthGrid = () => (
    <div className="grid grid-cols-3 gap-3 p-4">
      {months.map((month, idx) => (
        <button
          key={month}
          onClick={() => {
            setCurrentDate(new Date(currentDate.getFullYear(), idx));
            setView('date');
          }}
          className={`py-2 text-sm rounded-md transition-colors ${
            currentDate.getMonth() === idx
              ? 'bg-blue-600 text-white font-medium'
              : 'text-gray-700 hover:bg-blue-50 font-normal'
          }`}
        >
          {month.substring(0, 3)}
        </button>
      ))}
    </div>
  );

  const renderYearGrid = () => (
    <div className="h-60 overflow-y-auto p-4">
      <div className="grid grid-cols-4 gap-3">
        {years.map((year) => {
          const isSelected = currentDate.getFullYear() === year;
          const isCurrentYear = new Date().getFullYear() === year;

          return (
            <button
              key={year}
              ref={(el) => {
                if (el) yearRefs.current[year] = el;
              }}
              onClick={() => {
                setCurrentDate(new Date(year, currentDate.getMonth()));
                setView('date');
              }}
              className={`py-2 text-sm rounded-md transition-colors ${
                isSelected
                  ? 'bg-blue-600 text-white font-medium'
                  : isCurrentYear
                  ? 'border border-blue-300 text-blue-600 font-medium'
                  : 'text-gray-700 hover:bg-blue-50 font-normal'
              }`}
            >
              {year}
            </button>
          );
        })}
      </div>
    </div>
  );

  const renderDateGrid = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    const startDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
    const days = [];

    for (let i = 0; i < startDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-8" />);
    }

    for (let i = 1; i <= daysInMonth; i++) {
      const current = new Date(currentDate.getFullYear(), currentDate.getMonth(), i);
      const today = new Date();

      const isFuture = disableFuture && current > today;
      const isTooOld = minDate && current < new Date(minDate);
      const isTooYoung = maxDate && current > new Date(maxDate);
      const isDisabled = isFuture || isTooOld || isTooYoung;

      const isSelected =
        selectedDate &&
        selectedDate.getDate() === i &&
        selectedDate.getMonth() === currentDate.getMonth() &&
        selectedDate.getFullYear() === currentDate.getFullYear();

      const isToday =
        today.getDate() === i &&
        today.getMonth() === currentDate.getMonth() &&
        today.getFullYear() === currentDate.getFullYear();

      days.push(
        <button
          key={i}
          onClick={() => !isDisabled && handleDateClick(i)}
          disabled={isDisabled}
          className={`h-8 w-8 rounded-full text-sm flex items-center justify-center transition-colors
            ${isDisabled
              ? 'text-gray-300 cursor-not-allowed'
              : isSelected
              ? 'bg-blue-600 text-white font-medium'
              : isToday
              ? 'border border-blue-300 text-blue-600 font-medium'
              : 'text-gray-700 hover:bg-blue-50 font-normal'}
          `}
        >
          {i}
        </button>
      );
    }

    return (
      <div className="p-4">
        <div className="grid grid-cols-7 gap-1 mb-2">
          {weekDays.map((day) => (
            <div key={day} className="text-center text-xs font-medium text-gray-500 h-8 flex items-center justify-center">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">{days}</div>
      </div>
    );
  };

  return (
    <div className="relative w-full">
      <div className="relative">
        <input
          type="text"
          ref={inputRef}
          value={selectedDate ? formatDate(selectedDate) : ''}
          onFocus={() => setShowCalendar(true)}
          readOnly
          className="w-full pl-3 pr-10 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer"
          placeholder="Select date"
        />
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
      </div>

      {showCalendar && (
        <div
          ref={calendarRef}
          className="absolute z-50 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden w-full max-w-xs"
        >
          {renderHeader()}
          {view === 'date' && renderDateGrid()}
          {view === 'month' && renderMonthGrid()}
          {view === 'year' && renderYearGrid()}

          <div className="flex justify-between items-center px-4 py-3 bg-gray-50 border-t border-gray-200">
            <button
              onClick={() => {
                setSelectedDate(null);
                onChange('');
                setShowCalendar(false);
              }}
              className="text-sm text-gray-600 hover:text-gray-900 px-3 py-1 rounded-md hover:bg-gray-100 transition-colors"
            >
              Clear
            </button>
            <button
              onClick={() => {
                const today = new Date();
                setCurrentDate(today);
                setSelectedDate(today);
                onChange(today.toISOString().split('T')[0]);
                setShowCalendar(false);
              }}
              className="text-sm text-blue-600 hover:text-blue-800 px-3 py-1 rounded-md hover:bg-blue-50 transition-colors"
            >
              Today
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DatePicker;




// import React, { useState, useEffect, useRef } from 'react';

// const months = [
//   'January', 'February', 'March', 'April', 'May', 'June',
//   'July', 'August', 'September', 'October', 'November', 'December'
// ];

// const weekDays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

// const getDaysInMonth = (date) => {
//   const year = date.getFullYear();
//   const month = date.getMonth();
//   return new Date(year, month + 1, 0).getDate();
// };

// const formatDate = (date) => {
//   const dd = String(date.getDate()).padStart(2, '0');
//   const mm = String(date.getMonth() + 1).padStart(2, '0');
//   const yyyy = date.getFullYear();
//   return `${dd}-${mm}-${yyyy}`;
// };

// const DatePicker = ({  value, onChange }) => {
//   const [showCalendar, setShowCalendar] = useState(false);
//   const [currentDate, setCurrentDate] = useState(value ? new Date(value) : new Date());
//   const [selectedDate, setSelectedDate] = useState(value ? new Date(value) : null);
//   const [view, setView] = useState('date');
//   const calendarRef = useRef(null);
//   const inputRef = useRef(null);
//   const yearRefs = useRef({});

//   const years = Array.from({ length: 201 }, (_, i) => new Date().getFullYear() - 100 + i);

//   const handleDateClick = (day) => {
//     const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day, 12);
//     setSelectedDate(newDate);
//     onChange(newDate.toISOString().split('T')[0]);
//     setShowCalendar(false);
//   };

//   const handleClickOutside = (e) => {
//     if (
//       calendarRef.current &&
//       !calendarRef.current.contains(e.target) &&
//       !inputRef.current.contains(e.target)
//     ) {
//       setShowCalendar(false);
//     }
//   };

//   useEffect(() => {
//     document.addEventListener('mousedown', handleClickOutside);
//     return () => document.removeEventListener('mousedown', handleClickOutside);
//   }, []);

//   useEffect(() => {
//     if (view === 'year' && yearRefs.current[currentDate.getFullYear()]) {
//       yearRefs.current[currentDate.getFullYear()].scrollIntoView({
//         behavior: 'smooth',
//         block: 'center'
//       });
//     }
//   }, [view, currentDate]);

//   const renderHeader = () => (
//     <div className="flex items-center justify-between px-4 py-3 bg-gray-50 rounded-t-lg border-b border-gray-200">
//       <button 
//         onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))}
//         className="p-1 rounded-full hover:bg-gray-100 text-gray-600 hover:text-gray-900 transition-colors"
//       >
//         <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
//           <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
//         </svg>
//       </button>
      
//       <div className="flex gap-2">
//         <button 
//           onClick={() => setView('month')} 
//           className="px-3 py-1 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
//         >
//           {months[currentDate.getMonth()]}
//         </button>
//         <button 
//           onClick={() => setView('year')} 
//           className="px-3 py-1 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
//         >
//           {currentDate.getFullYear()}
//         </button>
//       </div>
      
//       <button 
//         onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))}
//         className="p-1 rounded-full hover:bg-gray-100 text-gray-600 hover:text-gray-900 transition-colors"
//       >
//         <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
//           <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
//         </svg>
//       </button>
//     </div>
//   );

//   const renderMonthGrid = () => (
//     <div className="grid grid-cols-3 gap-3 p-4">
//       {months.map((month, idx) => (
//         <button
//           key={month}
//           onClick={() => {
//             setCurrentDate(new Date(currentDate.getFullYear(), idx));
//             setView('date');
//           }}
//           className={`py-2 text-sm rounded-md transition-colors ${
//             currentDate.getMonth() === idx 
//               ? 'bg-blue-600 text-white font-medium' 
//               : 'text-gray-700 hover:bg-blue-50 font-normal'
//           }`}
//         >
//           {month.substring(0, 3)}
//         </button>
//       ))}
//     </div>
//   );

//   const renderYearGrid = () => (
//     <div className="h-60 overflow-y-auto p-4">
//       <div className="grid grid-cols-4 gap-3">
//         {years.map((year) => {
//           const isSelected = currentDate.getFullYear() === year;
//           const isCurrentYear = new Date().getFullYear() === year;
          
//           return (
//             <button
//               key={year}
//               ref={(el) => {
//                 if (el) yearRefs.current[year] = el;
//               }}
//               onClick={() => {
//                 setCurrentDate(new Date(year, currentDate.getMonth()));
//                 setView('date');
//               }}
//               className={`py-2 text-sm rounded-md transition-colors ${
//                 isSelected 
//                   ? 'bg-blue-600 text-white font-medium' 
//                   : isCurrentYear 
//                     ? 'border border-blue-300 text-blue-600 font-medium' 
//                     : 'text-gray-700 hover:bg-blue-50 font-normal'
//               }`}
//             >
//               {year}
//             </button>
//           );
//         })}
//       </div>
//     </div>
//   );

//   const renderDateGrid = () => {
//     const daysInMonth = getDaysInMonth(currentDate);
//     const startDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
//     const days = [];

//     // Empty slots before the 1st of the month
//     for (let i = 0; i < startDay; i++) {
//       days.push(<div key={`empty-${i}`} className="h-8" />);
//     }

//     // Actual days
//     for (let i = 1; i <= daysInMonth; i++) {
//       const isSelected =
//         selectedDate &&
//         selectedDate.getDate() === i &&
//         selectedDate.getMonth() === currentDate.getMonth() &&
//         selectedDate.getFullYear() === currentDate.getFullYear();

//       const isToday =
//         new Date().getDate() === i &&
//         new Date().getMonth() === currentDate.getMonth() &&
//         new Date().getFullYear() === currentDate.getFullYear();

//       days.push(
//         <button
//           key={i}
//           onClick={() => handleDateClick(i)}
//           className={`h-8 w-8 rounded-full text-sm flex items-center justify-center transition-colors ${
//             isSelected 
//               ? 'bg-blue-600 text-white font-medium' 
//               : isToday 
//                 ? 'border border-blue-300 text-blue-600 font-medium' 
//                 : 'text-gray-700 hover:bg-blue-50 font-normal'
//           }`}
//         >
//           {i}
//         </button>
//       );
//     }

//     return (
//       <div className="p-4">
//         <div className="grid grid-cols-7 gap-1 mb-2">
//           {weekDays.map((day) => (
//             <div key={day} className="text-center text-xs font-medium text-gray-500 h-8 flex items-center justify-center">
//               {day}
//             </div>
//           ))}
//         </div>
//         <div className="grid grid-cols-7 gap-1">
//           {days}
//         </div>
//       </div>
//     );
//   };

//   return (
//     <div className="relative w-full">
    
//       <div className="relative">
//         <input
//           type="text"
//           ref={inputRef}
//           value={selectedDate ? formatDate(selectedDate) : ''}
//           onFocus={() => setShowCalendar(true)}
//           readOnly
//           className="w-full pl-3 pr-10 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer"
//           placeholder="Select date"
//         />
//         <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
//           <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
//             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
//           </svg>
//         </div>
//       </div>
      
//       {showCalendar && (
//         <div
//           ref={calendarRef}
//           className="absolute z-50 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden w-full max-w-xs"
//         >
//           {renderHeader()}
//           {view === 'date' && renderDateGrid()}
//           {view === 'month' && renderMonthGrid()}
//           {view === 'year' && renderYearGrid()}
          
//           <div className="flex justify-between items-center px-4 py-3 bg-gray-50 border-t border-gray-200">
//             <button
//               onClick={() => {
//                 setSelectedDate(null);
//                 onChange('');
//                 setShowCalendar(false);
//               }}
//               className="text-sm text-gray-600 hover:text-gray-900 px-3 py-1 rounded-md hover:bg-gray-100 transition-colors"
//             >
//               Clear
//             </button>
//             <button
//               onClick={() => {
//                 const today = new Date();
//                 setCurrentDate(today);
//                 setSelectedDate(today);
//                 onChange(today.toISOString().split('T')[0]);
//                 setShowCalendar(false);
//               }}
//               className="text-sm text-blue-600 hover:text-blue-800 px-3 py-1 rounded-md hover:bg-blue-50 transition-colors"
//             >
//               Today
//             </button>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// };

// export default DatePicker;