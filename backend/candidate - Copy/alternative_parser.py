import os
import re
import PyPDF2
from typing import Dict, Any, Optional

# Handle docx import with fallback
try:
    from docx import Document
    DOCX_AVAILABLE = True
except ImportError:
    try:
        import python_docx
        from python_docx import Document
        DOCX_AVAILABLE = True
    except ImportError:
        DOCX_AVAILABLE = False
        Document = None

# Optional support for old .doc files
try:
    import textract
    TEXTRACT_AVAILABLE = True
except ImportError:
    TEXTRACT_AVAILABLE = False

# -------------------- TEXT EXTRACTION --------------------

def extract_text_from_pdf(pdf_path: str) -> str:
    try:
        with open(pdf_path, 'rb') as file:
            pdf_reader = PyPDF2.PdfReader(file)
            text = ""
            for page in pdf_reader.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"
        return text
    except Exception as e:

        return ""

def extract_text_from_docx(docx_path: str) -> str:
    if not DOCX_AVAILABLE:

        return ""
    try:
        doc = Document(docx_path)
        text = ""
        for paragraph in doc.paragraphs:
            text += paragraph.text + "\n"
        return text
    except Exception as e:

        return ""

def extract_text_from_doc(doc_path: str) -> str:
    if not TEXTRACT_AVAILABLE:

        return ""
    try:
        return textract.process(doc_path).decode("utf-8")
    except Exception as e:

        return ""

# -------------------- FIELD EXTRACTION --------------------

def extract_email(text: str) -> Optional[str]:
    pattern = r'[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}'
    match = re.search(pattern, text)
    return match.group().lower() if match else None

def extract_phone(text: str) -> Optional[str]:
    phone_patterns = [
        r'\b\d{10}\b',                           # 10-digit
        r'\+\d{1,3}[-\s]?\d{10,12}\b',           # +91 9876543210
        r'\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}'   # (123) 456-7890
    ]
    for pattern in phone_patterns:
        match = re.search(pattern, text)
        if match:
            return match.group()
    return None

def extract_name(text: str) -> Optional[str]:
    lines = text.split("\n")
    for line in lines[:10]:
        line = line.strip()
        if line and len(line) < 50 and re.match(r'^[A-Za-z\s\.\-]+$', line):
            if not any(x in line.lower() for x in ['resume', 'cv', 'objective']):
                return line
    return None

def extract_dob(text: str) -> Optional[str]:
    patterns = [
        r'\b\d{2}[/-]\d{2}[/-]\d{4}\b',     # 10/07/1995 or 14-11-1986
        r'\b\d{1,2}\s+[A-Za-z]+\s+\d{4}\b'  # 10 July 1995
    ]
    for pat in patterns:
        match = re.search(pat, text)
        if match:
            return match.group()
    return None

def extract_pincode(text: str) -> Optional[str]:
    match = re.search(r'\b\d{6}\b', text)
    return match.group() if match else None

def extract_state(text: str) -> Optional[str]:
    states = [
        'andhra pradesh', 'arunachal pradesh', 'assam', 'bihar', 'chhattisgarh',
        'goa', 'gujarat', 'haryana', 'himachal pradesh', 'jharkhand', 'karnataka',
        'kerala', 'madhya pradesh', 'maharashtra', 'manipur', 'meghalaya', 'mizoram',
        'nagaland', 'odisha', 'punjab', 'rajasthan', 'sikkim', 'tamil nadu',
        'telangana', 'tripura', 'uttar pradesh', 'uttarakhand', 'west bengal',
        'delhi', 'puducherry', 'chandigarh', 'dadra and nagar haveli', 'daman and diu',
        'lakshadweep', 'andaman and nicobar islands', 'jammu and kashmir', 'ladakh'
    ]
    for state in states:
        pattern = r'\b' + re.escape(state) + r'\b'
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            return state.title()

    state_abbr = {
        'ap': 'Andhra Pradesh', 'ar': 'Arunachal Pradesh', 'as': 'Assam', 'br': 'Bihar',
        'cg': 'Chhattisgarh', 'ga': 'Goa', 'gj': 'Gujarat', 'hr': 'Haryana',
        'hp': 'Himachal Pradesh', 'jh': 'Jharkhand', 'ka': 'Karnataka', 'kl': 'Kerala',
        'mp': 'Madhya Pradesh', 'mh': 'Maharashtra', 'mn': 'Manipur', 'ml': 'Meghalaya',
        'mz': 'Mizoram', 'nl': 'Nagaland', 'or': 'Odisha', 'pb': 'Punjab',
        'rj': 'Rajasthan', 'sk': 'Sikkim', 'tn': 'Tamil Nadu', 'tg': 'Telangana',
        'tr': 'Tripura', 'up': 'Uttar Pradesh', 'uk': 'Uttarakhand', 'wb': 'West Bengal'
    }
    for abbr, full_name in state_abbr.items():
        pattern = r'\b' + abbr.upper() + r'\b'
        if re.search(pattern, text, re.IGNORECASE):
            return full_name
    return None

