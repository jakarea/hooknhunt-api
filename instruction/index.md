# 📚 Instruction Index - Which File Should You Read?

**Quick Decision Tree**:
```
┌─ What are you doing?
│
├─ Daily development / Quick reference
│  └─ Read: global-lean.md (2,500 tokens)
│
├─ Writing backend code (Laravel)
│  ├─ Read: global-lean.md
│  └─ Read: backend.md (+1,500 tokens)
│
├─ Writing frontend code (React/Next.js)
│  ├─ Read: global-lean.md
│  └─ Read: frontend.md (+1,800 tokens)
│
├─ Designing UX/UI
│  ├─ Read: global-lean.md
│  └─ Read: ux.md (+1,200 tokens)
│
├─ Code review / Architecture decisions
│  └─ Read: global.md (7,000 tokens - full documentation)
│
└─ Need code examples
   ├─ Backend: examples/backend.md (+1,500 tokens)
   └─ Frontend: examples/frontend.md (+1,800 tokens)
```

---

## 📁 File Structure

| File | Tokens | When to Read | Purpose |
|------|--------|--------------|---------|
| **global-lean.md** | 2,500 | **Always** (start here) | Main reference with smart links |
| **backend.md** | 1,500 | Backend coding | Laravel, DTOs, Services, Repositories |
| **frontend.md** | 1,800 | Frontend coding | React, Next.js, TypeScript, Zustand |
| **ux.md** | 1,200 | UX/UI work | Optimistic UI, Skeleton, CLS, etc. |
| **examples/backend.md** | 1,500 | Need backend code | Working code samples |
| **examples/frontend.md** | 1,800 | Need frontend code | Working code samples |
| **global.md** | 7,000 | Deep learning/review | Complete documentation |

---

## 🎯 Smart Usage Strategy

### **For Daily Development** (Most Common)
```
Read: instruction/global-lean.md
↓
Task-specific file loads automatically based on context
```

### **For Backend Work**
```
You say: "Read instruction/global-lean.md"
↓
File says: "If writing backend code, also read: instruction/backend.md"
↓
System loads both files (4,000 tokens total)
```

### **For Frontend Work**
```
You say: "Read instruction/global-lean.md"
↓
File says: "If writing frontend code, also read: instruction/frontend.md"
↓
System loads both files (4,300 tokens total)
```

### **For Full Context**
```
You say: "Read instruction/global.md"
↓
System loads complete documentation (7,000 tokens)
```

---

## 📖 How to Use

### **Option 1: Let the File Guide You** (Recommended)
```
You: "Read instruction/global-lean.md"

The file contains conditional sections like:
┌─ "If you're writing BACKEND code → also read: backend.md"
├─ "If you're writing FRONTEND code → also read: frontend.md"
└─ "If you're designing UX → also read: ux.md"

Based on your task, I'll load the relevant files.
```

### **Option 2: Explicit File Selection**
```
You: "Read instruction/global-lean.md and instruction/backend.md"

I'll load exactly what you specify.
```

### **Option 3: Task-Based Request**
```
You: "I'm working on backend procurement module"

I'll automatically load:
- instruction/global-lean.md
- instruction/backend.md
- instruction/examples/backend.md
```

---

## 🚀 Recommended Workflow

### **Start of Session**
```
You: "Read instruction/global-lean.md"
```

### **During Work**
- I'll reference specific files as needed
- "See instruction/backend.md#dto for DTO examples"
- "See instruction/ux.md#optimistic-ui for optimistic updates"

### **Code Reviews**
```
You: "Read instruction/global.md"
```
Loads full documentation for comprehensive review.

---

## 💡 Token Efficiency

| Scenario | Tokens Loaded | Savings |
|----------|---------------|---------|
| Daily work (lean only) | 2,500 | 64% |
| Backend work | 4,000 | 43% |
| Frontend work | 4,300 | 39% |
| Full context | 7,000 | 0% |

---

## 📋 File Contents Summary

### **global-lean.md** (Start Here)
- 16 core principles
- Quick reference checklist
- Smart links to specific files
- When to read what

### **backend.md**
- DDD folder structure
- DTOs (Data Transfer Objects)
- Event-driven architecture
- Clean Architecture layers
- Railway Oriented Programming
- Repository pattern
- Service layer best practices

### **frontend.md**
- React 18 best practices
- Next.js 16 Server Components
- TypeScript type-safety
- Zod validation
- Zustand state management
- SWR pattern
- Code splitting
- Performance optimization

### **ux.md**
- Optimistic UI updates
- Skeleton loading states
- Zero Layout Shift (CLS)
- Micro-interactions
- Error empathy
- Keyboard navigation
- Mobile-first design
- Mental peace principles

### **examples/backend.md**
- DTO implementation examples
- Event-driven code samples
- Result objects
- Service/Repository patterns
- Immutability in PHP

### **examples/frontend.md**
- Type-safe components
- Zod validation
- Optimistic updates
- Skeleton states
- SWR implementation
- Server Components

---

## ✅ Quick Start

**Just say**: "Read instruction/global-lean.md"

The file will guide you on what else to load based on your specific task!

---

**Last Updated**: 2026-03-27
**Version**: 3.0 (Smart Folder Structure)
