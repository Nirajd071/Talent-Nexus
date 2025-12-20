# HireSphere - System Architecture

## High-Level Architecture

```mermaid
graph TB
    subgraph "Client Layer"
        WEB[React + TypeScript Frontend<br/>Vite Build System]
        CAND[Candidate Portal]
        REC[Recruiter Dashboard]
    end

    subgraph "API Gateway"
        EXPRESS[Express REST API<br/>Node.js + TypeScript]
    end

    subgraph "Authentication"
        AUTH[JWT Auth Service]
        GOOGLE[Google OAuth 2.0]
    end

    subgraph "Core Services"
        JOBS[Jobs Service]
        APP[Applications Service]
        CAND_SVC[Candidates Service]
        INT[Interviews Service]
        ASSESS[Assessments Service]
        OFFER[Offers Service]
        ONBOARD[Onboarding Service]
        TRAIN[Training Service]
    end

    subgraph "AI Engine - Google Gemini"
        PARSER[Resume Parser<br/>Python + PyPDF2]
        SCORER[AI Scoring Engine<br/>Gemini Analysis]
        RAG[Knowledge RAG<br/>Candidate Insights]
        SMART[Smart Sourcing<br/>Job Matching]
        EMAIL[Email Generator]
    end

    subgraph "Data Layer"
        MONGO[(MongoDB Atlas<br/>NoSQL Database)]
    end

    subgraph "External Integrations"
        JITSI[Jitsi Video<br/>Virtual Interviews]
        LMS[LMS Integration<br/>Training Platforms]
        DOCUSIGN[DocuSign API<br/>Offer Signing]
    end

    WEB --> EXPRESS
    CAND --> EXPRESS
    REC --> EXPRESS
    
    EXPRESS --> AUTH
    AUTH --> GOOGLE
    
    EXPRESS --> JOBS
    EXPRESS --> APP
    EXPRESS --> CAND_SVC
    EXPRESS --> INT
    EXPRESS --> ASSESS
    EXPRESS --> OFFER
    EXPRESS --> ONBOARD
    EXPRESS --> TRAIN
    
    JOBS --> SMART
    APP --> PARSER
    APP --> SCORER
    CAND_SVC --> RAG
    OFFER --> EMAIL
    
    JOBS --> MONGO
    APP --> MONGO
    CAND_SVC --> MONGO
    INT --> MONGO
    ASSESS --> MONGO
    OFFER --> MONGO
    ONBOARD --> MONGO
    TRAIN --> MONGO
    
    INT --> JITSI
    TRAIN --> LMS
    OFFER --> DOCUSIGN

    style WEB fill:#4F46E5,color:#fff
    style EXPRESS fill:#10B981,color:#fff
    style MONGO fill:#00684A,color:#fff
    style PARSER fill:#EA4335,color:#fff
    style SCORER fill:#EA4335,color:#fff
    style RAG fill:#EA4335,color:#fff
```

---

## Three-Phase Hiring Pipeline

```mermaid
graph LR
    subgraph "PHASE 1: TALENT DISCOVERY"
        JOB[Post Job] --> AI_GEN[AI Job Generation]
        AI_GEN --> SMART_SRC[Smart Sourcing]
        SMART_SRC --> APPLY[Candidate Apply]
        APPLY --> PARSE[Resume Parser]
        PARSE --> SCORE[AI Scoring]
    end

    subgraph "PHASE 2: EVALUATION"
        SCORE --> SCREEN[Skill Assessments]
        SCREEN --> INTERVIEW[Virtual Interviews]
        INTERVIEW --> EVAL[Evaluation Hub]
        EVAL --> OFFER_GEN[Offer Management]
    end

    subgraph "PHASE 3: READINESS"
        OFFER_GEN --> SIGN[Digital Signing]
        SIGN --> ONBOARD[Onboarding]
        ONBOARD --> IT_PROV[IT Provisioning]
        IT_PROV --> TRAINING[Learning Readiness]
    end

    style JOB fill:#3B82F6,color:#fff
    style SCREEN fill:#8B5CF6,color:#fff
    style ONBOARD fill:#10B981,color:#fff
```

---

## AI Resume Processing Flow