def extract_city(text: str) -> Optional[str]:
    cities = ['mumbai', 'delhi', 'bangalore', 'hyderabad', 'ahmedabad', 'chennai',
              'kolkata', 'surat', 'pune', 'jaipur', 'lucknow', 'kanpur', 'nagpur',
              'indore', 'thane', 'bhopal', 'visakhapatnam', 'patna', 'vadodara',
              'ludhiana', 'agra', 'nashik', 'faridabad', 'meerut', 'rajkot', 'varanasi']
    for city in cities:
        pattern = r'\b' + re.escape(city) + r'\b'
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            return city.title()
    return None

def extract_gender(text: str) -> Optional[str]:
    if re.search(r'\bmale\b', text, re.I):
        return "Male"
    if re.search(r'\bfemale\b', text, re.I):
        return "Female"
    return None

def extract_languages(text: str) -> list:
    keywords = [
        'english', 'tamil', 'telugu', 'hindi', 'kannada', 'malayalam', 'marathi',
        'gujarati', 'punjabi', 'bengali', 'urdu', 'french', 'german', 'spanish',
        'chinese', 'japanese'
    ]
    found = [lang.title() for lang in keywords if lang in text.lower()]
    return list(set(found))

def extract_skills(text: str) -> list:
    keywords = [
        'python', 'java', 'c++', 'c#', 'react', 'angular', 'django', 'flask',
        'sql', 'mysql', 'postgresql', 'mongodb', 'aws', 'azure', 'docker',
        'kubernetes', 'html', 'css', 'js', 'photoshop', 'illustrator',
        'excel', 'word', 'powerpoint', 'ms office'
    ]
    found = [skill.title() for skill in keywords if skill in text.lower()]
    return list(set(found))

