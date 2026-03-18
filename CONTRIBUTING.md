# Contributing to Groundwork AI

Thank you for your interest in contributing! This document provides guidelines and instructions for contributing to the project.

## 🎯 How to Contribute

### **Found a Bug?**
1. Check the [issues](https://github.com/yourusername/groundwork-ai/issues) to see if it's already reported
2. If not, create a new issue with:
   - **Title**: Concise bug description
   - **Description**: Steps to reproduce, expected vs actual behavior
   - **Environment**: Python version, OS, relevant library versions
   - **Logs**: Error messages and stack traces

### **Want to Suggest a Feature?**
1. Open an issue with `[FEATURE]` prefix
2. Describe the problem it solves
3. Explain the expected behavior
4. Include use cases and examples

### **Want to Code?**
1. **Fork** the repository
2. **Create a branch** for your feature:
   ```bash
   git checkout -b feature/descriptive-name
   ```
3. **Make changes** following code style guidelines (below)
4. **Test locally** before submitting
5. **Commit with clear messages**:
   ```bash
   git commit -am 'Add feature: descriptive message'
   ```
6. **Push and open a Pull Request**

---

## 💻 Development Setup

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/groundwork-ai.git
cd groundwork-ai

# Create virtual environment
python -m venv venv
source venv/bin/activate

# Install development dependencies
pip install -r research_agent/requirements.txt
cd research_agent/frontend && npm install && cd ../..

# Setup .env
cp research_agent/.env.example research_agent/.env
# Add your API keys

# Start both servers
# Terminal 1 (Backend):
cd research_agent && python -m uvicorn main:app --reload

# Terminal 2 (Frontend):
cd research_agent/frontend && npm run dev
```

---

## 📝 Code Style Guidelines

### **Python (Backend)**

- **Format**: PEP 8 (use `black` if available)
- **Type hints**: Required for function signatures
- **Docstrings**: Use Google style for complex functions
- **Comments**: Explain "why", not "what" the code does
- **Line length**: 100 characters max
- **Naming**: `snake_case` for functions/variables, `PascalCase` for classes

**Example:**
```python
def _search_and_filter(query: str, max_results: int) -> list[dict[str, Any]]:
    """
    Search paper sources and filter by relevance.
    
    Args:
        query: Research query string
        max_results: Maximum papers to return (1-20)
    
    Returns:
        List of filtered paper dictionaries
    """
    # Why: Parallel I/O reduces latency significantly
    with ThreadPoolExecutor(max_workers=3) as executor:
        arxiv_future = executor.submit(arxiv_search, query, max_results)
        ...
```

### **JavaScript/React (Frontend)**

- **Format**: Prettier (configured in `vite.config.js`)
- **Component naming**: PascalCase for components
- **File naming**: kebab-case for files (e.g., `paper-list.jsx`)
- **Props**: Validate with TypeScript when possible
- **State**: Use hooks (useState, useEffect, useContext)

**Example:**
```javascript
const PaperGrid = ({ papers, loading }) => {
  const [sortBy, setSortBy] = useState('relevance');
  
  // Why: Memoization prevents unnecessary re-renders of large lists
  const sortedPapers = useMemo(() => {
    return papers.sort((a, b) => 
      a[sortBy] - b[sortBy]
    );
  }, [papers, sortBy]);
  
  return (
    <div className="grid grid-cols-3 gap-4">
      {sortedPapers.map(paper => (
        <PaperCard key={paper.id} paper={paper} />
      ))}
    </div>
  );
};
```

---

## ✅ Testing & Validation

### **Before Submitting a PR:**

- [ ] Code runs without errors
- [ ] Backend: No new warnings in linting
- [ ] Frontend: `npm run build` succeeds
- [ ] Tested with real API calls (not mocked)
- [ ] Checked for console errors/warnings
- [ ] Validated JSON responses with schema
- [ ] Tested edge cases (empty input, rate limits, etc.)

### **Running Tests:**
```bash
# Backend: Check for common issues
python -m py_compile research_agent/*.py

# Frontend: Build test
cd research_agent/frontend && npm run build
```

---

## 🔀 Pull Request Process

1. **Update your branch** with latest upstream:
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

2. **Write a clear PR description:**
   - What does it do? (Link the issue if applicable)
   - How does it work?
   - Any breaking changes?
   - Screenshots/demo if UI changes

3. **Ensure CI passes:**
   - No linting errors
   - No build failures
   - Tests pass (if applicable)

4. **Request reviews** from maintainers

5. **Address feedback** iteratively (no force-pushing)

**Example PR Template:**
```markdown
## 📝 Description
Fixes #123 - Add relevance sorting improvements

## 🎯 Changes
- Added configurable sort order for papers
- Implemented caching for repeated queries
- Updated API schema documentation

## 🧪 Testing
Tested with:
- 50+ academic queries (all domains)
- Rate-limit scenarios
- Empty result sets

## 📸 Screenshots
[Before/After if UI changes]
```

---

## 🌳 Branch Naming

- `feature/` - New features (e.g., `feature/vector-embeddings`)
- `fix/` - Bug fixes (e.g., `fix/null-pointer-exception`)
- `refactor/` - Code improvements (e.g., `refactor/api-client`)
- `docs/` - Documentation (e.g., `docs/api-guide`)

---

## 🚀 Release Checklist (For Maintainers)

- [ ] All PRs merged
- [ ] Version bumped in `package.json`
- [ ] CHANGELOG updated
- [ ] README examples tested
- [ ] Documentation current
- [ ] Git tag created (`v1.2.3`)
- [ ] Release notes published

---

## 📚 Project Architecture (For Contributors)

### **Key Directories**
```
research_agent/
├── agents.py           # 4-agent definitions (modify to add agents)
├── tasks.py            # Task prompts (modify for behavior changes)
├── crew.py             # Orchestration (core merger/dedup logic)
├── tools.py            # API wrappers (add new data sources here)
├── main.py             # FastAPI routes (add new endpoints here)
└── frontend/           # React components
```

### **To Add a New Data Source:**
1. Create wrapper function in `tools.py`
2. Add to `_search_all_sources()` in `crew.py` (ThreadPoolExecutor)
3. Update `_merge_deduplicate()` to handle new source
4. Update `tasks.py` to mention new source
5. Test with 3-5 queries

### **To Modify Synthesis Behavior:**
1. Edit `create_synthesize_task()` in `tasks.py`
2. Adjust relevance_tag definitions
3. Update synthesizer agent backstory in `agents.py`
4. Test with known papers

---

## 🤝 Code of Conduct

We're committed to providing a welcoming and inclusive experience for all contributors.

**Be respectful, constructive, and professional.** Harassment, discrimination, or disrespect will not be tolerated.

---

## ❓ Questions?

- **General**: Open a discussion on GitHub
- **Technical**: Create an issue with `[QUESTION]` prefix
- **Security**: Email maintainers privately (don't open public issues)

---

## 📄 License

By contributing, you agree that your contributions will be licensed under the same MIT License as the project.

---

**Thank you for making Groundwork AI better!** 🙏
