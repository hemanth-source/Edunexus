# Edunexus 🎓

Edunexus is an immersive, state-of-the-art EdTech Learning Management System (LMS) and University Portal. It features advanced course planning, class scheduling, automated exam creation, student submissions, and dynamic interactive dashboards customized for **Admins, Teachers, Students, and Parents**.

---

## 🚀 Key Features

*   **👥 Role-Based Portals:** Custom experiences tailored for Administrators, Instructors, Students, and Parents.
*   **👨‍👧 Parent Portal (Data Isolation):** A secure, read-only mirror of the student's academic progress. Parents can monitor their children's attendance, weekly timetable schedules, academic performance records, and fee collections/invoices. Includes a **Child Switcher** for multi-student management.
*   **🤖 AI Academic Advisor (Ask AURA):** Built-in generative AI assistant powered by Gemini that offers study recommendations, exam preparations, and customized course guidelines.
*   **📅 Dynamic Timetables & Schedules:** Visual schedules with automatic course mappings, time-slots, and conflict detection.
*   **📝 Attendance Tracker:** Attendance ledger showing consistency graphs, late arrivals, and absent logs.
*   **💳 Fee & Finance Management:** Real-time billing system allowing admins to invoice students, track pending/completed transactions, and display records to parents.

---

## 🛠️ Technology Stack

*   **Frontend:** React (Vite), TypeScript, Lucide Icons, Shadcn UI / Radix primitives, TailwindCSS.
*   **Backend:** Node.js, Express, TypeScript, Mongoose.
*   **Database:** MongoDB (Supports MongoDB Atlas & MongoDB Memory Server fallback).
*   **AI Integration:** Gemini-1.5-Flash (Google Generative AI SDK).

---

## ⚡ Zero-Config Quick Start (Recommended)

Edunexus is configured with an **automatic in-memory MongoDB fallback** and a **built-in data seeder**. You do not need to install MongoDB or configure a database URI to run the application out-of-the-box!

### 1. Install & Run the Backend
Open a terminal, go to the `backend` directory, install dependencies, and start the server:
```bash
# Navigate to backend
cd backend

# Install dependencies
npm install

# Start the backend server (automatically boots an in-memory database & seeds demo users)
npm run dev
```
*   **Backend API URL:** [http://localhost:5000](http://localhost:5000)

### 2. Install & Run the Frontend
Open a second terminal, go to the `frontend` directory, install dependencies, and start the client:
```bash
# Navigate to frontend
cd frontend

# Install dependencies
npm install

# Start the frontend dev server
npm run dev
```
*   **Frontend Web App URL:** [http://localhost:5173](http://localhost:5173)

---

## 🔑 Default Seeded Accounts

The application automatically seeds the database with the following demo users for immediate testing and verification:

| Role | Email | Password | Notes / Permissions |
| :--- | :--- | :--- | :--- |
| **System Admin** | `admin@edunexus.com` | `admin123` | Full system access, parent-student linkage repair, invoice generation. |
| **Aura Teacher** | `teacher@edunexus.com` | `teacher123` | Grade 10 class teacher, marks attendance, manages assignments. |
| **Jane Doe (Student)** | `student@edunexus.com` | `student123` | Enrolled in Grade 10, views course materials, submits quizzes. |
| **Janvi (Student)** | `janvi@edunexus.com` | `janvi123` | Enrolled in Grade 10, linked to parent Kumar. |
| **Kumar (Parent)** | `kumar@gmail.com` | `kumar123` | Parent of Janvi — monitors attendance ledger, timetables, and invoices. |

---

## 👨‍👧 Parent-Student Linking & Synchronization

To link a parent and student relationship, you can use the Administrator panel:

1.  **Student Creation:** When adding a new student, select a parent under the **Parent Link (Synchronization)** dropdown.
2.  **Parent Creation:** When adding a new parent, choose one or more children from the **Student Link (Sync Children)** multi-select dropdown.
3.  **Link Verification:** Admins can view the **Linked Children** column on the Parents page, showing real-time linked names. If a link becomes desynchronized, select the parent's action menu `⋯` and click **Check & Repair Link** to repair it automatically.

---

## ⚙️ Custom Configurations (Optional)

If you wish to use a custom MongoDB database or configure advanced integrations:

1.  Copy `.env.example` to `.env` in the `backend` folder:
    ```bash
    cp backend/.env.example backend/.env
    ```
2.  Open `backend/.env` and specify your variables:
    *   `MONGO_URL`: Set your custom MongoDB connection string (e.g. MongoDB Atlas or a local instance).
    *   `GOOGLE_GENERATIVE_AI_API_KEY`: Set your Gemini API key to enable AI-powered advisor features.
