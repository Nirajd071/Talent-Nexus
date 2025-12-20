# TalentOS - AI-Powered Talent Acquisition Platform
## Project Report

---

**Project Name:** TalentOS (Talent-Nexus)  
**Team Name:** Team TalentOS  
**Submission Date:** December 2024  
**Repository:** https://github.com/Nirajd071/Talent-Nexus

### Team Members

| Name | Role | Responsibilities |
|------|------|------------------|
| **Niraj Das** | Backend & AI Lead | AI/ML integration, Gemini API, Resume parsing, Candidate scoring system, Database design |
| **Pankaj Baduwal** | Frontend Lead | React UI development, Dashboard pages, Candidate ranking dialog, Assessment UI |
| **Piyush Kumar** | Full-Stack Developer | Authentication, Email system, Proctoring system, API integration, Testing |

---

## 1. Introduction

### 1.1 Problem Statement

The traditional recruitment process faces several challenges:
- Manual resume screening is time-consuming
- Difficulty in objective skill matching
- Lack of standardized candidate evaluation
- No integrated assessment system

### 1.2 Solution

TalentOS is a full-stack web application that provides:
- AI-powered resume parsing and skill extraction
- Automated candidate-job matching with scoring
- Proctored skill assessments with integrity monitoring
- Complete recruitment workflow management

---

## 2. Technology Stack

### 2.1 Frontend
| Technology | Purpose |
|------------|---------|
| React 18 + TypeScript | SPA Framework with type safety |
| Vite | Build tool and dev server |
| Tailwind CSS | Utility-first CSS framework |
| shadcn/ui | Component library (55 UI components) |

### 2.2 Backend
| Technology | Purpose |
|------------|---------|
| Node.js + Express.js | REST API server |
| TypeScript | Type-safe server code |
| MongoDB + Mongoose | Document database |

### 2.3 AI/ML Integration
| Technology | Purpose |
|------------|---------|
| Google Gemini 1.5 Flash | Resume analysis, skill extraction |
| Python pypdf/pdfplumber | PDF text extraction |

### 2.4 Other Services
| Technology | Purpose |
|------------|---------|
| Nodemailer + Gmail SMTP | Email notifications |
| JWT | Authentication tokens |
| bcrypt | Password hashing |

---

## 3. System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         TalentOS Architecture                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────────┐   │
│  │   React     │────▶│   Express   │────▶│    MongoDB      │   │
│  │   Frontend  │◀────│   Backend   │◀────│                 │   │
│  │   (Vite)    │     │   (REST)    │     │                 │   │
│  └─────────────┘     └──────┬──────┘     └─────────────────┘   │
│                             │                                    │
│                    ┌────────┴────────┐                          │
│                    ▼                 ▼                          │
│            ┌─────────────┐   ┌─────────────┐                   │
│            │ Google      │   │   Python    │                   │
│            │ Gemini API  │   │ PDF Parser  │                   │
│            └─────────────┘   └─────────────┘                   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. Features Implemented

### 4.1 User Authentication System

**Files:** `server/routes/api.ts`, `client/src/pages/auth.tsx`

- JWT-based authentication with role separation
- Two user roles: `recruiter` and `candidate`
- Password hashing using bcrypt
- Protected routes on frontend (`ProtectedRoute.tsx`)

### 4.2 Job Management (Recruiter)

**Files:** `client/src/pages/jobs.tsx`, `server/routes/api.ts`

**Features:**
- Create, edit, delete job postings
- Set job status: `draft`, `active`, `closed`
- Define required skills and experience
- View applicant count per job

**Database Schema (Job):**
```javascript
{
  title: String,
  department: String,
  location: String,
  type: String,
  description: String,
  requirements: [String],
  salary: { min: Number, max: Number },
  status: "draft" | "active" | "closed",
  applicants: Number
}
```

### 4.3 Resume Parsing System

**Files:** `server/services/resume-parser.ts`, `server/utils/parse_resume_full.py`

**Implementation:**
1. PDF uploaded via `/api/upload/parse-resume`
2. Python script extracts text using pypdf
3. Skill ontology matching (60+ skills defined)
4. Returns structured data: name, email, skills, experience, education, projects

**Extracted Data Structure:**
```typescript
interface ParsedResumeData {
  name?: string;
  email?: string;
  phone?: string;
  technicalSkills: string[];
  education: Array<{ institution, degree, gpa, duration }>;
  experience: Array<{ title, company, duration, responsibilities }>;
  projects: Array<{ name, technologies, description }>;
  certifications: string[];
  rawText: string;
}
```

### 4.4 AI-Powered Candidate Scoring

**File:** `server/services/candidate-scoring.ts`

Uses Google Gemini API to analyze resumes against job descriptions with these weights:

| Factor | Weight | Description |
|--------|--------|-------------|
| Skills Match | 50% | Required and preferred skills from JD |
| Experience | 20% | Years of relevant experience |
| Education | 15% | Degree and certifications |
| Projects | 10% | Relevant projects and portfolio |
| Cultural Fit | 5% | Soft skills and signals |

