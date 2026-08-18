# QuickTools 🚀

QuickTools is a high-performance, privacy-focused online tool suite for PDF manipulation, Image processing, and OCR text extraction. Built with Next.js (Frontend) and FastAPI (Python Backend).

---

## ⚡ Quick Start (Windows - 1-Click Launch)

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd Quick_tools
   ```

2. **Run the Application**:
   Simply **double-click `START_APP.bat`**!

   `START_APP.bat` will automatically:
   - Install `node_modules` (Frontend dependencies) if missing.
   - Create Python `venv` & install `requirements.txt` (Backend dependencies) if missing.
   - Start the FastAPI Backend on `http://127.0.0.1:8000`.
   - Start the Next.js Frontend on `http://localhost:3000`.
   - Open `http://localhost:3000` in your web browser automatically.

---

## 🛠 Manual Execution

If you prefer to start services manually in separate terminals:

### 1. Backend (FastAPI)
```bash
cd backend
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
python run.py
```
> API running on `http://127.0.0.1:8000` | Docs: `http://127.0.0.1:8000/docs`

### 2. Frontend (Next.js)
```bash
npm install
npm run dev
```
> Web App running on `http://localhost:3000`