def extract_education(text: str) -> dict:
    education_mapping = {
        # Post Graduate (PG)
        'phd': {'level': 'PG', 'priority': 4, 'qualification': 'PhD'},
        'ph.d': {'level': 'PG', 'priority': 4, 'qualification': 'PhD'},
        'doctorate': {'level': 'PG', 'priority': 4, 'qualification': 'PhD'},
        'mba': {'level': 'PG', 'priority': 3, 'qualification': 'MBA'},
        'm.tech': {'level': 'PG', 'priority': 3, 'qualification': 'M.Tech'},
        'mtech': {'level': 'PG', 'priority': 3, 'qualification': 'M.Tech'},
        'm.e': {'level': 'PG', 'priority': 3, 'qualification': 'M.E'},
        'mca': {'level': 'PG', 'priority': 3, 'qualification': 'MCA'},
        'msc': {'level': 'PG', 'priority': 3, 'qualification': 'M.Sc'},
        'ma': {'level': 'PG', 'priority': 3, 'qualification': 'MA'},
        'mcom': {'level': 'PG', 'priority': 3, 'qualification': 'M.Com'},

        # Under Graduate (UG)
        'b.tech': {'level': 'UG', 'priority': 2, 'qualification': 'B.Tech'},
        'btech': {'level': 'UG', 'priority': 2, 'qualification': 'B.Tech'},
        'b.e': {'level': 'UG', 'priority': 2, 'qualification': 'B.E'},
        'be': {'level': 'UG', 'priority': 2, 'qualification': 'B.E'},
        'bca': {'level': 'UG', 'priority': 2, 'qualification': 'BCA'},
        'bsc': {'level': 'UG', 'priority': 2, 'qualification': 'B.Sc'},
        'ba': {'level': 'UG', 'priority': 2, 'qualification': 'BA'},
        'bcom': {'level': 'UG', 'priority': 2, 'qualification': 'B.Com'},
        'degree': {'level': 'UG', 'priority': 2, 'qualification': 'Degree'},
        'graduation': {'level': 'UG', 'priority': 2, 'qualification': 'Graduation'},

        # Higher Secondary
        'hsc': {'level': 'HSC', 'priority': 1, 'qualification': 'HSC'},
        'intermediate': {'level': 'HSC', 'priority': 1, 'qualification': 'Intermediate'},
        '12th': {'level': 'HSC', 'priority': 1, 'qualification': '12th'},
        'plus two': {'level': 'HSC', 'priority': 1, 'qualification': '+2'},
        '+2': {'level': 'HSC', 'priority': 1, 'qualification': '+2'},

        # Secondary
        'ssc': {'level': 'SSC', 'priority': 0, 'qualification': 'SSC'},
        '10th': {'level': 'SSC', 'priority': 0, 'qualification': '10th'},
        'matriculation': {'level': 'SSC', 'priority': 0, 'qualification': 'Matriculation'},
    }

    lines = text.split("\n")
    found_qualifications = []

    for line in lines:
        line_lower = line.lower().strip()
        if not line_lower:
            continue
        for keyword, info in education_mapping.items():
            pattern = r'\b' + re.escape(keyword) + r'\b'
            if re.search(pattern, line_lower, re.IGNORECASE):
                found_qualifications.append({
                    'keyword': keyword,
                    'level': info['level'],
                    'priority': info['priority'],
                    'qualification': info['qualification'],
                    'line': line.strip()
                })

    if not found_qualifications:
        return {}

    # Deduplicate and prioritize
    unique_qualifications = {}
    for qual in found_qualifications:
        key = qual['qualification']
        if key not in unique_qualifications or qual['priority'] > unique_qualifications[key]['priority']:
            unique_qualifications[key] = qual

    final_qualifications = list(unique_qualifications.values())
    final_qualifications.sort(key=lambda x: x['priority'], reverse=True)

    highest_qualification = final_qualifications[0]
    return {
        "qualification": highest_qualification['qualification'],
        "level": highest_qualification['level']
    }

def extract_experience(text: str) -> dict:
    experience_info = {
        "total_experience": None,
        "companies": [],
        "designations": [],
        "details": []
    }

    lines = text.split("\n")
    exp_pattern = re.compile(
        r'(?:(\d+)\s*(?:years?|yrs?))?(?:\s*(\d+)\s*months?)?\s*of experience in\s+([A-Za-z&.\s]+?)\s+as\s+(.*?)(?=$|\n|\d+\s*months|\d+\s*years)',
        re.IGNORECASE
    )

    total_months = 0
    for line in lines:
        match = exp_pattern.search(line)
        if match:
            years = int(match.group(1)) if match.group(1) else 0
            months = int(match.group(2)) if match.group(2) else 0
            company = match.group(3).strip()
            designation = match.group(4).strip()

            if company and company not in experience_info["companies"]:
                experience_info["companies"].append(company)
            if designation and designation not in experience_info["designations"]:
                experience_info["designations"].append(designation)

            total_months += years * 12 + months
            experience_info["details"].append({
                "company": company,
                "designation": designation,
                "duration": f"{years} years {months} months".strip()
            })

    if total_months > 0:
        experience_info["total_experience"] = f"{total_months//12} years {total_months%12} months"

    return experience_info

# -------------------- MAIN PARSER --------------------

def alternative_parse_resume(file_path: str) -> Dict[str, Any]:
    try:
        if file_path.lower().endswith(".pdf"):
            text = extract_text_from_pdf(file_path)
        elif file_path.lower().endswith(".docx"):
            text = extract_text_from_docx(file_path)
        elif file_path.lower().endswith(".doc"):
            text = extract_text_from_doc(file_path)
        else:
            return {"success": False, "error": "Unsupported file format"}

        if not text.strip():
            return {"success": False, "error": "No text extracted"}

        parsed_data = {
            "name": extract_name(text),
            "email": extract_email(text),
            "phone": extract_phone(text),
            "dob": extract_dob(text),
            "gender": extract_gender(text),
            "pincode": extract_pincode(text),
            "state": extract_state(text),
            "city": extract_city(text),
            "skills": extract_skills(text),
            "languages": extract_languages(text),
            "education": extract_education(text),
            "experience": extract_experience(text),
            "raw_text": text
        }
        return {"success": True, "data": parsed_data}

    except Exception as e:
        return {"success": False, "error": str(e)}
