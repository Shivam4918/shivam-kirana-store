# Shivam Kirana Store

Shivam Kirana Store is a secure, enterprise-grade, mobile-responsive full-stack web application designed for digital grocery management and customer credit ledger (Khata book) tracking.

---

## 🛠️ Tech Stack

### Frontend
- **React.js** (Vite build system)
- **Tailwind CSS** (Custom Emerald Green & Slate Gray palette)
- **React Router DOM** (Role-based access routing)
- **Axios** (Interceptors for token rotations)
- **Context API** (Global session management)
- **React Icons** (Modern iconography)

### Backend
- **Django** & **Django REST Framework** (DRF)
- **SimpleJWT** (Authentication token pairs)
- **CORS Headers** (Secure origin requests)

### Database
- **PostgreSQL** (Neon Serverless compatibility)
- **SQLite** (Default local fallback for plug-and-play development)

---

## 📁 Project Directory Structure

```text
shivam-kirana-store/
├── backend/
│   ├── manage.py
│   ├── requirements.txt
│   ├── seed.py                 # Seeds initial products, admin, and test customer
│   ├── store_backend/          # Django core project configuration
│   └── store_app/              # Custom application logic (models, views, serializers)
├── frontend/
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── index.html
│   └── src/
│       ├── main.jsx
│       ├── index.css
│       ├── App.jsx
│       ├── context/            # AuthContext.jsx session governor
│       ├── services/           # api.js Axios client with auto-refresh interceptors
│       ├── components/         # ProtectedRoute, Navbar, Sidebar
│       └── pages/              # Dashboards, Product CRUD, Ledger Management
└── README.md
```

---

## 🚀 Installation & Local Development

### 1. Prerequisites
Ensure you have **Python 3.10+** and **Node.js 18+** installed on your workstation.

---

### 2. Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create and activate a virtual environment:
   - **Windows (PowerShell)**:
     ```powershell
     python -m venv venv
     .\venv\Scripts\Activate.ps1
     ```
   - **Mac/Linux**:
     ```bash
     python3 -m venv venv
     source venv/bin/activate
     ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Run migrations (sets up SQLite local database by default):
   ```bash
   python manage.py makemigrations store_app
   python manage.py migrate
   ```
5. Seed initial test records (creates admin account, test customer "shyam", products, and logs):
   ```bash
   python seed.py
   ```
6. Run the local development server:
   ```bash
   python manage.py runserver
   ```
   The backend will be running on `http://127.0.0.1:8000/`.

---

### 3. Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd ../frontend
   ```
2. Install npm packages:
   ```bash
   npm install
   ```
3. Run the Vite developer server:
   ```bash
   npm run dev
   ```
   The frontend will be running on `http://localhost:5173/`.

---

## 🔑 Default Accounts (Seeded)

- **Admin User (Shop Owner)**:
  - **Username/Email**: `shivam1121@` or `admin@shivam.com`
  - **Password**: `Prajapatiadmin2005#$@`
  - **Role**: `ADMIN` (Access to inventory CRUD, customer ledgers, access toggles, and analytics)

- **Customer User (Shyam)**:
  - **Username/Email**: `shyam` or `shyam@gmail.com`
  - **Password**: `shyam123`
  - **Role**: `CUSTOMER` (Access to storefront, digital khata viewing when unlocked)

---

## 🔒 Environment Variables Configuration

Create a `.env` file in the `backend/` and `frontend/` folders for production deployment.

### Backend `.env`
```env
SECRET_KEY=your-production-secret-key
DEBUG=False
ALLOWED_HOSTS=shivam-backend.onrender.com,localhost
CORS_ALLOWED_ORIGINS=https://shivam-store.vercel.app
DATABASE_URL=postgres://user:password@neon-database-url/neondb?sslmode=require
```

### Frontend `.env`
```env
VITE_API_URL=https://shivam-backend.onrender.com/api
```

---

## 🌐 Production Deployment Guide

### Backend: Render
1. Create a new **Web Service** on Render connected to your git repository.
2. Select environment **Python**.
3. Set **Build Command**:
   ```bash
   pip install -r requirements.txt && python manage.py migrate
   ```
4. Set **Start Command**:
   ```bash
   gunicorn store_backend.wsgi:application
   ```
5. Add your `.env` variables under Render's **Environment Settings** tab. Ensure `DATABASE_URL` connects to your **Neon PostgreSQL** cluster.

### Frontend: Vercel
1. Create a new Project on Vercel connected to your git repository.
2. Set root directory to `frontend/`.
3. Vercel will auto-detect **Vite** and configure the build settings.
4. Add Environment Variable:
   - Key: `VITE_API_URL`
   - Value: `https://<your-render-backend-url>/api`
5. Click **Deploy**.

---

## 📈 Scalability & Future Architecture Recommendations
1. **Caching**: Integrate **Redis** to cache inventory product details and category queries, lowering database pressure.
2. **WebSockets**: Transition the ledger access toggle from polling/re-fetching to **Django Channels** (WebSockets) for instant real-time UI updates on client screens.
3. **SMS Alerts**: Integrate **Twilio** or **Msg91** to send SMS transaction receipts to customers whenever credit is issued or paid.
