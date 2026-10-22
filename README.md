# Ki-Khobor X Hornbill (Backend)

Backend API service for **Ki-Khobor X Hornbill**, the official companion and information app for the Nagaland Hornbill Festival 2026.

## Tech Stack

- **Runtime**: Node.js 22 LTS (ES Modules)
- **Language**: TypeScript (Strict Mode)
- **HTTP Framework**: Fastify
- **Database**: MongoDB (Official `mongodb` driver & Atlas)
- **Validation**: Zod
- **Architecture**: Modular Monolith

---

## Getting Started

### 1. Prerequisites
- Node.js 22+ installed
- MongoDB instance (e.g. MongoDB Atlas connection string)

### 2. Environment Variables
Copy the `.env.example` file to `.env` and fill in your values:

```bash
cp .env.example .env
```

Ensure the following variables are defined:
```env
PORT=3000
NODE_ENV=development
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/<dbname>?retryWrites=true&w=majority
```

### 3. Installation
Install project dependencies:

```bash
npm install
```

### 4. Running the Application

- **Development mode** (with live reload via `tsx`):
  ```bash
  npm run dev
  ```

- **Build TypeScript**:
  ```bash
  npm run build
  ```

- **Production mode**:
  ```bash
  npm start
  ```

### 5. Health Check
Once running, verify service availability at:
```
GET http://localhost:<PORT>/health
```
Response:
```json
{
  "ok": true
}
```
