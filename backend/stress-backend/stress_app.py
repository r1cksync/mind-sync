from flask import Flask, request, jsonify
import os
import numpy as np
import cv2
from tensorflow.keras.models import load_model
from tensorflow.keras.applications.resnet50 import preprocess_input
from tensorflow.keras.metrics import MeanSquaredError
from flask_cors import CORS

app = Flask(__name__)
CORS(app, resources={r"/predict-stress": {"origins": "http://localhost:3000"}})

# Directory to save uploaded images
UPLOAD_FOLDER = 'E:/mental-health-analysis/uploads'
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# Load the stress detection model
MODEL_PATH = r'E:\mental-health-analysis\backend\stress-backend\stress_model.h5'
try:
    # Explicitly provide the mse metric as a custom object
    model = load_model(MODEL_PATH, custom_objects={'mse': MeanSquaredError()})
    print("Stress detection model loaded successfully.")
except Exception as e:
    print(f"Failed to load stress detection model: {e}")
    model = None

def load_and_preprocess_image(image_path):
    # Load the image in grayscale (FER2013 images are grayscale)
    img = cv2.imread(image_path, cv2.IMREAD_GRAYSCALE)
    if img is None:
        raise ValueError(f"Could not load image from {image_path}")
    
    # Resize to 224x224 (model input size)
    img = cv2.resize(img, (224, 224))
    
    # Convert grayscale to RGB by duplicating channels
    img = cv2.cvtColor(img, cv2.COLOR_GRAY2RGB)
    
    # Convert to numpy array and add batch dimension
    img = np.expand_dims(img, axis=0)
    
    # Preprocess the image for ResNet50
    img = preprocess_input(img)
    return img

@app.route('/predict-stress', methods=['POST'])
def predict_stress():
    if model is None:
        return jsonify({'error': 'Stress detection model not loaded'}), 500

    if 'image' not in request.files:
        return jsonify({'error': 'No image uploaded'}), 400
    
    file = request.files['image']
    if file.filename == '':
        return jsonify({'error': 'No image selected'}), 400
    
    # Save the uploaded image
    image_path = os.path.join(app.config['UPLOAD_FOLDER'], file.filename)
    file.save(image_path)
    
    try:
        # Load and preprocess the image
        img = load_and_preprocess_image(image_path)
        
        # Make prediction
        stress_level = model.predict(img)[0][0]
        
        # Ensure the prediction is within the valid range (0 to 100)
        stress_level = float(np.clip(stress_level, 0, 100))
        
        return jsonify({'stress_level': stress_level})
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        # Clean up: delete the uploaded image
        if os.path.exists(image_path):
            os.remove(image_path)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=True)