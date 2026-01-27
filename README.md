# 💧 Spending Insights

A modern, full-stack spending analytics web application that helps users track and visualize their spending habits with beautiful charts and insights.

![Tech Stack](https://img.shields.io/badge/React-18.2-61DAFB?logo=react)
![Tech Stack](https://img.shields.io/badge/TypeScript-5.3-3178C6?logo=typescript)
![Tech Stack](https://img.shields.io/badge/Spring%20Boot-3.2-6DB33F?logo=springboot)
![Tech Stack](https://img.shields.io/badge/PostgreSQL-15-4169E1?logo=postgresql)
![Tech Stack](https://img.shields.io/badge/Redis-7-DC382D?logo=redis)
![Tech Stack](https://img.shields.io/badge/Firebase-Auth-FFCA28?logo=firebase)

## ✨ Features

- **User Authentication** — Secure login/signup with Firebase Authentication
- **Transaction Management** — Add, view, and track spending transactions
- **Spending Insights** — Visual analytics with category breakdowns
- **Interactive Charts** — Beautiful bar charts powered by Recharts
- **Real-time Updates** — Instant data refresh and state management
- **Modern UI** — Sky blue gradient theme with orange-yellow accent buttons
- **Click Splash Effects** — Delightful water splash animations on click

## 🛠️ Tech Stack

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| **React** | 18.2 | UI component library |
| **TypeScript** | 5.3 | Type-safe JavaScript |
| **Vite** | 5.0 | Fast build tool & dev server |
| **Recharts** | 2.12 | Charting library for insights |
| **Firebase SDK** | 10.7 | Authentication client |
| **CSS3** | — | Custom styling with CSS variables |

### Backend
| Technology | Version | Purpose |
|------------|---------|---------|
| **Java** | 17 | Programming language |
| **Spring Boot** | 3.2.2 | Application framework |
| **Spring Security** | — | JWT authentication & authorization |
| **Spring Data JPA** | — | Database ORM |
| **Spring Data Redis** | — | Caching layer |
| **Firebase Admin SDK** | 9.2.0 | Token verification |
| **Lombok** | — | Boilerplate reduction |

### Database & Caching
| Technology | Version | Purpose |
|------------|---------|---------|
| **PostgreSQL** | 15 | Primary relational database |
| **Redis** | 7 | Session caching & performance |

### Infrastructure
| Technology | Purpose |
|------------|---------|
| **Docker** | Containerization |
| **Docker Compose** | Local development orchestration |
| **Nginx** | Reverse proxy & static file serving |

## 📁 Project Structure

```
SpendingWebApp/
├── frontend/                 # React TypeScript frontend
│   ├── src/
│   │   ├── App.tsx          # Main application component
│   │   ├── main.tsx         # Entry point
│   │   ├── auth/
│   │   │   └── firebase.ts  # Firebase configuration
│   │   ├── components/
│   │   │   ├── InsightsChart.tsx    # Bar chart component
│   │   │   ├── DropletCursor.tsx    # Click splash effect
│   │   │   └── DropletCursor.css
│   │   └── styles/
│   │       └── app.css      # Global styles
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
│
├── backend/                  # Spring Boot backend
│   ├── src/main/java/com/spendingapp/
│   │   ├── SpendingBackendApplication.java
│   │   ├── config/
│   │   │   └── FirebaseConfig.java
│   │   ├── controller/
│   │   │   └── SpendingController.java
│   │   ├── dto/
│   │   │   ├── SpendingDto.java
│   │   │   ├── InsightDto.java
│   │   │   └── InsightsResponse.java
│   │   ├── model/
│   │   │   ├── SpendingTransaction.java
│   │   │   └── UserAccount.java
│   │   ├── repository/
│   │   │   ├── SpendingTransactionRepository.java
│   │   │   └── UserAccountRepository.java
│   │   ├── security/
│   │   │   ├── JwtAuthFilter.java
│   │   │   └── SecurityConfig.java
│   │   └── service/
│   │       └── SpendingService.java
│   ├── src/main/resources/
│   │   └── application.yml
│   └── pom.xml
│
└── infra/                    # Infrastructure configuration
    ├── docker-compose.yml
    ├── db/
    │   └── init.sql         # Database initialization
    └── nginx/
        └── nginx.conf
```

## 🚀 Getting Started

### Prerequisites

- **Node.js** 20+
- **Java** 17+
- **Docker** & Docker Compose
- **Firebase Project** with Authentication enabled

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/SpendingWebApp.git
cd SpendingWebApp
```

### 2. Configure Firebase

1. Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
2. Enable Email/Password authentication
3. Download your service account JSON and place it in `ServiceAccountInfo/ServiceAccount.json`
4. Create a `.env` file in the `infra/` directory:

```env
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_APP_ID=your-app-id
```

### 3. Run with Docker Compose

```bash
cd infra
docker compose up --build
```

The application will be available at **http://localhost:8080**

### 4. Development Mode (Frontend Only)

For frontend development with hot reload:

```bash
cd frontend
npm install
npm run dev
```

Frontend dev server runs at **http://localhost:5173**

## 🎨 Design System

The app features a custom design system with:

- **Colors**: Sky blue gradient background (`#87CEEB` → `#E0F4FF`)
- **Accents**: Orange-yellow gradient buttons (`#FFD700` → `#FF7F50`)
- **Typography**: Apple San Francisco system font stack
- **Effects**: Glassmorphism cards, click splash animations
- **Responsive**: Mobile-first design approach

## 📊 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/spending` | Get user's transactions |
| `POST` | `/api/spending` | Create new transaction |
| `GET` | `/api/insights` | Get spending insights |
| `GET` | `/api/health` | Health check |

All endpoints (except health) require Firebase JWT authentication via `Authorization: Bearer <token>` header.

## 👨‍💻 Author

**Anuj Sharma**  
🌐 [anujsharma9.com](https://anujsharma9.com)

---

*Built with ☕ and 💧*

