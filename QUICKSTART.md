# Quick Start Guide

Get Groundwork AI running in under 5 minutes.

## 1️⃣ Get API Keys (2 minutes)

### Groq API Key
1. Visit https://console.groq.com/
2. Sign up (free)
3. Copy your API key

### Tavily API Key
1. Visit https://tavily.com/
2. Sign up (free tier: 1000 calls/month)
3. Copy your API key

## 2️⃣ Setup Backend (2 minutes)

```bash
cd research_agent

# Create Python environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure .env
cp .env.example .env
# Edit .env and paste your API keys
notepad .env  # Or use your editor

# Start backend server
python -m uvicorn main:app --reload
```

**Output should show**:
```
Uvicorn running on http://127.0.0.1:8000
```

## 3️⃣ Setup Frontend (1 minute)

```bash
cd frontend
npm install
npm run dev
```

**Output should show**:
```
  VITE v7.1.3  ready in 234 ms

  ➜  Local:   http://localhost:5173/
  ➜  press h to show help
```

## 4️⃣ Test It

### Option A: Web Interface (Recommended)
1. Open http://localhost:5173
2. Type: `"attention mechanism in transformers"`
3. Click Search
4. Wait 3-5 seconds for results
5. Click PDF to export

### Option B: API Test
```bash
curl -X POST http://localhost:8000/research \
  -H "Content-Type: application/json" \
  -d '{
    "topic": "graph neural networks",
    "max_results": 5
  }'
```

---

## ⚠️ Common Issues

### "GROQ_API_KEY is missing"
→ Double-check `.env` file exists and has your key

### "Connection refused on port 8000"
→ Backend not running. Run `python -m uvicorn main:app --reload`

### "Cannot find module named 'crewai'"
→ Run `pip install -r requirements.txt` in the correct directory

### "npm: command not found"
→ Install Node.js from https://nodejs.org/

---

## 🎯 What Happens Next

1. **Query splits into 3 searches** across ArXiv, Semantic Scholar, and Tavily
2. **Results merge and deduplicate** (3-5 seconds)
3. **LLM evaluates each paper** for topical relevance
4. **Synthesizer writes prose** with citations
5. **Frontend displays results** with source badges and relevance tags
6. **PDF export available** in professional format

---

## 📖 Next Steps

- Read [README.md](../README.md) for full documentation
- Explore [API endpoints](../README.md#api-endpoints)
- Check [Architecture](../README.md#-architecture) for system design
- Review [examples](../README.md#-example-outputs)

---

## 💬 Need Help?

- Check the [README troubleshooting section](../README.md)
- Open an issue on GitHub
- Review server logs for error details

**Enjoy your research!** 🚀
