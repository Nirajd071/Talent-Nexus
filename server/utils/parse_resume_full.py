#!/usr/bin/env python3
"""
Comprehensive Resume Parser
Extracts all sections: education, experience, skills, projects, certifications
Returns structured JSON output

Usage: python parse_resume_full.py <pdf_file_path>
Returns: JSON to stdout
"""

import sys
import json
import re
from pypdf import PdfReader
import io

# Configure stdout/stderr for UTF-8
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

# Skill keywords for extraction
SKILL_KEYWORDS = [
    # Languages
    'python', 'java', 'javascript', 'typescript', 'c++', 'c#', 'c', 'ruby', 'go', 'rust', 'kotlin', 'swift', 'php', 'scala', 'perl', 'r',
    # Web
    'html', 'css', 'react', 'angular', 'vue', 'node', 'express', 'django', 'flask', 'spring', 'nextjs', 'nestjs',
    # ML/AI
    'machine learning', 'deep learning', 'tensorflow', 'pytorch', 'keras', 'scikit-learn', 'pandas', 'numpy', 'matplotlib', 'seaborn',
    'nlp', 'computer vision', 'neural networks', 'cnn', 'rnn', 'lstm', 'transformer',
    # Databases
    'sql', 'mysql', 'postgresql', 'mongodb', 'redis', 'elasticsearch', 'cassandra', 'dynamodb', 'firebase',
    # Cloud/DevOps
    'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'jenkins', 'terraform', 'ansible', 'linux', 'git', 'github', 'gitlab',
    'ci/cd', 'microservices', 'rest api', 'graphql',
    # Tools
    'power bi', 'tableau', 'excel', 'jupyter', 'vs code', 'beautifulsoup', 'selenium',
    # Data
    'data science', 'data analytics', 'data engineering', 'etl', 'data visualization', 'statistics',
    # Other
    'agile', 'scrum', 'jira', 'figma', 'photoshop'
]

def extract_text_from_pdf(pdf_path):
    """Extract text from PDF using pypdf"""
    with open(pdf_path, 'rb') as file:
        pdf_reader = PdfReader(file)
        text = ""
        for page in pdf_reader.pages:
            text += page.extract_text(extraction_mode="layout") + "\n"
    return text

def extract_email(text):
    """Extract email from text"""
    pattern = r'[\w.+-]+@[\w.-]+\.[a-zA-Z]{2,}'
    match = re.search(pattern, text)
    return match.group(0) if match else None

def extract_phone(text):
    """Extract phone number"""
    patterns = [
        r'\+?\d{1,3}[-.\s]?\d{3,4}[-.\s]?\d{3,4}[-.\s]?\d{3,4}',
        r'\d{10,12}'
    ]
    for pattern in patterns:
        match = re.search(pattern, text)
        if match:
            return match.group(0).strip()
    return None

def extract_name(text):
    """Extract name (usually first line)"""
    lines = [l.strip() for l in text.split('\n') if l.strip()]
    if lines:
        first_line = lines[0]
        # Check if it looks like a name
        if len(first_line) < 50 and re.match(r'^[A-Za-z\s.\'-]+$', first_line):
            return first_line
    return None

def extract_skills(text):
    """Extract skills from resume text"""
    text_lower = text.lower()
    found_skills = []
    
    for skill in SKILL_KEYWORDS:
        # Use word boundary matching
        pattern = r'\b' + re.escape(skill) + r'\b'
        if re.search(pattern, text_lower):
            found_skills.append(skill)
    
    return list(set(found_skills))

def extract_section(text, section_names):
    """Extract content of a section"""
    text_upper = text.upper()
    content = ""
    
    for section_name in section_names:
        pattern = rf'{section_name}\s*[:\n]?(.*?)(?=\n[A-Z]{{2,}}[:\s]|\Z)'
        match = re.search(pattern, text_upper, re.DOTALL)
        if match:
            # Get original case content
            start = match.start(1)
            end = match.end(1)
            content = text[start:end].strip()
            break
    
    return content

