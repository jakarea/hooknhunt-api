# 📚 Instruction Folder - Smart Documentation System

## 🎯 How to Use (SUPER SIMPLE)

**Just say**: "Read instruction/global-lean.md"

That's it! The file will intelligently guide you on what else to load based on your task.

---

## 📁 File Structure

```
instruction/
├── README.md (this file - quick guide)
├── index.md (detailed file selection guide)
├── global-lean.md (START HERE - main reference)
├── global.md (full documentation - 7,000 tokens)
├── backend.md (backend-specific rules)
├── frontend.md (frontend-specific rules)
├── ux.md (UX patterns)
└── examples/
    ├── backend.md (backend code examples)
    └── frontend.md (frontend code examples)
```

---

## 🚀 Quick Start

### **For Daily Development** (Most Common)
```
You: "Read instruction/global-lean.md"

AI loads: 2,500 tokens
```

### **For Backend Work**
```
You: "Read instruction/global-lean.md"

AI loads: global-lean.md + backend.md (+ examples if needed)
Total: 4,000 tokens
```

### **For Frontend Work**
```
You: "Read instruction/global-lean.md"

AI loads: global-lean.md + frontend.md (+ examples if needed)
Total: 4,300 tokens
```

### **For Deep Learning**
```
You: "Read instruction/global.md"

AI loads: Full documentation
Total: 7,000 tokens
```

---

## 💡 Smart Features

### **1. Context-Aware Loading**
The `global-lean.md` file contains conditional sections:
- "If you're writing BACKEND code → also read: backend.md"
- "If you're writing FRONTEND code → also read: frontend.md"
- "If you're designing UX → also read: ux.md"

Based on your task, AI will automatically suggest loading additional files.

### **2. Cross-References**
Each file references related files:
```markdown
📖 Deep Dive: instruction/backend.md
💻 Code Examples: instruction/examples/backend.md
```

### **3. Self-Contained Files**
Each file is complete but not duplicated:
- `backend.md` - All backend rules (no frontend content)
- `frontend.md` - All frontend rules (no backend content)
- `ux.md` - All UX patterns (applicable to both)

---

## 📊 Token Comparison

| Scenario | Tokens | Savings |
|----------|--------|---------|
| **Daily work** (lean only) | 2,500 | 64% |
| **Backend work** | 4,000 | 43% |
| **Frontend work** | 4,300 | 39% |
| **UX work** | 3,700 | 47% |
| **Full context** | 7,000 | 0% |

---

## 🎯 File Selection Guide

### **When to Read What**

| Your Task | Read This |
|-----------|-----------|
| Starting new work | `global-lean.md` |
| Writing backend code | `global-lean.md` + `backend.md` |
| Writing frontend code | `global-lean.md` + `frontend.md` |
| Designing UX/UI | `global-lean.md` + `ux.md` |
| Need code examples | `examples/backend.md` or `examples/frontend.md` |
| Code review / Deep learning | `global.md` |

---

## 🔑 Key Principles

### **1. Start Small**
Always start with `global-lean.md` (2,500 tokens). It's your main reference.

### **2. Load as Needed**
Let the file guide you to additional resources based on your specific task.

### **3. Stay Focused**
Don't load everything at once. Load only what you need for current work.

### **4. Context Matters**
- Backend work? → Load backend files
- Frontend work? → Load frontend files
- UX work? → Load UX files

---

## 💬 Example Conversations

### **Example 1: Backend Development**
```
You: "Read instruction/global-lean.md. I'm working on a procurement service."

AI: Loads global-lean.md, sees you're doing backend work.
     "I'll also load instruction/backend.md for you."

AI: Loads both files (4,000 tokens total).
```

### **Example 2: Frontend Development**
```
You: "Read instruction/global-lean.md. Creating a React component."

AI: Loads global-lean.md, sees you're doing frontend work.
     "I'll also load instruction/frontend.md for you."

AI: Loads both files (4,300 tokens total).
```

### **Example 3: Code Review**
```
You: "Read instruction/global.md. I need to review a PR."

AI: Loads full documentation (7,000 tokens).
```

---

## 📖 Detailed Guide

See [instruction/index.md](./index.md) for:
- Complete decision tree
- Detailed file descriptions
- Usage strategies
- Token efficiency tips

---

## ✅ Best Practices

### **DO ✅**
- Start with `global-lean.md`
- Let AI suggest additional files
- Load task-specific files as needed
- Reference examples when coding

### **DON'T ❌**
- Load `global.md` for daily work (too large)
- Load all files at once (wastes tokens)
- Ignore context suggestions
- Skip examples when learning new patterns

---

## 🎯 Quick Reference

**For most cases**: Just say **"Read instruction/global-lean.md"**

**For specific tasks**:
- Backend: `instruction/backend.md`
- Frontend: `instruction/frontend.md`
- UX: `instruction/ux.md`
- Examples: `instruction/examples/`

**For deep learning**: `instruction/global.md`

---

## 📝 File Descriptions

| File | Tokens | Description |
|------|--------|-------------|
| **global-lean.md** | 2,500 | Main reference - START HERE |
| **backend.md** | 1,500 | Laravel 12, DTOs, Services, Repositories |
| **frontend.md** | 1,800 | React 18, Next.js 16, TypeScript, Zustand |
| **ux.md** | 1,200 | Optimistic UI, Skeleton, CLS, Micro-interactions |
| **examples/backend.md** | 1,500 | Backend code samples |
| **examples/frontend.md** | 1,800 | Frontend code samples |
| **global.md** | 7,000 | Full documentation (all content) |

---

## 🚀 Next Steps

1. **Start**: Say "Read instruction/global-lean.md"
2. **Work**: Let the file guide your development
3. **Learn**: Load specific files as needed
4. **Review**: Use `global.md` for comprehensive reviews

---

**💡 Remember**: The system is designed to be smart. Start with `global-lean.md` and let it guide you!

---

**Last Updated**: 2026-03-27
**Version**: 3.0 (Smart Folder Structure)