**Scoring Output:**
```typescript
interface CandidateScoreResult {
  matchScore: number;           // 0-100 overall
  skillsAnalysis: {...};        // Matched/missing skills
  experienceAnalysis: {...};    // Total/relevant years
  educationAnalysis: {...};     // Degree, certifications
  projectsAnalysis: {...};      // Relevant projects
  culturalFitAnalysis: {...};   // Cultural signals
  aiRecommendation: "STRONG_HIRE" | "HIRE" | "MAYBE" | "NO_HIRE";
  aiSummary: string;            // 2-3 sentence summary
  strengths: string[];
  gaps: string[];
}
```

**AI Recommendation Levels:**
- `STRONG_HIRE` - 80%+ match
- `HIRE` - 60-79% match
- `MAYBE` - 40-59% match
- `NO_HIRE` - Below 40%

### 4.5 Candidate Ranking Dialog

**File:** `client/src/components/candidate-ranking-dialog.tsx` (1000+ lines)

**Features:**
- View all applicants for a job
- Sort by score, date, name
- Filter by status: all, shortlisted, new, reviewed
- Bulk selection and actions
- Side panel with detailed candidate info
- View resume, AI score explanation
- Shortlist, reject, remove actions

### 4.6 Application Flow (Candidate)

**Files:** `client/src/pages/candidate.tsx`, `server/routes/api.ts`

**Flow:**
1. Candidate uploads resume → AI parsing
2. Views job listings and filters
3. Clicks "Apply" → Resume + cover letter submitted
4. AI calculates match score automatically
5. Status tracked: `applied` → `reviewed` → `shortlisted`/`rejected`

**Database Schema (Application):**
```javascript
{
  candidateId: ObjectId,
  jobId: ObjectId,
  candidateName: String,
  candidateEmail: String,
  status: "applied" | "reviewed" | "shortlisted" | "rejected",
  resume: String,
  resumeUrl: String,
  coverLetter: String,
  matchScore: Number,
  aiScore: Number,
  parsedResume: Object
}
```

### 4.7 Skill Assessments

**Files:** 
- `client/src/pages/skill-assessments.tsx` (Assessment list)
- `client/src/components/test-builder-modal.tsx` (Create tests)
- `server/routes/api.ts` (Assessment APIs)

**Features:**
- Create assessments with multiple question types:
  - Multiple Choice (MCQ)
  - Coding problems
  - Case studies
- Set time limits per question
- Difficulty levels: Easy, Medium, Hard
- AI-generated questions using Gemini

**Question Schema:**
```javascript
{
  type: "mcq" | "coding" | "case_study",
  question: String,
  options: [String],
  correctAnswer: String,
  points: Number,
  timeLimit: Number
}
```

### 4.8 Secure Assessment Environment

**File:** `client/src/pages/assessment-secure.tsx`

**Proctoring Features Implemented:**
- Full-screen mode enforcement
- Tab switch detection
- Window blur detection (focus loss)
- Copy/paste prevention
- Right-click disabled
- Time tracking

**3-Strike System:**
```typescript
// State tracking
const [flagCount, setFlagCount] = useState(0);

// On violation:
if (flagCount >= 3) {
  // Auto-terminate with penalty
  submitCodeWithTermination("3_strikes");
}
```

### 4.9 Access Code System

**File:** `server/db.ts` (AccessCode schema)

- 8-character unique codes (format: XXXX-XXXX)
- One-time use enforcement
- Links to specific assessment + candidate
- Expiration date support

**Schema:**
```javascript
{
  code: String,
  assessmentId: ObjectId,
  candidateEmail: String,
  isUsed: Boolean,
  status: "active" | "used" | "expired"
}
```

### 4.10 Email Notifications

**File:** `server/services/email.ts`

**Email Types Implemented:**
1. `sendShortlistEmail()` - Congratulations on shortlisting
2. `sendInterviewInvite()` - Interview scheduling
3. `sendStatusUpdate()` - Application status changes
4. `sendRejectionEmail()` - Rejection with feedback
5. `sendOfferLetter()` - Offer with salary details

**Configuration:** Gmail SMTP with App Password

### 4.11 Proctoring & Integrity Scoring

**File:** `server/services/proctoring.ts`

**Event Weights:**
```javascript
const EVENT_WEIGHTS = {
  tab_switch: { base: -5, max: -20 },
  focus_loss: { base: -3, max: -15 },
  paste: { base: -10, max: -30 },
  copy: { base: -8, max: -24 },
  right_click: { base: -2, max: -10 },
  dev_tools: { base: -20, max: -40 },
  multiple_faces: { base: -25, max: -25 }
};
```

**Integrity Score Calculation:**
- Starts at 100
- Deductions based on event type and severity
- Auto-flag if score < 60
- Critical events (multiple_faces, dev_tools) trigger instant flag

---

## 5. Database Design

### 5.1 Collections (MongoDB)

