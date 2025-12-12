export const validateStep = (step, formData) => {
  const errors = {};

  // Regex definitions (commented out unused ones)
  // const phoneRegex = /^[6-9]\d{9}$/; // 10-digit Indian mobile number starting with 6-9
  // const phoneRegex = /^(?:\+91|0)?[6-9]\d{9}$/;
  // const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
  // const nameRegex = /^[a-zA-Z\s]+$/;
  // const usernameRegex = /^[a-zA-Z0-9_.-@]+$/;// Allows letters, numbers, underscores, hyphens, and dots
  // const strongPassword = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/; // At least one lowercase, one uppercase, one digit, and 8+ characters
  const maxFileSize = 2 * 1024 * 1024; // 2MB
  // const ctcRegex = /^\d{5,7}$/; // 5 to 7 digit number for CTC

  // Helper function to validate dates
  const isValidDate = (dateString) => !isNaN(Date.parse(dateString));

  /**
   * Validates a single form field based on provided rules.
   * @param {string} fieldName - The human-readable name of the field (for error messages).
   * @param {*} value - The actual value of the field from formData.
   * @param {Object} validationRules - An object containing validation rules (e.g., required, pattern, minLength).
   * @returns {string | undefined} An error message if validation fails, otherwise undefined.
   */
  // eslint-disable-next-line no-unused-vars
  const validateField = (fieldName, value, validationRules) => {
    // If the field isn't explicitly required and is empty or null, skip validation.
    // This allows optional fields to remain empty without triggering validation errors.
    if (
      !validationRules.required &&
      (value === undefined ||
        value === null ||
        (typeof value === 'string' && value.trim() === ''))
    ) {
      return;
    }

    const trimmedValue = typeof value === 'string' ? value.trim() : value;
    const isEmpty =
      typeof trimmedValue === 'string' ? trimmedValue === '' : false;

    if (validationRules.required && isEmpty) {
      return `${fieldName} is required.`;
    }

    if (
      validationRules.pattern &&
      !validationRules.pattern.test(trimmedValue)
    ) {
      return validationRules.message || `Invalid ${fieldName} format.`;
    }

    if (
      validationRules.minLength &&
      typeof trimmedValue === 'string' &&
      trimmedValue.length < validationRules.minLength
    ) {
      return `${fieldName} must be at least ${validationRules.minLength} characters.`;
    }

    if (
      validationRules.maxLength &&
      typeof trimmedValue === 'string' &&
      trimmedValue.length > validationRules.maxLength
    ) {
      return `${fieldName} must be at most ${validationRules.maxLength} characters.`;
    }

    // Custom rule to check if a field's value matches another field's value (e.g., confirm password)
    if (
      validationRules.equals &&
      trimmedValue !== formData[validationRules.equals]
    ) {
      return (
        validationRules.message ||
        `${fieldName} must match ${validationRules.equals}.`
      );
    }

    // Custom rule for date validation
    if (validationRules.isDate && !isValidDate(trimmedValue)) {
      return `Invalid ${fieldName} date format.`;
    }

    // Custom rule for file size validation
    if (
      validationRules.isFile &&
      value instanceof File &&
      value.size > maxFileSize
    ) {
      return `${fieldName} must be less than 2MB.`;
    }

    return undefined; // No error
  };

  // --- Step-wise Validation Logic ---
  // switch (step) {
  //   case 1: // Basic Info
  //     errors.firstName = validateField('First name', formData.firstName, {
  //       required: true,
  //       pattern: nameRegex,
  //       message: 'Only letters and spaces allowed.'
  //     });

  //     errors.lastName = validateField('Last name', formData.lastName, {
  //       pattern: nameRegex,
  //       message: 'Only letters and spaces allowed.'
  //     });

  //     errors.phone1 = validateField('Phone number', formData.phone1, {
  //       required: true,
  //       pattern: phoneRegex,
  //       message: 'Enter a valid 10-digit phone number (starts with 6-9).'
  //     });

  //     errors.officialEmail = validateField('Official email', formData.officialEmail, {
  //       required: true,
  //       pattern: emailRegex,
  //       message: 'Enter a valid email address.'
  //     });

  //     errors.password = validateField('Password', formData.password, {
  //       required: true,
  //       pattern: strongPassword,
  //       message: 'Password must include at least one uppercase letter, one lowercase letter, one number, and be 8+ characters long.'
  //     });

  //     errors.branch = validateField('Branch', formData.branch, {
  //       required: true,
  //       message: 'Branch selection is required.'
  //     });
  //     break;

  //   case 2: // Personal Details
  //     errors.dateOfBirth = validateField('Date of birth', formData.dateOfBirth, {
  //       required: true,
  //       isDate: true,
  //       message: 'Please enter a valid date of birth.'
  //     });

  //     errors.gender = validateField('Gender', formData.gender, {
  //       required: true,
  //       message: 'Gender selection is required.'
  //     });

  //     errors.permanentAddress = validateField('Permanent address', formData.permanentAddress, {
  //       required: true,
  //       message: 'Permanent address is required.'
  //     });

  //     errors.emergencyContact1Name = validateField('Emergency contact name', formData.emergencyContact1Name, {
  //       required: true,
  //       pattern: nameRegex,
  //       message: 'Only letters and spaces allowed.'
  //     });

  //     errors.emergencyContact1Phone = validateField('Emergency contact phone', formData.emergencyContact1Phone, {
  //       required: true,
  //       pattern: phoneRegex,
  //       message: 'Enter a valid 10-digit phone number (starts with 6-9).'
  //     });
  //     break;

  //   case 3: // Education & Experience
  //     errors.degree = validateField('Highest degree', formData.degree, {
  //       required: true,
  //       message: 'Highest degree is required.'
  //     });

  //     errors.yearsOfExperience = validateField('Years of experience', formData.yearsOfExperience, {
  //       required: true,
  //       message: 'Years of experience is required.'
  //     });
  //     break;

  //   case 4: // Job Details
  //     errors.position = validateField('Position', formData.position, {
  //       required: true,
  //       message: 'Position is required.'
  //     });

  //     errors.department = validateField('Department', formData.department, {
  //       required: true,
  //       message: 'Department is required.'
  //     });

  //     errors.ctc = validateField('CTC', formData.ctc, {
  //       required: true,
  //       pattern: ctcRegex,
  //       message: 'CTC must be a 5 to 7 digit number.'
  //     });

  //     errors.joiningDate = validateField('Joining date', formData.joiningDate, {
  //       required: true,
  //       isDate: true,
  //       message: 'Please enter a valid joining date.'
  //     });

  //     errors.level = validateField('Level', formData.level, {
  //       required: true,
  //       message: 'Level selection is required.'
  //     });
  //     break;

  //   case 5: // Extra Information
  //     // Optional validations for banking and additional fields
  //     if (formData.officialEmail) {
  //       errors.officialEmail = validateField('Official email', formData.officialEmail, {
  //         pattern: emailRegex,
  //         message: 'Enter a valid email address.'
  //       });
  //     }

  //     if (formData.personalEmail) {
  //       errors.personalEmail = validateField('Personal email', formData.personalEmail, {
  //         pattern: emailRegex,
  //         message: 'Enter a valid email address.'
  //       });
  //     }
  //     break;

  //   default:
  //     break;
  // }

  // Remove undefined errors (for fields that passed validation)
  return Object.fromEntries(
    Object.entries(errors).filter(([, value]) => value !== undefined)
  );
};

export const isStepValid = (step, formData) => {
  const errors = validateStep(step, formData);
  return Object.keys(errors).length === 0;
};