```mermaid
sequenceDiagram
    participant C as Candidate
    participant API as Express API
    participant P as Python Parser
    participant G as Gemini AI
    participant DB as MongoDB

    C->>API: Upload Resume (PDF)
    API->>P: Extract Text
    P->>P: PyPDF2 Parsing
    P-->>API: JSON Structure
    API->>G: Analyze Resume
    G->>G: Extract Skills, Experience
    G-->>API: Scored Profile
    API->>DB: Store Candidate Data
    API-->>C: Application Submitted
```

---

## Technology Stack

### Frontend
- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite
- **UI Library**: Shadcn UI + Tailwind CSS
- **Routing**: Wouter
- **Charts**: Recharts
- **State**: React Hooks

### Backend
- **Runtime**: Node.js 20+
- **Framework**: Express + TypeScript
- **Authentication**: JWT + Google OAuth
- **File Processing**: Multer
- **PDF Parsing**: Python (PyPDF2)

### Database
- **Primary**: MongoDB with Mongoose ODM
- **Models**: 15+ schemas (User, Job, Application, Interview, etc.)

### AI & ML
- **Engine**: Google Gemini 2.0 Flash
- **Features**:
  - Resume parsing & extraction
  - Candidate scoring & ranking
  - RAG-based knowledge retrieval
  - Smart job matching
  - Email generation

### Integrations
- **Video**: Jitsi Meet
- **Signatures**: DocuSign API
- **LMS**: Custom integrations
- **OAuth**: Google Identity Platform

---

## Data Models (15 Collections)

| Collection | Purpose |
|------------|---------|
| **users** | Recruiters & candidates with auth |
| **jobs** | Job postings & requirements |
| **applications** | Candidate applications with status |
| **candidates** | Parsed candidate profiles |
| **interviews** | Interview schedules & recordings |
| **assessments** | Skill test assignments |
| **testResults** | Assessment submissions & scores |
| **offers** | Offer letters & negotiations |
| **accessCodes** | Secure assessment codes |
| **onboardingTasks** | Checklist for new hires |
| **learningModules** | Training courses |
| **newHireTraining** | Employee training progress |
| **lmsIntegrations** | LMS platform configs |
| **aiInteractionLog** | AI usage analytics |

---

## Security Features

```mermaid
graph TD
    A[Security Layer]
    A --> B[JWT Authentication]
    A --> C[Google OAuth 2.0]
    A --> D[Role-Based Access]
    A --> E[Access Code Protection]
    A --> F[Session Management]
    
    D --> G[Recruiter Role]
    D --> H[Candidate Role]
    
    E --> I[Assessment Security]
    E --> J[Video Interview Auth]
    
    style A fill:#EF4444,color:#fff
```

---

## Deployment Architecture

```mermaid
graph TB
    subgraph "Production Environment"
        CDN[Cloudflare/Vercel CDN]
        FRONTEND[Static React Build]
        BACKEND[Node.js API Server]
        DB[MongoDB Atlas]
    end
    
    subgraph "CI/CD Pipeline"
        GH[GitHub Repo]
        BUILD[Build & Test]
        DEPLOY[Auto Deploy]
    end
    
    USER[End Users] --> CDN
    CDN --> FRONTEND
    FRONTEND --> BACKEND
    BACKEND --> DB
    
    GH --> BUILD
    BUILD --> DEPLOY
    DEPLOY --> FRONTEND
    DEPLOY --> BACKEND
    
    style CDN fill:#F97316,color:#fff
    style DB fill:#00684A,color:#fff
```

---

## Key Features by Phase

### 📊 Phase 1: Talent Discovery
- AI-powered job description generation
- Smart candidate sourcing
- Automated resume parsing (Python + Gemini)
- AI scoring & ranking (0-100 scale)
- Candidate portal with job search

### 🎯 Phase 2: Evaluation  
- Skill assessments with secure access codes
- Question bank management
- Virtual interviews via Jitsi
- Evaluation hub for candidate review
- Interview scheduler with calendar
- Offer management & analytics

### 🚀 Phase 3: Readiness
- Digital offer signing (DocuSign)
- Automated onboarding workflows
- IT provisioning checklists
- Learning management system
- Training progress tracking
- Analytics dashboard

---

## Performance Metrics

- **Resume Parsing**: ~2-3 seconds per PDF
- **AI Scoring**: ~1-2 seconds per candidate
- **Database Queries**: <100ms average
- **Frontend Load**: <2 seconds initial
- **Concurrent Users**: Scalable to 1000+