def extract_education(text):
    """Extract education information"""
    education = []
    section = extract_section(text, ['EDUCATION', 'ACADEMIC', 'QUALIFICATION'])
    
    if section:
        # Try to find degree patterns
        lines = [l.strip() for l in section.split('\n') if l.strip()]
        current_edu = {}
        
        for line in lines:
            # Look for degree keywords
            if any(deg in line.upper() for deg in ['B.TECH', 'B.SC', 'B.E', 'M.TECH', 'M.SC', 'MBA', 'PHD', 'BACHELOR', 'MASTER', '+2', '12TH', '10TH']):
                if current_edu:
                    education.append(current_edu)
                current_edu = {"institution": "", "degree": line, "gpa": "", "duration": ""}
            # Look for GPA
            gpa_match = re.search(r'GPA\s*[:\s]*(\d+\.?\d*)', line, re.IGNORECASE)
            if gpa_match and current_edu:
                current_edu["gpa"] = gpa_match.group(1)
            # Look for year
            year_match = re.search(r'(\d{4})\s*[-–]\s*(\d{4}|Present)', line, re.IGNORECASE)
            if year_match and current_edu:
                current_edu["duration"] = f"{year_match.group(1)} - {year_match.group(2)}"
        
        if current_edu:
            education.append(current_edu)
    
    return education if education else [{"institution": "", "degree": "", "gpa": "", "duration": ""}]

def extract_experience(text):
    """Extract work experience"""
    experience = []
    section = extract_section(text, ['EXPERIENCE', 'WORK EXPERIENCE', 'EMPLOYMENT', 'PROFESSIONAL EXPERIENCE'])
    
    if section:
        lines = [l.strip() for l in section.split('\n') if l.strip()]
        current_exp = None
        
        for line in lines:
            # Look for job titles or company names
            if '|' in line or any(word in line.upper() for word in ['INTERN', 'DEVELOPER', 'ENGINEER', 'ANALYST', 'MANAGER']):
                if current_exp:
                    experience.append(current_exp)
                parts = [p.strip() for p in line.split('|')]
                current_exp = {
                    "title": parts[0] if parts else line,
                    "company": parts[1] if len(parts) > 1 else "",
                    "duration": parts[2] if len(parts) > 2 else "",
                    "responsibilities": []
                }
            elif line.startswith('–') or line.startswith('•') or line.startswith('-'):
                if current_exp:
                    current_exp["responsibilities"].append(line.lstrip('–•- '))
        
        if current_exp:
            experience.append(current_exp)
    
    return experience

def extract_projects(text):
    """Extract projects"""
    projects = []
    section = extract_section(text, ['PROJECTS', 'PROJECT', 'PERSONAL PROJECTS', 'ACADEMIC PROJECTS'])
    
    if section:
        lines = [l.strip() for l in section.split('\n') if l.strip()]
        current_project = None
        
        for line in lines:
            # Project title usually doesn't start with bullet
            if not line.startswith('•') and not line.startswith('-') and not line.startswith('–'):
                if current_project:
                    projects.append(current_project)
                current_project = {
                    "name": line.split('|')[0].strip(),
                    "technologies": [],
                    "description": ""
                }
            elif line.startswith('•') or line.startswith('-') or line.startswith('–'):
                if current_project:
                    desc = line.lstrip('•–- ')
                    if current_project["description"]:
                        current_project["description"] += " " + desc
                    else:
                        current_project["description"] = desc
        
        if current_project:
            projects.append(current_project)
    
    return projects

def extract_certifications(text):
    """Extract certifications"""
    certs = []
    section = extract_section(text, ['CERTIFICATION', 'CERTIFICATIONS', 'ACHIEVEMENTS', 'COURSES'])
    
    if section:
        lines = [l.strip() for l in section.split('\n') if l.strip()]
        for line in lines:
            if line.startswith('•') or line.startswith('-') or line.startswith('–'):
                certs.append(line.lstrip('•–- ').replace('Completed ', '').strip())
            elif len(line) > 10:
                certs.append(line)
    
    return certs

def parse_resume(pdf_path):
    """Main function to parse resume and return structured JSON"""
    try:
        text = extract_text_from_pdf(pdf_path)
        
        resume_data = {
            "name": extract_name(text),
            "email": extract_email(text),
            "phone": extract_phone(text),
            "education": extract_education(text),
            "technicalSkills": extract_skills(text),
            "experience": extract_experience(text),
            "projects": extract_projects(text),
            "certifications": extract_certifications(text),
            "rawText": text,
            "parsed": True
        }
        
        return resume_data
        
    except Exception as e:
        return {
            "error": str(e),
            "parsed": False,
            "technicalSkills": [],
            "rawText": ""
        }

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print(json.dumps({"error": "Usage: python parse_resume_full.py <pdf_file_path>", "parsed": False}))
        sys.exit(1)
    
    pdf_file_path = sys.argv[1]
    result = parse_resume(pdf_file_path)
    print(json.dumps(result, ensure_ascii=False, indent=2))
