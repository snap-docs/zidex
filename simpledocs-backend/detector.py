"""
Detects whether selected text is:
- code
- terminal error
- other text

Used to determine which prompt template to use.
"""

import re


def detect_case(text: str) -> str:
    """
    Returns: 'code', 'error', or 'other'
    """
    if not text or not text.strip():
        return "other"

    text_stripped = text.strip()

    # Terminal error patterns
    error_patterns = [
        r"Traceback \(most recent call last\)",
        r"Error:",
        r"Exception:",
        r"SyntaxError",
        r"TypeError",
        r"ValueError",
        r"NameError",
        r"AttributeError",
        r"ImportError",
        r"ModuleNotFoundError",
        r"FileNotFoundError",
        r"IndexError",
        r"KeyError",
        r"ZeroDivisionError",
        r"RuntimeError",
        r"NullPointerException",
        r"ClassNotFoundException",
        r"SQLException",
        r"ENOENT",
        r"EACCES",
        r"npm ERR!",
        r"yarn error",
        r"pip.*error",
        r"fatal error",
        r"cannot find module",
        r"is not defined",
        r"undefined is not",
        r"failed to compile",
        r"compilation error",
        r"\[ERROR\]",
        r"exit code [0-9]+",
        r"HTTP [45][0-9]{2}",
    ]

    for pattern in error_patterns:
        if re.search(pattern, text_stripped, re.IGNORECASE):
            return "error"

    # Code patterns
    code_patterns = [
        r"\bdef \w+\s*\(",
        r"\bclass \w+",
        r"\bimport \w+",
        r"\bfrom \w+",
        r"\bfunction\s+\w+\s*\(",
        r"\bconst\s+\w+\s*=",
        r"\blet\s+\w+\s*=",
        r"\bvar\s+\w+\s*=",
        r"\bif\s*\(.+\)\s*\{",
        r"\bfor\s*\(.+\)\s*\{",
        r"\bwhile\s*\(.+\)\s*\{",
        r"=>\s*\{",
        r"\breturn\s+",
        r"#include\s*<",
        r"\bpublic\s+class\b",
        r"\bprivate\s+\w+",
        r"\bvoid\s+\w+\s*\(",
        r"SELECT\s+.+\s+FROM",
        r"INSERT\s+INTO",
        r"UPDATE\s+\w+\s+SET",
        r"\$\w+\s*=",
        r"->",
        r"::\w+",
        r"\[\s*\d+\s*\]",
        r'"""',
        r"'''",
    ]

    code_score = sum(
        1 for pattern in code_patterns
        if re.search(pattern, text_stripped, re.IGNORECASE)
    )

    if code_score >= 2:
        return "code"

    # Check for code-like structure (indentation, symbols)
    lines = text_stripped.splitlines()
    if len(lines) > 1:
        indented = sum(1 for l in lines if l.startswith(("    ", "\t")))
        if indented / len(lines) > 0.3:
            return "code"

    return "other"


def detect_language(text: str) -> str:
    """
    Detects programming language from code text.
    Returns language name or 'Unknown'.
    """
    patterns = {
        "Python":     [r'\bdef \w+\(', r'\bimport \w+', r'\bprint\(', r'\.py\b'],
        "JavaScript": [r'\bconst \w+', r'\bfunction \w+\(', r'=>', r'console\.log'],
        "TypeScript": [r'\binterface \w+', r':\s*string', r':\s*number', r'\.ts\b'],
        "Java":       [r'\bpublic class\b', r'\bSystem\.out', r'\bvoid \w+\('],
        "C++":        [r'#include\s*<', r'\bstd::', r'cout\s*<<'],
        "CSS":        [r'[a-z-]+\s*:\s*[^;]+;', r'\{[\s\S]*?\}'],
        "HTML":       [r'<[a-z]+[\s>]', r'</[a-z]+>'],
        "SQL":        [r'\bSELECT\b', r'\bFROM\b', r'\bWHERE\b'],
        "Bash":       [r'^#!/', r'\$\w+', r'\becho\b'],
        "Rust":       [r'\bfn \w+\(', r'\blet mut\b', r'\bimpl\b'],
        "Go":         [r'\bfunc \w+\(', r'\bpackage \w+', r':='],
    }

    scores = {
        lang: sum(1 for p in pats if re.search(p, text, re.IGNORECASE))
        for lang, pats in patterns.items()
    }

    best = max(scores, key=scores.get)
    return best if scores[best] > 0 else "Unknown"
