import json
import os
import re

import requests
from dotenv import load_dotenv

from pr_github import get_pr_from_github


load_dotenv()


OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")

OPENROUTER_MODEL = os.getenv(
    "OPENROUTER_MODEL",
    "nvidia/nemotron-3-nano-30b-a3b:free",
)


# ---------------------------------------------------------------------------
# Verification rules
# ---------------------------------------------------------------------------

VERIFICATION_CRITERIA = """
1. Logical correctness
   The implementation must make sense and fulfill the stated purpose
   of the Pull Request.

2. Security
   The change must not introduce obvious security vulnerabilities.

3. Sensitive information
   APIs must not expose passwords, tokens, credentials, private data,
   or other sensitive information.

4. FastAPI correctness
   FastAPI endpoints must use appropriate validation, status codes,
   and error handling.

5. Database safety
   Database operations must be safe, properly handled, and appropriate
   for the application's architecture.

6. Regression risk
   Existing functionality should not be unnecessarily broken.

7. Code quality
   The implementation should follow reasonable Python, FastAPI,
   and software engineering practices.

8. Secrets
   The Pull Request must not contain hard-coded passwords, API keys,
   access tokens, private keys, or credentials.

9. Testing
    The Pull Request should contain appropriate tests for the
    functionality being changed.

10. Performance
    The implementation must not introduce obvious performance problems.

11. Maintainability
    The implementation should be reasonably clean and maintainable
    for production use.

"""


# ---------------------------------------------------------------------------
# Deterministic repository checks
# ---------------------------------------------------------------------------


def extract_changed_files(diff: str):
    """
    Extract changed file names from a standard Git diff.
    """

    files = []

    for line in diff.splitlines():

        if line.startswith("diff --git "):

            match = re.match(
                r"diff --git a/(.*?) b/(.*)",
                line,
            )

            if match:

                old_file = match.group(1)
                new_file = match.group(2)

                if new_file != "/dev/null":
                    files.append(new_file)

                elif old_file != "/dev/null":
                    files.append(old_file)

    return files


# ---------------------------------------------------------------------------
# Prompt
# ---------------------------------------------------------------------------

def build_review_prompt(pr_data: dict):

    return f"""
You are a senior software engineer performing a Pull Request review.

You are a VERIFICATION AGENT.

You are NOT a coding agent.

Your responsibility is to determine whether this Pull Request is
ready to merge.

DO NOT write code.

DO NOT generate code snippets.

DO NOT modify code.

DO NOT provide replacement implementations.

If a change is required, explain it only in plain English.

The final decision must be based on the Pull Request evidence.

============================================================
VERIFICATION CRITERIA
============================================================

{VERIFICATION_CRITERIA}

============================================================
PULL REQUEST
============================================================

Repository:
{pr_data["repository"]}

Pull Request:
#{pr_data["pr_number"]}

Title:
{pr_data["title"]}

Description:
{pr_data["description"]}

Author:
{pr_data["author"]}

Base branch:
{pr_data["base_branch"]}

Head branch:
{pr_data["head_branch"]}

Changed files:
{pr_data["changed_files"]}

Additions:
{pr_data["additions"]}

Deletions:
{pr_data["deletions"]}


============================================================
PULL REQUEST DIFF
============================================================

{pr_data["diff"]}

============================================================
DECISION RULE
============================================================

Approve ONLY when all applicable criteria are satisfied.

If there is uncertainty about a critical criterion, do NOT approve.
Mark the Pull Request as CHANGES_REQUIRED and explain what needs
to be verified or changed.

============================================================
RESPONSE FORMAT
============================================================

Return ONLY valid JSON.

The JSON must have exactly this structure:

{{
    "status": "APPROVED",
    "score": 100,
    "summary": "All verification criteria are satisfied.",
    "changes_required": []
}}

OR:

{{
    "status": "CHANGES_REQUIRED",
    "score": 70,
    "summary": "The Pull Request requires changes before merging.",
    "changes_required": [
        {{
            "criterion": "Criterion number",
            "file": "Affected file",
            "problem": "Plain English explanation",
            "required_change": "Plain English description of the required change"
        }}
    ]
}}

Do not include Markdown.

Do not include ```.

Do not include source code.

Do not include additional fields.
"""


# ---------------------------------------------------------------------------
# JSON parsing
# ---------------------------------------------------------------------------

