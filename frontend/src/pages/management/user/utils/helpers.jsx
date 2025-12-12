export const formatCurrency = (amount) => {
  if (!amount) return '₹0';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
  }).format(amount);
};

export const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  try {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch (error) {
    console.error('Invalid date string:', dateString, error);
    return 'Invalid Date';
  }
};

export const displayDate = (dateString) => {
  if (!dateString) return 'N/A';
  try {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch (error) {
    console.error('Invalid date string:', dateString, error);
    return 'Invalid Date';
  }
};

export const calculateAge = (dob) => {
  if (!dob) return '';
  const birthDate = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
};

export const calculateWorkDuration = (joiningDate) => {
  if (!joiningDate) return 'N/A';

  try {
    const joinDate = new Date(joiningDate);
    const currentDate = new Date();
    const diffTime = currentDate - joinDate;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    const years = currentDate.getFullYear() - joinDate.getFullYear();
    const months = currentDate.getMonth() - joinDate.getMonth() + years * 12;
    const days = currentDate.getDate() - joinDate.getDate();

    let adjustedMonths = months;
    let adjustedDays = days;
    if (days < 0) {
      const lastMonthDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 0);
      adjustedDays = lastMonthDate.getDate() + days;
      adjustedMonths--;
    }

    if (adjustedMonths > 0) {
      return `${adjustedMonths} month${adjustedMonths !== 1 ? 's' : ''} ${adjustedDays} day${adjustedDays !== 1 ? 's' : ''}`;
    } else {
      return `${diffDays} day${diffDays !== 1 ? 's' : ''}`;
    }
  } catch (error) {
    console.error('Invalid date string:', joiningDate, error);
    return 'Invalid Date';
  }
};

export const getBadgeColor = (workMode) => {
  switch (workMode) {
    case 'Remote':
      return 'bg-green-100 text-green-800';
    case 'On-site':
      return 'bg-blue-100 text-blue-800';
    case 'Hybrid':
      return 'bg-purple-100 text-purple-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};