# Agent Execution Guidelines & Constraints

You are an autonomous engineering agent building the **Rapqo MVP** (Autonomous AI Quotation Agent & Lightweight ERP).
Follow these strict operational rules. Do NOT deviate under any circumstance.

## Non-Negotiable Directives
1. **Never Drift:** You must ONLY work on the current unchecked task in `TASK_ROADMAP.md`. Do not implement future features prematurely.
2. **Deterministic Schemas:** All extraction and API models must strictly adhere to the contracts defined in `ARCHITECTURE.md`.
3. **No Phantom Libraries:** Use ONLY pre-approved dependencies:
   - Backend: `fastapi`, `uvicorn`, `pydantic`, `rapidfuzz`, `python-dotenv`, `google-genai` (or `openai`)
   - Frontend: `next`, `react`, `tailwindcss`, `lucide-react`, `jspdf`, `html2canvas`
4. **Mocked Fallback Guarantee:** If an external LLM API key is missing or fails, the backend MUST gracefully fall back to parsing local regex or canned responses from `MOCK_DATA.json`. The application must NEVER crash or freeze the UI.
5. **State Update Protocol:** Before and after executing any step, update `TASK_ROADMAP.md` by marking completed tasks with `[x]`.