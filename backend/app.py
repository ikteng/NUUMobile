from flask import Flask, jsonify, request, send_file
from flask_cors import CORS
from controllers.upload_controller import upload_bp
from controllers.dashboard_controller import dashboard_bp
from controllers.ai_chat_controller import chat_bp
from controllers.predictions_controller import predictions_bp

app = Flask(__name__)
CORS(app)

# Register Blueprints
app.register_blueprint(upload_bp)
app.register_blueprint(dashboard_bp)
app.register_blueprint(chat_bp)
app.register_blueprint(predictions_bp)

if __name__ == "__main__":
    app.run(port=5001, debug=True)