| Collection | Purpose |
|------------|---------|
| users | User accounts and profiles |
| jobs | Job postings |
| applications | Job applications |
| assessments | Skill test definitions |
| testAssignments | Assessment instances |
| accessCodes | One-time test access codes |
| questions | Question bank |
| emailLogs | Email history |
| proctoringEvents | Proctoring violations |

### 5.2 Key Relationships

```
User (Candidate) ─┬─▶ Application ◀─┬─ Job
                  │                  │
                  └─▶ TestAssignment ◀─ Assessment
```

---

## 6. API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register user |
| POST | `/api/auth/login` | Login user |
| GET | `/api/auth/me` | Current user |

### Jobs
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/jobs` | List jobs |
| POST | `/api/jobs` | Create job (recruiter) |
| PUT | `/api/jobs/:id` | Update job |
| DELETE | `/api/jobs/:id` | Delete job |
| GET | `/api/jobs/:id/candidates` | Get applicants |

### Applications
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/candidate/apply` | Submit application |
| GET | `/api/candidate/applications` | My applications |
| PUT | `/api/applications/:id/shortlist` | Shortlist candidate |
| PUT | `/api/applications/:id/reject` | Reject candidate |

### Assessments
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/assessments` | List assessments |
| POST | `/api/assessments` | Create assessment |
| POST | `/api/assessments/:id/assign` | Assign to candidate |
| POST | `/api/assessment/verify-code` | Verify access code |
| POST | `/api/assessments/submit` | Submit answers |

### Resume
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/upload/parse-resume` | Upload and parse resume |

---

## 7. Frontend Pages

| Page | File | Purpose |
|------|------|---------|
| Auth | `auth.tsx` | Login/Register |
| Dashboard | `dashboard.tsx` | Overview stats |
| Jobs | `jobs.tsx` | Job management |
| Candidates | `candidates.tsx` | Candidate list |
| Candidate Portal | `candidate.tsx` | Candidate dashboard |
| Skill Assessments | `skill-assessments.tsx` | Test management |
| Secure Assessment | `assessment-secure.tsx` | Proctored test taking |
| Analytics | `analytics.tsx` | Reporting |
| Interview Scheduler | `interview-scheduler.tsx` | Schedule interviews |
| Offer Management | `offer-management.tsx` | Handle offers |
| Question Bank | `question-bank.tsx` | Manage questions |

---

## 8. Key Components

| Component | File | Purpose |
|-----------|------|---------|
| CandidateRankingDialog | `candidate-ranking-dialog.tsx` | View/manage applicants |
| TestBuilderModal | `test-builder-modal.tsx` | Create assessments |
| AccessCodeEntry | `access-code-entry.tsx` | Enter test codes |
| NotificationBell | `notification-bell.tsx` | In-app notifications |
| ProtectedRoute | `ProtectedRoute.tsx` | Route guards |
| AssessmentResultDetails | `assessment-result-details.tsx` | View test results |

---

## 9. Code Quality Improvements

### 9.1 Stale Closure Fixes

Fixed 15+ instances across files:
- `candidate-ranking-dialog.tsx` (6 fixes)
- `jobs.tsx` (6 fixes)
- `test-builder-modal.tsx` (2 fixes)
- `workflows.tsx` (2 fixes)

**Pattern Applied:**
```typescript
// Before (bug):
setItems([...items, newItem])

// After (fixed):
setItems(prev => [...prev, newItem])
```

### 9.2 Resume Storage Bug Fix

**Issue:** Resume files were deleted after parsing
**Solution:** Kept files on disk, return URL to frontend

---

## 10. Installation & Setup

### Prerequisites
- Node.js 18+
- MongoDB 6+
- Python 3.9+ (with pypdf, pdfplumber)

### Environment Variables
```env
MONGODB_URI=mongodb://localhost:27017/talent-nexus
JWT_SECRET=your-secret-key
GEMINI_API_KEY=your-gemini-api-key
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=your-app-password
```

### Run Project
```bash
git clone https://github.com/Nirajd071/Talent-Nexus.git
cd Talent-Nexus
npm install
npm run dev
```

---

## 11. Project Statistics

| Metric | Value |
|--------|-------|
| Frontend Pages | 29 |
| UI Components | 55+ (shadcn/ui) |
| Custom Components | 14 |
| Backend Services | 14 |
| API Routes | 50+ |
| Database Collections | 20+ |
| Lines of Code (estimate) | 30,000+ |

---

## 12. Conclusion

TalentOS successfully implements a complete AI-powered recruitment platform with:

✅ Full authentication and role-based access  
✅ Job posting and management  
✅ AI-powered resume parsing with Python + Gemini  
✅ Weighted candidate scoring (50/20/15/10/5%)  
✅ Proctored skill assessments with integrity monitoring  
✅ 3-strike cheating detection system  
✅ Email notification system  
✅ Comprehensive candidate tracking  

The platform demonstrates practical application of:
- Full-stack TypeScript development
- AI/ML integration for document analysis
- Real-time proctoring and security
- Production-ready database design

---

*Report prepared by: Team TalentOS*  
*Niraj Das | Pankaj Baduwal | Piyush Kumar*  
*December 2024*
