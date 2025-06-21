from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type
from openai import OpenAIError, RateLimitError, APIConnectionError
import logging

logger = logging.getLogger(__name__)

# Retry decorator for OpenAI API calls
openai_retry = retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=4, max=10),
    retry=retry_if_exception_type((RateLimitError, APIConnectionError)),
    reraise=True
)

# Retry decorator for general API calls
general_retry = retry(
    stop=stop_after_attempt(2),
    wait=wait_exponential(multiplier=1, min=2, max=5),
    reraise=True
)

async def safe_openai_call(func, *args, **kwargs):
    """
    Safely execute an OpenAI API call with retry logic and error handling
    """
    try:
        return await func(*args, **kwargs)
    except OpenAIError as e:
        logger.error(f"OpenAI API error: {e}")
        raise
    except Exception as e:
        logger.error(f"Unexpected error in OpenAI call: {e}")
        raise 