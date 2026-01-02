from flask import Flask, jsonify, request, send_file
from flask_cors import CORS
from controllers.upload_controller import upload_bp

app = Flask(__name__)
CORS(app)

# Register Blueprints
app.register_blueprint(upload_bp)

if __name__ == "__main__":
    app.run(port=5001, debug=True)