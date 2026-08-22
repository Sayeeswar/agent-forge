import os
import re

import requests
from dotenv import load_dotenv

load_dotenv()

GITHUB_TOKEN = os.getenv("GITHUB_TOKEN")

PR_URL = "https://github.com/Sayeeswar/agent-forge/pull/2"


def parse_github_pr_url(url: str):
    """Extract owner, repository, and PR number."""

    pattern = r"https://github\.com/([^/]+)/([^/]+)/pull/(\d+)"

    match = re.match(pattern, url.strip())

   
    owner, repo, pr_number = match.groups()
     
    return owner, repo, int(pr_number)


def get_pr_from_github(url: str):
    """Get PR metadata and the complete PR diff."""

    owner, repo, pr_number = parse_github_pr_url(url)

    print("\n=== PARSED URL ===")
    print("Owner:", owner)
    print("Repository:", repo)
    print("PR Number:", pr_number)

    api_url = (
        f"https://api.github.com/repos/"
        f"{owner}/{repo}/pulls/{pr_number}"
    )

    headers = {
        "Authorization": f"Bearer {GITHUB_TOKEN}",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    }

    print("\n=== GETTING PR METADATA ===")

    response = requests.get(
        api_url,
        headers=headers,
        timeout=30,
    )

    response.raise_for_status()

    pr = response.json()

    print("PR metadata received.")

    print("\n=== PR INFORMATION ===")
    print("Repository:", f"{owner}/{repo}")
    print("PR Number:", pr_number)
    print("Title:", pr["title"])
    print("Description:", pr["body"])
    print("Author:", pr["user"]["login"])
    print("State:", pr["state"])
    print("Draft:", pr["draft"])
    print("Mergeable:", pr["mergeable"])

    print("\n=== BRANCH INFORMATION ===")
    print("Base branch:", pr["base"]["ref"])
    print("Head branch:", pr["head"]["ref"])
    print("Head SHA:", pr["head"]["sha"])

    print("\n=== CHANGE STATISTICS ===")
    print("Changed files:", pr["changed_files"])
    print("Additions:", pr["additions"])
    print("Deletions:", pr["deletions"])

    print("\n=== GETTING PR DIFF ===")

    diff_response = requests.get(
        api_url,
        headers={
            **headers,
            "Accept": "application/vnd.github.v3.diff",
        },
        timeout=30,
    )

    diff_response.raise_for_status()

    diff = diff_response.text

    print("Diff received.")
    print("Diff size:", len(diff), "characters")

    print("\n" + "=" * 80)
    print("FULL PULL REQUEST DIFF")
    print("=" * 80)

    print(diff)

    return {
        "repository": f"{owner}/{repo}",
        "pr_number": pr_number,
        "title": pr["title"],
        "description": pr["body"],
        "state": pr["state"],
        "draft": pr["draft"],
        "mergeable": pr["mergeable"],
        "base_branch": pr["base"]["ref"],
        "head_branch": pr["head"]["ref"],
        "head_sha": pr["head"]["sha"],
        "author": pr["user"]["login"],
        "additions": pr["additions"],
        "deletions": pr["deletions"],
        "changed_files": pr["changed_files"],
        "diff": diff,
    }


if __name__ == "__main__":

    if not GITHUB_TOKEN:







        raise RuntimeError(
            "GITHUB_TOKEN was not found in your .env file."
        )

    try:
        pr_data = get_pr_from_github(PR_URL)

        print("\n" + "=" * 80)
        print("SUCCESS")
        print("=" * 80)

        print("\nPR successfully extracted.")
        print("Repository:", pr_data["repository"])
        print("PR:", pr_data["pr_number"])
        print("Files changed:", pr_data["changed_files"])

    except requests.HTTPError as exc:
        print("\nGitHub API error:")
        print(exc)

    except Exception as exc:
        print("\nError:")
        print(exc)