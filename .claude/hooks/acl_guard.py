#!/usr/bin/env python3
"""
ACL Guard — PreToolUse hook for the anti-corruption layer.

Blocks writes to services/ that would introduce monolith field leakage:
  - albumId field in any response shape
  - releaseYear typed as string (must be number in the new service)

Fires before every Write and Edit tool call. Exit code 2 = block the tool.
"""
import json
import re
import sys


PROTECTED_PATH_PREFIX = "services/"

ACL_VIOLATIONS = [
    (
        re.compile(r'[\"\']?albumId[\"\']?\s*[:\?]'),
        "ACL VIOLATION: 'albumId' is a dead field from the monolith. "
        "It must not appear in the new service's API shape. "
        "See adr/002-acl-boundary.md"
    ),
    (
        re.compile(r'releaseYear\??\s*:\s*string'),
        "ACL VIOLATION: 'releaseYear' must be type 'number' in the new service, "
        "not 'string'. The monolith stored it as a string — that was a bug we are fixing. "
        "See adr/002-acl-boundary.md"
    ),
]


def check_content(content: str) -> list[str]:
    errors = []
    for pattern, message in ACL_VIOLATIONS:
        if pattern.search(content):
            errors.append(message)
    return errors


def main():
    try:
        raw = sys.stdin.read()
        if not raw.strip():
            sys.exit(0)
        tool_input = json.loads(raw)
    except (json.JSONDecodeError, Exception):
        sys.exit(0)

    file_path = tool_input.get("file_path", "")
    if not file_path:
        sys.exit(0)

    # Only guard files inside services/
    normalized = file_path.replace("\\", "/")
    if PROTECTED_PATH_PREFIX not in normalized:
        sys.exit(0)

    # Get the content being written
    content = tool_input.get("content", "") or tool_input.get("new_string", "")
    if not content:
        sys.exit(0)

    errors = check_content(content)
    if errors:
        print("\n🚫 ANTI-CORRUPTION LAYER VIOLATION\n", file=sys.stderr)
        for err in errors:
            print(f"  ✗ {err}", file=sys.stderr)
        print(
            "\nThe PreToolUse hook blocked this write to preserve the service boundary.\n"
            "Fix the type or field name before proceeding.\n",
            file=sys.stderr
        )
        sys.exit(2)

    sys.exit(0)


if __name__ == "__main__":
    main()
