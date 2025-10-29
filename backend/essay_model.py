from flask import Flask, request, jsonify
from flask_cors import CORS
from openai import OpenAI
from dotenv import load_dotenv
import os
import logging

# Set up logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)  # Enable CORS to allow communication with the frontend

# Load environment variables
load_dotenv()
OPENROUTER_API_KEY = os.getenv('OPENROUTER_API_KEY')

# Validate API key
if not OPENROUTER_API_KEY:
    raise ValueError("OPENROUTER_API_KEY is not set in the .env file")

# Initialize OpenRouter client
client = OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=OPENROUTER_API_KEY,
)

@app.route('/api/analyze-essay', methods=['POST'])
def analyze_essay():
    try:
        # Get the input data from the request
        data = request.get_json()
        user_id = data.get('user_id')  # For logging or authentication purposes

        # Extract the user responses
        user_responses = {
            "Q1": data.get('Q1', ''),
            "Q2": data.get('Q2', ''),
            "Q3": data.get('Q3', ''),
        }

        # Validate input
        for key, value in user_responses.items():
            if not value or not isinstance(value, str) or len(value.strip()) == 0:
                return jsonify({'error': f'Missing or invalid response for {key}'}), 400

        # Construct the prompt for a full report
        prompt = f"""
You are an expert mental health analysis model trained to assess emotional well-being based on a person's written responses. Given the following responses, analyze them in detail and provide a comprehensive report on the user's mental health, including a probability estimate of depression.

### Instructions:
1. **Emotional Analysis:** Identify emotional patterns, signs of sadness, numbness, or frustration.
2. **Linguistic and Cognitive Patterns:** Analyze tone, self-referential language, and cognitive distortions.
3. **Behavioral and Motivation Indicators:** Detect changes in habits, social withdrawal, and motivation loss.
4. **Coping Mechanisms:** Evaluate adaptive vs. maladaptive coping strategies.
5. **Overall Assessment:** Provide a detailed report with the following sections:
   - **Summary of Emotional State:** Describe the user's emotional well-being.
   - **Risk Factors:** Highlight any concerning patterns or behaviors.
   - **Protective Factors:** Identify any positive or adaptive behaviors.
   - **Depression Probability:** Provide a probability score (0-100%) with supporting observations in the format "Depression Probability: X%".
   - **Recommendations:** Offer actionable advice to improve mental well-being.
6. Be empathetic, professional, and supportive in your tone.
7. Ensure that the 'Depression Probability: X%' line is included exactly as specified, with a numeric value between 0 and 100, followed by a '%' sign.

### Example Cases for Depression Probability:
- **Low Depression Probability (0-15%)**: Engaged in daily life, good coping strategies, stable emotions.
- **Moderate Depression Probability (30-50%)**: Some withdrawal, reduced motivation, mild negative emotions.
- **High Depression Probability (80-100%)**: Severe withdrawal, emotional numbness, ineffective coping, distress.

### User Responses:
- **Q1:** {user_responses["Q1"]}
- **Q2:** {user_responses["Q2"]}
- **Q3:** {user_responses["Q3"]}

Now, perform the detailed analysis and provide a comprehensive report as a single string.
"""

        # Make the request to OpenRouter
        logger.debug("Making request to OpenRouter API...")
        try:
            completion = client.chat.completions.create(
                extra_headers={
                    "HTTP-Referer": "http://localhost:3000",  # Replace with your site URL
                    "X-Title": "Mental Health Analysis",      # Replace with your site name
                },
                extra_body={},
                model="meta-llama/llama-3.1-8b-instruct:free",  # Updated model
                messages=[
                    {"role": "user", "content": prompt}
                ],
                max_tokens=1000,
            )
        except Exception as api_error:
            logger.error(f"OpenRouter API request failed: {str(api_error)}")
            return jsonify({'error': f'OpenRouter API request failed: {str(api_error)}'}), 500

        # Log the raw response for debugging
        logger.debug(f"OpenRouter API raw response: {completion}")

        # Check if completion is valid
        if not completion or not hasattr(completion, 'choices') or not completion.choices:
            logger.error("OpenRouter API returned an invalid response: No choices found")
            return jsonify({'error': 'OpenRouter API returned an invalid response: No choices found'}), 500

        # Extract the report
        report = completion.choices[0].message.content.strip()
        if not report:
            logger.warning("LLM report is empty; returning default message")
            report = (
                "We were unable to generate a detailed report at this time due to an issue with the AI model. "
                "We recommend reaching out to a mental health professional for a comprehensive assessment and support."
            )

        logger.debug(f"LLM Report: {report}")

        # Extract the probability from the report
        import re
        probability_match = re.search(r'Depression Probability: (\d+\.?\d*)%', report)
        probability = float(probability_match.group(1)) if probability_match else None

        if probability is None:
            logger.warning("Could not extract depression probability from the report; using default value")
            probability = 50.0  # Default fallback probability

        # Prepare the response
        result = {
            'report': report,
            'probability': probability,
            'user_id': user_id
        }

        return jsonify(result), 200

    except Exception as e:
        logger.error(f"Error in analyze_essay: {str(e)}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(port=5003, debug=True)