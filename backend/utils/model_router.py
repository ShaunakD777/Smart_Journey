"""
Model Router
────────────
Builds the LangChain chat model used by each agent.

Gemini (through its OpenAI-compatible endpoint) is the primary model. Depending
on which API keys are configured, it falls back to Groq, a second Gemini key,
and OpenRouter. The UI can force a specific model via `ai_model_override`.
"""


def get_react_llm(agent_type: str = "", ai_model_override: str = None):
    """
    Returns a LangChain chat model for the given agent type, wrapped with
    `.with_fallbacks()` when fallback providers are configured.
    """
    from langchain_groq import ChatGroq
    from langchain_openai import ChatOpenAI
    from config import settings

    # 1. UI-driven manual overrides (with aliases for deprecated models)
    if ai_model_override in ("gemini-2.5-flash", "gemini-1.5-pro", "gemini-2.5-pro"):
        return ChatOpenAI(
            model="gemini-2.5-flash",
            api_key=settings.gemini_api_key,
            base_url="https://generativelanguage.googleapis.com/v1beta/openai/",
            temperature=0.4,
            max_retries=1
        )
    if ai_model_override == "gemini-3.1-flash-lite":
        return ChatOpenAI(
            model="gemini-3.1-flash-lite",
            api_key=settings.gemini_api_key,
            base_url="https://generativelanguage.googleapis.com/v1beta/openai/",
            temperature=0.4,
            max_retries=1
        )
    if ai_model_override in ("qwen/qwen3.8-27b", "llama-3.3-70b-versatile", "llama-3.1-8b-instant"):
        return ChatGroq(
            model="qwen/qwen3.8-27b",
            api_key=settings.groq_api_key,
            temperature=0.4,
            max_tokens=900,
            max_retries=1
        )

    # 2. Memory agent / chat copilot without an override: Gemini only
    if agent_type == "memory":
        return ChatOpenAI(
            model=settings.gemini_model or "gemini-2.5-flash",
            api_key=settings.gemini_api_key,
            base_url="https://generativelanguage.googleapis.com/v1beta/openai/",
            temperature=0.2,
            max_retries=1
        )

    # 3. Primary LLM (Gemini via OpenAI SDK to handle large contexts)
    primary_llm = ChatOpenAI(
        model=settings.gemini_model or "gemini-2.5-flash",
        api_key=settings.gemini_api_key,
        base_url="https://generativelanguage.googleapis.com/v1beta/openai/",
        temperature=0.4,
        max_retries=1
    )
    
    fallbacks = []

    # Fallback 1 (Groq)
    if settings.groq_api_key:
        fallbacks.append(ChatGroq(
            model=settings.model_groq_strong or "qwen/qwen3.8-27b",
            api_key=settings.groq_api_key,
            temperature=0.4,
            max_tokens=900,
            max_retries=1
        ))

    # Fallback 2 (Gemini with secondary key)
    if hasattr(settings, 'gemini_api_key_fallback') and settings.gemini_api_key_fallback:
        fallbacks.append(ChatOpenAI(
            model=settings.gemini_model or "gemini-2.5-flash",
            api_key=settings.gemini_api_key_fallback,
            base_url="https://generativelanguage.googleapis.com/v1beta/openai/",
            temperature=0.4,
            max_retries=1
        ))

    # Fallback 3 (OpenRouter)
    if settings.openrouter_api_key:
        fallbacks.append(ChatOpenAI(
            model=settings.model_openrouter_free or "qwen/qwen3.8-27b:free",
            api_key=settings.openrouter_api_key,
            base_url="https://openrouter.ai/api/v1",
            temperature=0.4,
            max_retries=1
        ))
    
    if fallbacks:
        return primary_llm.with_fallbacks(fallbacks)
    return primary_llm
