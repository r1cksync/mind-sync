import requests

OPENROUTER_API_KEY = "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"
OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions"

def test_api_key():
    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
    }
    payload = {
    "model": "meta-llama/llama-3.1-8b-instruct",
    "messages": [{"role": "user", "content": "Test"}],
    "max_tokens": 10
}

    try:
        response = requests.post(OPENROUTER_API_URL, json=payload, headers=headers, timeout=10)
        response.raise_for_status()
        print("API key is valid. Response:", response.json()["choices"][0]["message"]["content"])
        return True
    except requests.exceptions.HTTPError as e:
        print(f"API key error: {e.response.status_code} - {e.response.text}")
        return False
    except requests.exceptions.RequestException as e:
        print(f"Request error: {e}")
        return False

if __name__ == "__main__":
    test_api_key()