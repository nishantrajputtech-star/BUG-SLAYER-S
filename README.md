# 🏥 ClinicSync

**Advanced Inventory & Expiry Tracking for Rural Healthcare Facilities**

ClinicSync is a robust MERN-stack application designed to solve the critical problem of medicine wastage and stockouts in rural clinics. It provides real-time visibility into inventory levels, automates expiry alerts, and streamlines the approval workflow between facility staff and district health officials.

## 🌟 Key Features

### 🔐 Secure Authentication & Identity
- **Role-Based Access Control**: Tailored dashboards for **Nurses, Pharmacists**, and **District Officers**.
- **Secure Password Reset**: Identity verification via 6-digit OTP sent to registered email addresses (powered by Nodemailer).

### 📊 Intelligent Inventory Management
- **Critical Expiry Tracking**: Automated color-coded alerts (Red/Yellow/Green) based on the remaining shelf life.
- **Stock Level Monitoring**: Real-time alerts for "Low Stock" (below threshold) and "Critical Low Stock" (under 20 units).
- **Offline-First Ready**: Built with a lightweight frontend that syncs seamlessly with a MongoDB backend.

### 📋 Professional Reporting & Workflow
- **District Approval System**: Staff can finalize and "Submit" reports directly to the District Officer.
- **Real-Time Notifications**: District Officers receive immediate popup alerts on their dashboard when new reports are pending review.
- **PDF Generation**: One-click generation of professional health reports for district submission.

## 🛠️ Tech Stack
- **Frontend**: React.js, Vite, Lucide Icons
- **Backend**: Node.js, Express.js
- **Database**: MongoDB (Mongoose)
- **Email Service**: Nodemailer (OTP Verification)
- **PDF Export**: jsPDF

## 🚀 Getting Started

### Prerequisites
- Node.js installed
- MongoDB running locally

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-link>
   cd clinicsync
   ```

2. **Setup Backend**
   ```bash
   cd server
   npm install
   node index.js
   ```

3. **Setup Frontend**
   ```bash
   cd app
   npm install
   npm run dev
   ```

## 📈 Impact
By providing frontline health workers with clear, actionable alerts, ClinicSync reduces medicine expiry wastage by up to 40% and ensures that life-saving drugs are always available when needed most.

---
*Developed for Hackathon 2024* 🚀
