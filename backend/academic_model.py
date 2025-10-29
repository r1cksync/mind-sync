from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
import pandas as pd
import numpy as np
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

# Load the CatBoost model
model = joblib.load('catboost_depression_model.pkl')

# Define the expected features
FEATURES = [
    'Age', 'Academic Pressure', 'CGPA', 'Study Satisfaction',
    'Dietary Habits', 'Degree', 'Have you ever had suicidal thoughts ?',
    'Work/Study Hours', 'Fatigue Index', 'Stress Risk Score'
]

def generate_llm_report(input_data, prediction, probability):
    """
    Send the user input and CatBoost prediction to OpenRouter to generate an AI report.
    """
    try:
        # Construct the prompt for the LLM
        prompt = (
            "You are a mental health expert. Based on the following academic-related data and a machine learning model's prediction, "
            "generate a detailed report assessing the user's mental health and providing recommendations.\n\n"
            "User Input:\n"
        )
        for feature, value in input_data.items():
            prompt += f"- {feature}: {value}\n"
        prompt += (
            f"\nMachine Learning Prediction:\n"
            f"- Depression Risk: {prediction}\n"
            f"- Probability of Depression: {probability * 100:.2f}%\n\n"
            "Provide a detailed analysis of the user's mental health based on this data. Structure your response with the following sections:\n"
            "- **Summary of Academic Stress:** Describe the user's stress levels related to academics.\n"
            "- **Risk Factors:** Highlight concerning patterns or behaviors.\n"
            "- **Protective Factors:** Identify positive or adaptive behaviors.\n"
            "- **Academic Stress Probability:** Estimate the probability of academic stress (0-100%) based on the data and include it in the format 'Academic Stress Probability: X%' (e.g., 'Academic Stress Probability: 75%'). Use the following guidelines:\n"
            "  - **Low Stress (0-15%)**: Balanced workload, good coping strategies, stable emotions.\n"
            "  - **Moderate Stress (30-50%)**: Some overwhelm, reduced productivity, mild anxiety.\n"
            "  - **High Stress (80-100%)**: Severe overwhelm, burnout symptoms, ineffective coping.\n"
            "- **Recommendations:** Offer actionable advice to manage academic stress.\n\n"
            "Ensure that the 'Academic Stress Probability: X%' line is included exactly as specified, with a numeric value between 0 and 100, followed by a '%' sign. Be empathetic, professional, and supportive in your tone."
        )

        # Make a request to OpenRouter using the OpenAI client
        logger.debug("Making request to OpenRouter API...")
        try:
            completion = client.chat.completions.create(
                extra_headers={
                    "HTTP-Referer": "http://localhost:3000",  # Replace with your site URL
                    "X-Title": "Mental Health Analysis",      # Replace with your site name
                },
                extra_body={},
                model="meta-llama/llama-3.1-8b-instruct:free",  # Switch to a reliable model
                messages=[
                    {"role": "system", "content": "You are a mental health expert."},
                    {"role": "user", "content": prompt},
                ],
                max_tokens=500,  # Adjust based on desired report length
            )
        except Exception as api_error:
            logger.error(f"OpenRouter API request failed: {str(api_error)}")
            return f"Error generating LLM report: OpenRouter API request failed: {str(api_error)}"

        # Log the raw response for debugging
        logger.debug(f"OpenRouter API raw response: {completion}")

        # Check if completion is valid
        if not completion or not hasattr(completion, 'choices') or not completion.choices:
            logger.error("OpenRouter API returned an invalid response: No choices found")
            return "Error generating LLM report: OpenRouter API returned an invalid response"

        # Extract the report
        report = completion.choices[0].message.content.strip()
        if not report:
            logger.warning("LLM report is empty; returning default message")
            return (
                "We were unable to generate a detailed report at this time due to an issue with the AI model. "
                "However, based on the machine learning prediction, there is a high likelihood of depression. "
                "We recommend reaching out to a mental health professional for a comprehensive assessment and support."
            )

        logger.debug(f"LLM Report: {report}")  # Log the full report for debugging
        return report

    except Exception as e:
        logger.error(f"Error generating LLM report: {str(e)}")
        return f"Error generating LLM report: {str(e)}"

@app.route('/api/predict-depression-with-report', methods=['POST'])
def predict_depression_with_report():
    try:
        # Get the input data from the request
        data = request.get_json()
        user_id = data.get('user_id')  # For logging or authentication purposes

        # Extract the features from the input data
        input_data = {}
        for feature in FEATURES:
            if feature not in data:
                return jsonify({'error': f'Missing feature: {feature}'}), 400
            input_data[feature] = data[feature]

        # Convert input data to a DataFrame for the CatBoost model
        input_df = pd.DataFrame([input_data], columns=FEATURES)

        # Map categorical features
        degree_mapping = {'Bachelors': 0, 'Masters': 1, 'PhD': 2}
        suicidal_thoughts_mapping = {'No': 0, 'Yes': 1}

        input_df['Degree'] = input_df['Degree'].map(degree_mapping)
        input_df['Have you ever had suicidal thoughts ?'] = input_df['Have you ever had suicidal thoughts ?'].map(suicidal_thoughts_mapping)

        # Ensure all features are numeric
        for feature in FEATURES:
            input_df[feature] = pd.to_numeric(input_df[feature], errors='coerce')

        # Check for NaN values after conversion
        if input_df.isnull().values.any():
            return jsonify({'error': 'Invalid input data: Some features could not be converted to numeric values'}), 400

        # Make CatBoost prediction
        prediction = model.predict(input_df)[0]  # 0 or 1 (No Depression or Depression)
        prediction_proba = model.predict_proba(input_df)[0]  # Probabilities for both classes

        # Generate LLM report
        prediction_result = 'Depression' if prediction == 1 else 'No Depression'
        probability = float(prediction_proba[1])
        llm_report = generate_llm_report(input_data, prediction_result, probability)

        # Check if the report contains an error message
        if "Error generating LLM report" in llm_report:
            return jsonify({'error': llm_report}), 500

        # Extract the academic stress probability from the LLM report
        import re
        probability_match = re.search(r'Academic Stress Probability: (\d+\.?\d*)%', llm_report)
        academic_stress_probability = float(probability_match.group(1)) if probability_match else probability * 100  # Fallback to CatBoost probability

        if probability_match is None:
            logger.warning("Could not extract academic stress probability from the LLM report; using CatBoost probability as fallback")

        # Prepare the response
        result = {
            'prediction': prediction_result,
            'probability': probability,  # CatBoost probability of depression
            'academic_stress_probability': academic_stress_probability,  # Extracted from LLM report or fallback
            'llm_report': llm_report,
            'user_id': user_id
        }

        return jsonify(result), 200

    except Exception as e:
        logger.error(f"Error in predict_depression_with_report: {str(e)}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(port=5002, debug=True)