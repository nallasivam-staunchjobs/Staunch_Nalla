import React from 'react';

const Loading = ({ message = 'Loading...', size = 'default' }) => {
  // Size variants
  const sizeClasses = {
    small: 'h-8 w-8 border-2',
    default: 'h-16 w-16 border-4',
    large: 'h-24 w-24 border-4'
  };

  const textSizeClasses = {
    small: 'text-sm',
    default: 'text-lg',
    large: 'text-xl'
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white bg-opacity-90 backdrop-blur-sm">
      <div 
        className={`animate-spin rounded-full ${sizeClasses[size]} border-t-blue-600 border-b-blue-600 border-l-transparent border-r-transparent mb-4`}
      ></div>
      <p className={`text-gray-600 ${textSizeClasses[size]} font-medium`}>
        {message}
      </p>
    </div>
  );
};

export default Loading;
