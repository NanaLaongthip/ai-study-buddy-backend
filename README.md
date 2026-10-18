# AI Study Buddy - Backend

Express.js backend with PostgreSQL & Prisma ORM for the AI Study Buddy platform.

## Getting Started

### 1. Prerequisites
- Node.js (v18+)
- PostgreSQL database instance

### 2. Environment Configuration
Copy `.env.example` to `.env` and configure your database and LLM credentials:
```bash
cp .env.example .env
```

Environment variables:
```env
PORT=5000
DATABASE_URL="postgresql://<user>:<password>@localhost:5432/ai_study_buddy?schema=public"
CLIENT_URL="http://localhost:5173"

# LLM Configuration (OpenAI, Local LLM like Ollama / LM Studio)
OPENAI_API_KEY="your-api-key-here"
OPENAI_BASE_URL="https://api.openai.com/v1"
OPENAI_MODEL="gpt-4o-mini"

# Set MOCK_AI=true for offline testing without calling external LLM
MOCK_AI=false
```

### 3. Run Database Migrations
When your PostgreSQL instance is running:
```bash
npx prisma migrate dev --name init
```

### 4. Generate Prisma Client
```bash
npm run prisma:generate
```

### 5. Run the Server
- Development mode (with auto-reload):
  ```bash
  npm run dev
  ```
- Production mode:
  ```bash
  npm start
  ```

---

## API Endpoints

### 1. File Upload & AI Study Processing
- **Endpoint:** `POST /api/upload`
- **Content-Type:** `multipart/form-data`
- **Fields:**
  - `file` (or `pdf`): PDF file (lecture slide or textbook chapter)
  - `title` *(optional)*: Document title
  - `userId` *(optional)*: User ID
- **Response Structure (201 Created):**
```json
{
  "success": true,
  "message": "PDF uploaded, analyzed, and study materials saved successfully.",
  "data": {
    "document": {
      "id": "uuid",
      "title": "Operating Systems",
      "filename": "1729000000000-Operating_Systems.pdf",
      "uploadDate": "2026-10-15T12:00:00.000Z",
      "numPages": 12
    },
    "summary": {
      "id": "uuid",
      "key_takeaways": [
        "Process scheduling algorithms determine CPU allocation...",
        "Preemptive vs non-preemptive scheduling differences..."
      ],
      "exam_focus": [
        "Calculating Round Robin turnaround and waiting times",
        "Shortest Job First (SJF) optimal criteria"
      ]
    },
    "flashcards": [
      {
        "id": "uuid",
        "front": "What is preemptive scheduling?",
        "back": "An algorithm where the CPU can be taken away from a running process before it completes."
      }
    ],
    "quiz_questions": [
      {
        "question": "Which scheduling algorithm minimizes average waiting time?",
        "options": ["First-Come First-Served", "Shortest Job First", "Priority Scheduling", "Round Robin"],
        "answer": "Shortest Job First",
        "explanation": "SJF is provably optimal for minimizing average waiting time."
      }
    ]
  }
}
```

### 2. Retrieve Document & Study Materials
- **`GET /api/documents`** - Lists all uploaded documents
- **`GET /api/documents/:id`** - Retrieves a document with its Summary, Flashcards, and Quiz questions
- **`GET /api/health`** - Service health check
