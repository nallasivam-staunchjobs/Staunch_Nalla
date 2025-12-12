const PasswordStrengthIndicator = ({ password }) => {
  const getStrength = (password) => {
    if (!password) return { score: 0, text: '', color: '' };

    let score = 0;
    if (password.length >= 8) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    const levels = [
      { text: 'Very Weak', color: '#ef4444' },  // red-500
      { text: 'Weak', color: '#f97316' },       // orange-500
      { text: 'Fair', color: '#fb923c' },       // orange-400
      { text: 'Good', color: '#4ade80' },       // green-400
      { text: 'Strong', color: '#22c55e' },     // green-500
    ];

    const clampedScore = Math.min(score, levels.length - 1);
    return { score, ...levels[clampedScore] };
  };

  const strength = getStrength(password);

  if (!password) return null;

  return (
    <div className="mt-2">
      <div className="flex items-center space-x-2">
        <div className="flex-1 bg-gray-200 rounded-full">
          <div
            className="h-[5px] rounded-full transition-all"
            style={{
              width: `${(strength.score / 5) * 100}%`,
              backgroundColor: strength.color,
            }}
          />
        </div>
        <span className="text-xs text-gray-600">{strength.text}</span>
      </div>
      <p className="sr-only" aria-live="polite">
        Password strength: {strength.text}
      </p>
    </div>
  );
};

export default PasswordStrengthIndicator;
