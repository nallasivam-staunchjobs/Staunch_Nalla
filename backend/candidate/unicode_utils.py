"""
Unicode sanitization utilities for handling special characters in text data.
Prevents ASCII encoding errors by converting Unicode characters to ASCII equivalents.
"""

import unicodedata
import re

def sanitize_unicode_text(text):
    """
    Sanitize Unicode text by converting special characters to ASCII equivalents.

    Args:
        text (str): Input text that may contain Unicode characters

    Returns:
        str: Sanitized text with ASCII-safe characters
    """
    if not text or not isinstance(text, str):
        return text

    # Dictionary of common Unicode characters to ASCII replacements
    unicode_replacements = {
        # Smart quotes
        '\u201c': '"',  # Left double quotation mark
        '\u201d': '"',  # Right double quotation mark
        '\u2018': "'",  # Left single quotation mark
        '\u2019': "'",  # Right single quotation mark

        # Dashes
        '\u2013': '-',  # En dash
        '\u2014': '--', # Em dash
        '\u2015': '--', # Horizontal bar

        # Spaces
        '\u00a0': ' ',  # Non-breaking space
        '\u2000': ' ',  # En quad
        '\u2001': ' ',  # Em quad
        '\u2002': ' ',  # En space
        '\u2003': ' ',  # Em space
        '\u2004': ' ',  # Three-per-em space
        '\u2005': ' ',  # Four-per-em space
        '\u2006': ' ',  # Six-per-em space
        '\u2007': ' ',  # Figure space
        '\u2008': ' ',  # Punctuation space
        '\u2009': ' ',  # Thin space
        '\u200a': ' ',  # Hair space

        # Other common characters
        '\u2026': '...',  # Horizontal ellipsis
        '\u00b7': '*',    # Middle dot
        '\u2022': '*',    # Bullet
        '\u25cf': '*',    # Black circle
        '\u00ae': '(R)',  # Registered sign
        '\u00a9': '(C)',  # Copyright sign
        '\u2122': '(TM)', # Trade mark sign
    }

    # Replace known Unicode characters
    sanitized_text = text
    for unicode_char, ascii_replacement in unicode_replacements.items():
        sanitized_text = sanitized_text.replace(unicode_char, ascii_replacement)

    # Normalize Unicode characters to their closest ASCII equivalents
    try:
        # NFD normalization decomposes characters
        normalized = unicodedata.normalize('NFD', sanitized_text)
        # Filter out non-ASCII characters, keeping only ASCII equivalents
        ascii_text = ''.join(char for char in normalized if ord(char) < 128)
        return ascii_text
    except Exception as e:}, error: {e}")
        # Fallback: remove all non-ASCII characters
        return re.sub(r'[^\x00-\x7F]+', '', sanitized_text)

def sanitize_dict_values(data_dict):
    """
    Recursively sanitize all string values in a dictionary.

    Args:
        data_dict (dict): Dictionary with potentially Unicode string values

    Returns:
        dict: Dictionary with sanitized ASCII-safe string values
    """
    if not isinstance(data_dict, dict):
        return data_dict

    sanitized_dict = {}
    for key, value in data_dict.items():
        if isinstance(value, str):
            sanitized_dict[key] = sanitize_unicode_text(value)
        elif isinstance(value, dict):
            sanitized_dict[key] = sanitize_dict_values(value)
        elif isinstance(value, list):
            sanitized_dict[key] = [
                sanitize_unicode_text(item) if isinstance(item, str)
                else sanitize_dict_values(item) if isinstance(item, dict)
                else item
                for item in value
            ]
        else:
            sanitized_dict[key] = value

    return sanitized_dict

def safe_str_conversion(obj):
    """
    Safely convert an object to string, handling Unicode characters.

    Args:
        obj: Any object that needs to be converted to string

    Returns:
        str: ASCII-safe string representation
    """
    try:
        if isinstance(obj, str):
            return sanitize_unicode_text(obj)
        else:
            # Convert to string first, then sanitize
            str_obj = str(obj)
            return sanitize_unicode_text(str_obj)
    except Exception as e:}, error: {e}")
        return "Error converting to string"

# Test function to verify sanitization works
def test_unicode_sanitization():
    """Test function to verify Unicode sanitization works correctly."""
    test_cases = [
        # Smart quotes
        'This is "quoted text" with smart quotes',
        'Another \'single quoted\' example',

        # Mixed Unicode
        'Profile assigned from "John Doe" to "Jane Smith"',
        'Call status: "answered" - follow up needed',
        'Notes: Client said "interested"... will call back',

        # Edge cases
        '',
        None,
        123,
        ['list', 'with', '"unicode"'],
    ]

    for i, test_text in enumerate(test_cases, 1):
        try:
            result = sanitize_unicode_text(test_text)} → {repr(result)}")
        except Exception as e:} → Error: {e}")

    # Test dictionary sanitization
    test_dict = {
        'feedback_text': 'Profile assigned from "John" to "Jane"',
        'remarks': 'Client said "interested"',
        'notes': 'Follow up needed – urgent',
        'number': 123,
        'nested': {
            'text': 'More "unicode" text',
            'value': 456
        }
    }

    sanitized_dict = sanitize_dict_values(test_dict)