def parse_model_response(content: str):

    content = content.strip()

    # Remove accidental Markdown fences.
    if content.startswith("```json"):
        content = content[7:]

    elif content.startswith("```"):
        content = content[3:]

    if content.endswith("```"):
        content = content[:-3]

    content = content.strip()

    try:
        result = json.loads(content)

    except json.JSONDecodeError as exc:

        print("\n" + "=" * 80)
        print("INVALID MODEL RESPONSE")
        print("=" * 80)
        print(content)
        print("=" * 80)

        raise ValueError(
            "OpenRouter returned invalid JSON."
        ) from exc

    validate_review_result(result)

    return result


def validate_review_result(result: dict):

    required_fields = {
        "status",
        "score",
        "summary",
        "changes_required",
    }

    missing = required_fields - result.keys()

    if missing:

        raise ValueError(
            f"Model response is missing fields: {missing}"
        )

    if result["status"] not in {
        "APPROVED",
        "CHANGES_REQUIRED",
    }:

        raise ValueError(
            f"Invalid review status: {result['status']}"
        )

    if not isinstance(result["changes_required"], list):

        raise ValueError(
            "changes_required must be a list."
        )

    # Never allow APPROVED with unresolved problems.
    if (
        result["status"] == "APPROVED"
        and result["changes_required"]
    ):

        raise ValueError(
            "Model returned APPROVED while changes_required is not empty."
        )


# ---------------------------------------------------------------------------
# OpenRouter
# ---------------------------------------------------------------------------

def review_with_model(
    pr_data: dict,
):

    if not OPENROUTER_API_KEY:

        raise RuntimeError(
            "OPENROUTER_API_KEY was not found in .env"
        )

    prompt = build_review_prompt(
        pr_data,
    )

    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost",
        "X-Title": "GitHub PR Verification Agent",
    }

    payload = {
        "model": OPENROUTER_MODEL,

        "messages": [
            {
                "role": "system",
                "content": (
                    "You are a strict Pull Request verification "
                    "agent. Return only valid text resp."
                ),
            },
            {
                "role": "user",
                "content": prompt,
            },
        ],

        "stream": False,

        "temperature": 0,

        "max_tokens": 4000,
    }

    print("\nSending PR to OpenRouter...")
    print("Model:", OPENROUTER_MODEL)

    response = requests.post(
        OPENROUTER_URL,
        headers=headers,
        json=payload,
        timeout=300,
    )

    if not response.ok:

        print("\nOpenRouter error:")
        print("Status:", response.status_code)
        print("Response:", response.text)

    response.raise_for_status()

    result = response.json()

    try:

        content = (
            result["choices"][0]["message"]["content"]
        )

    except (KeyError, IndexError) as exc:

        print("\nUnexpected OpenRouter response:")
        print(json.dumps(result, indent=4))

        raise ValueError(
            "OpenRouter response did not contain model content."
        ) from exc

    return parse_model_response(content)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():

    pr_url = (
        "https://github.com/"
        "Sayeeswar/agent-forge/pull/2"
    )

    print("\n" + "=" * 80)
    print("GITHUB PR VERIFICATION AGENT")
    print("=" * 80)

    print("\nGetting Pull Request from GitHub...")

    pr_data = get_pr_from_github(pr_url)

    print(
        f"\nRepository: {pr_data['repository']}"
    )

    print(
        f"PR: #{pr_data['pr_number']}"
    )

    print(
        f"Title: {pr_data['title']}"
    )

    print(
        f"Changed files: {pr_data['changed_files']}"
    )

    # -------------------------------------------------------
    # Deterministic checks
    # -------------------------------------------------------

    print("\nRunning deterministic repository checks...")

    
    # -------------------------------------------------------
    # LLM review
    # -------------------------------------------------------

    review = review_with_model(
        pr_data,
    )

    # -------------------------------------------------------
    # Final result
    # -------------------------------------------------------

    print("\n" + "=" * 80)
    print("FINAL VERIFICATION RESULT")
    print("=" * 80)

    print(
        json.dumps(
            review,
            indent=4,
        )
    )

    print("\n" + "=" * 80)

    if review["status"] == "APPROVED":

        print("RESULT: APPROVED")
        print("The Pull Request is ready for the next approval stage.")

    else:

        print("RESULT: CHANGES REQUIRED")

        print("\nRequired changes:")

        for change in review["changes_required"]:

            print(
                f"\nCriterion: {change['criterion']}"
            )

            print(
                f"File: {change['file']}"
            )

            print(
                f"Problem: {change['problem']}"
            )

            print(
                f"Required change: "
                f"{change['required_change']}"
            )


if __name__ == "__main__":
    main()