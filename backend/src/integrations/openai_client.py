# ── Anthropic Client Integration ─────────────────────────────────────────────
"""
Anthropic Claude client with structured outputs for AI suggestion generation.

Key features:
- Pinned model: claude-sonnet-4-6 (CONSTITUTION-MANDATED: Only valid model)
- JSON schema-based structured outputs with Pydantic schemas
- Built-in retry logic (max_retries=3) with exponential backoff
- Content-hash caching (24h TTL) to avoid redundant API calls

Per research.md R3 and Constitution Principle VI.
"""
import hashlib
import json
import os
from datetime import datetime, timedelta
from typing import Optional, TypeVar

from anthropic import AsyncAnthropic
from pydantic import BaseModel

# Singleton instance
_client: Optional[AsyncAnthropic] = None

# Model pin - Constitution Principle VI: ONLY claude-sonnet-4-6 is permitted
ANTHROPIC_MODEL = os.getenv("ANTHROPIC_MODEL", "claude-sonnet-4-6")

# Validate model compliance with constitution
VALID_MODELS = {"claude-sonnet-4-6"}
if ANTHROPIC_MODEL not in VALID_MODELS:
    raise ValueError(
        f"Invalid ANTHROPIC_MODEL: '{ANTHROPIC_MODEL}'. "
        f"Constitution Principle VI mandates ONLY 'claude-sonnet-4-6' is permitted. "
        f"Update your environment configuration to use the valid model."
    )

# Cache TTL
CACHE_TTL_HOURS = 24

T = TypeVar("T", bound=BaseModel)


def get_anthropic_client() -> AsyncAnthropic:
    """Get or create the AsyncAnthropic singleton."""
    global _client
    if _client is None:
        api_key = os.getenv("ANTHROPIC_API_KEY")
        if not api_key:
            raise ValueError("ANTHROPIC_API_KEY environment variable is required")
        _client = AsyncAnthropic(
            api_key=api_key,
            max_retries=3,  # Built-in exponential backoff for 429/5xx
        )
    return _client


def compute_content_hash(content: str) -> str:
    """Compute SHA-256 hash of content for caching."""
    return hashlib.sha256(content.encode("utf-8")).digest().hex()


async def request_structured_completion(
    developer_instructions: str,
    user_message: str,
    response_model: type[T],
    cache_key: Optional[str] = None,
    cache_store: Optional[dict] = None,
) -> tuple[T, bool]:
    """
    Request a structured completion from OpenAI with optional caching.
Anthropic Claude with optional caching.

    Args:
        developer_instructions: System role instructions
        user_message: User message content
        response_model: Pydantic model for structured output
        cache_key: Optional cache key for result caching
        cache_store: Optional dictionary to use for caching (must be persistent)

    Returns:
        Tuple of (parsed_response, was_cached)

    Raises:
        anthropic.APIError: On Anthropic API errors
        ValueError: If model refuses or response invalid
    """
    # Check cache if enabled
    if cache_key and cache_store is not None:
        cached = cache_store.get(cache_key)
        if cached:
            cached_at = datetime.fromisoformat(cached["cached_at"])
            if datetime.utcnow() - cached_at < timedelta(hours=CACHE_TTL_HOURS):
                # Cache hit
                return response_model.model_validate(cached["response"]), True

    # Make API request with JSON schema for structured output
    client = get_anthropic_client()
    
    # Generate JSON schema from Pydantic model
    schema = response_model.model_json_schema()
    
    # Construct prompt that requests JSON output matching the schema
    structured_prompt = f"""{user_message}

Please respond with a valid JSON object that matches this schema:
{json.dumps(schema, indent=2)}

Respond ONLY with the JSON object, no other text."""

    message = await client.messages.create(
        model=ANTHROPIC_MODEL,
        max_tokens=8000,  # Increased from 4096 to allow complete responses for complex analyses
        system=developer_instructions,
        messages=[
            {"role": "user", "content": structured_prompt}
        ],
    )

    # Extract text content
    if not message.content or len(message.content) == 0:
        raise ValueError("Model returned empty response")
    
    content = message.content[0]
    if content.type != "text":
        raise ValueError("Model did not return text content")
    
    response_text = content.text.strip()
    
    # Parse JSON response
    try:
        # Remove markdown code blocks if present
        if response_text.startswith("```"):
            lines = response_text.split("\n")
            # Remove first and last lines (code fence)
            response_text = "\n".join(lines[1:-1])
            # Remove language identifier if present
            if response_text.startswith("json"):
                response_text = response_text[4:].strip()
        
        response_data = json.loads(response_text)
        parsed_response = response_model.model_validate(response_data)
    except (json.JSONDecodeError, ValueError) as e:
        # Show more context for debugging truncation issues
        truncated_response = response_text[:1000] if len(response_text) > 1000 else response_text
        raise ValueError(
            f"Failed to parse model response as JSON: {e}\n"
            f"Response length: {len(response_text)} chars\n"
            f"Response preview: {truncated_response}"
        )
    # Cache result if enabled
    if cache_key and cache_store is not None:
        cache_store[cache_key] = {
            "response": parsed_response.model_dump(mode="json"),
            "cached_at": datetime.utcnow().isoformat(),
        }

    return parsed_response, False


# ── Testing Support ───────────────────────────────────────────────────────────

def reset_client() -> None:
    """Reset singleton for testing. NOT for production use."""
    global _client
    _client = None
