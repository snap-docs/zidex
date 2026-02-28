"""
AI explanation engine.
Tries Groq first, falls back to Gemini.
Returns clean minimal explanations based on case type.
"""

import time
from config import (
    GROQ_API_KEY, GEMINI_API_KEY,
    GROQ_MODELS, GEMINI_MODELS
)


# ── Prompt Templates ──────────────────────────────────────────────────────────

PROMPTS = {
    "code": """
You are simpledocs.ai. A coder selected this code and wants to understand it instantly.

Selected code:
{text}

Language: {language}
Context: {context}

Respond in this EXACT format and nothing else:

What it does: [one short sentence, plain English, no jargon]
Concept: [the programming concept name only, e.g. recursion, async/await, list comprehension]

Rules:
- Maximum 2 lines total
- No paragraphs
- No bullet points  
- No markdown
- No explanations of the format
- Plain English only
- If context is available use it to be more specific
""",

    "error": """
You are simpledocs.ai. A coder has this error in their terminal and needs to understand it instantly.

Error:
{text}

Respond in this EXACT format and nothing else:

Error: [what the error means in plain English, one sentence]
Why: [why it happened, one sentence]
Hint: [one specific direction to fix it, not the full solution]

Rules:
- Maximum 3 lines total
- No paragraphs
- No bullet points
- No markdown
- Hint must make them think, not just give the answer
- Plain English only
""",

    "other": """
You are simpledocs.ai. A coder selected this text and wants to understand it instantly.

Text:
{text}

Respond in this EXACT format and nothing else:

Means: [what this means in plain English, one sentence maximum]

Rules:
- One line only
- No paragraphs
- No bullet points
- No markdown
- Plain English only
"""
}


# ── Main Function ─────────────────────────────────────────────────────────────

def get_explanation(
    text: str,
    case_type: str,
    language: str = "Unknown",
    context: str = ""
) -> dict:
    """
    Get AI explanation for selected text.
    
    Returns:
    {
        "explanation": str,
        "provider": str,  # "groq" or "gemini"
        "model": str,
        "success": bool,
        "error": str or None
    }
    """
    prompt_template = PROMPTS.get(case_type, PROMPTS["other"])
    prompt = prompt_template.format(
        text=text[:3000],
        language=language,
        context=context[:1000] if context else "Not available"
    )

    # Try Groq first
    if GROQ_API_KEY:
        result = _try_groq(prompt)
        if result["success"]:
            return result

    # Fall back to Gemini
    if GEMINI_API_KEY:
        result = _try_gemini(prompt)
        if result["success"]:
            return result

    return {
        "explanation": "Could not get explanation. Check API keys.",
        "provider": "none",
        "model": "none",
        "success": False,
        "error": "All providers failed"
    }


def _try_groq(prompt: str) -> dict:
    try:
        from groq import Groq
        client = Groq(api_key=GROQ_API_KEY)

        for model in GROQ_MODELS:
            try:
                response = client.chat.completions.create(
                    model=model,
                    messages=[{"role": "user", "content": prompt}],
                    max_tokens=200,
                    temperature=0.3,
                )
                return {
                    "explanation": response.choices[0].message.content.strip(),
                    "provider": "groq",
                    "model": model,
                    "success": True,
                    "error": None
                }
            except Exception as e:
                if "429" in str(e) or "rate_limit" in str(e).lower():
                    break
                continue

    except ImportError:
        pass

    return {"success": False, "explanation": "", "provider": "groq", "model": "", "error": "Groq failed"}


def _try_gemini(prompt: str) -> dict:
    try:
        from google import genai
        client = genai.Client(api_key=GEMINI_API_KEY)

        for model in GEMINI_MODELS:
            try:
                response = client.models.generate_content(
                    model=model,
                    contents=prompt
                )
                return {
                    "explanation": response.text.strip(),
                    "provider": "gemini",
                    "model": model,
                    "success": True,
                    "error": None
                }
            except Exception as e:
                if "429" in str(e) or "ResourceExhausted" in str(e):
                    time.sleep(5)
                    continue
                continue

    except ImportError:
        pass

    return {"success": False, "explanation": "", "provider": "gemini", "model": "", "error": "Gemini failed"}
