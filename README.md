# studysync-api

API for StudySync AI project.

This repo's contents is intended to be used alongside an accompanying UI (coming soon).

## Setup

You need to supply your own OpenAI API key to use the AI features. Put your OpenAI API key in a `.env` file:

```env
OPENAI_API_KEY=your_api_key
```

## API Overview

The Express server mounts:

- Core routes at `/api`
- Generative AI routes at `/api/generative`
- A `/api/test` router is referenced but not implemented and will be removed.

### Core API Endpoints (`/api`)

#### Users
- `GET /users` – list all users
- `GET /user/:id` – fetch a user by ID
- `POST /user/register` – create a user with hashed password
- `POST /user/login` – validate credentials and return the user record

#### Notes
- `GET /notes` – list all notes
- `GET /note/:id` – fetch a note
- `POST /note` – create a note
- `PUT /note/:id` – update a note
- `DELETE /note/:id` – delete a note

#### Projects & Related Data
- `GET /project/:id` – return a project with its summaries, quizsets/quizzes, and flashcards

#### Summaries
- `GET /summaries/:id` – list summaries for a project

#### Quizsets & Quizzes
- `GET /quizsets/:id` – list quizsets for a project
- `GET /quizsets/quizzes/:id` – list quizsets with nested quizzes for a project
- `GET /quizzes/:id` – list quizzes in a quizset

#### Flashcards
- `GET /flashcards/:id` – list flashcards for a project

### Generative AI Endpoints (`/api/generative`)
- `POST /upload_new` – upload a file and create a new vector store
- `POST /upload` – add a file to an existing vector store
- `POST /generateSummary` – generate document summaries and store them
- `POST /generateQuizzes` – generate quiz questions, create a quizset, and store quizzes
- `POST /generateFlashcards` – generate flashcards for a project

## Database Schema

| Table | Column | Type | Description |
|-------|--------|------|-------------|
| **users** | `id` | INTEGER PK AUTOINCREMENT | Unique identifier for each user |
| | `name` | TEXT | Display name |
| | `email` | TEXT UNIQUE | Email address |
| | `password` | TEXT | Hashed password |
| **notes** | `id` | INTEGER PK AUTOINCREMENT | Unique identifier for each note |
| | `title` | TEXT | Note title |
| | `content` | TEXT | Note content |
| | `user_id` | INTEGER FK → users.id | Owner of the note |
| **projects** | `id` | INTEGER PK AUTOINCREMENT | Unique identifier for each project |
| | `name` | TEXT | Project name |
| | `user_id` | INTEGER FK → users.id | Owner of the project |
| | `vector_store_id` | TEXT | External vector store identifier |
| **summaries** | `id` | INTEGER PK AUTOINCREMENT | Unique identifier for each summary |
| | `chapter` | TEXT | Covered chapter or section |
| | `summary` | TEXT | Summary text |
| | `obsolete` | INTEGER | Flag (0/1). When new summaries are generated, older ones are marked obsolete and hidden in the UI. |
| | `project_id` | INTEGER FK → projects.id | Related project |
| **quizsets** | `id` | INTEGER PK AUTOINCREMENT | Unique identifier for each quizset |
| | `name` | TEXT | Quizset name |
| | `project_id` | INTEGER FK → projects.id | Parent project |
| **quizzes** | `id` | INTEGER PK AUTOINCREMENT | Unique identifier for each quiz question |
| | `project_id` | INTEGER FK → projects.id | Related project |
| | `quizset` | INTEGER FK → quizsets.id | Containing quizset |
| | `question` | TEXT | Question text |
| | `options` | TEXT | JSON-encoded answer options |
| | `answer` | TEXT | Correct answer |
| | `explanation` | TEXT | Explanation of the answer |
| **flashcards** | `id` | INTEGER PK AUTOINCREMENT | Unique identifier for each flashcard |
| | `project_id` | INTEGER FK → projects.id | Related project |
| | `question` | TEXT | Flashcard question |
| | `answer` | TEXT | Flashcard answer |

