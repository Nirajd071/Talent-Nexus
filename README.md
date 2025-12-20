# TalentOS - AI-Powered Talent Acquisition Platform

[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18+-blue.svg)](https://reactjs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-6+-green.svg)](https://mongodb.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5+-blue.svg)](https://typescriptlang.org/)

> A modern, AI-powered recruitment platform that automates candidate screening, skill assessments, and hiring workflows.

## 🚀 Features

### For Recruiters
- 📝 **Job Management** - Create, edit, publish, and archive job postings
- 🤖 **AI Candidate Matching** - Automatic scoring based on skills and experience
- 📊 **Smart Rankings** - View candidates ranked by AI match score
- ✅ **Skill Assessments** - Create proctored tests with multiple question types
- 📧 **Automated Emails** - Shortlist/rejection notifications

### For Candidates
- 🔍 **Job Discovery** - Browse and search available positions
- 📄 **AI Resume Parsing** - Automatic skill extraction from resumes
- ✍️ **Easy Applications** - One-click apply with cover letter
- 🎯 **Secure Assessments** - Take proctored skill tests
- 📱 **Application Tracking** - Real-time status updates

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, TypeScript, Tailwind CSS, shadcn/ui |
| Backend | Node.js, Express.js, TypeScript |
| Database | MongoDB with Mongoose |
| AI/ML | Google Gemini API |
| PDF Parsing | Python pypdf + pdfplumber |
| Authentication | JWT |

## 📦 Installation

### Prerequisites
- Node.js 18+
- MongoDB 6+
- Python 3.9+

### Setup

```bash
# Clone the repository
git clone https://github.com/Nirajd071/Talent-Nexus.git
cd Talent-Nexus

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your credentials

# Start development server
npm run dev
```

### Environment Variables

```env
MONGODB_URI=mongodb://localhost:27017/talent-nexus
JWT_SECRET=your-secret-key
GOOGLE_API_KEY=your-gemini-api-key
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
```

## 🏗️ Project Structure

```
Talent-Nexus/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/    # UI components
│   │   ├── pages/         # Route pages
│   │   └── hooks/         # Custom React hooks
├── server/                 # Express backend
│   ├── routes/            # API routes
│   ├── services/          # Business logic
│   └── db.ts              # Database schemas
├── uploads/               # Uploaded files
└── PROJECT_REPORT.md      # Detailed documentation
```

## 📚 Documentation

See [PROJECT_REPORT.md](./PROJECT_REPORT.md) for complete documentation including:
- System architecture
- Database schemas
- API endpoints
- Feature implementations
- Security measures

## 🔒 Security Features

- JWT-based authentication
- Password hashing with bcrypt
- Secure file upload with validation
- Proctored assessments with 3-strike system
- One-time access codes for tests

## 👥 Team

| Name | Role |
|------|------|
| **Niraj Das** | Backend & AI Lead |
| **Pankaj Baduwal** | Frontend Lead |
| **Piyush Kumar** | Full-Stack Developer |

## 📄 License

This project is for academic purposes.

---

Made with ❤️ for modern recruitment
