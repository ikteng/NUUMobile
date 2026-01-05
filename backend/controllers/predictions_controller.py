import os
from flask import Blueprint, request, jsonify

UPLOAD_FOLDER = os.path.join(os.getcwd(), "uploads")

predictions_bp = Blueprint("predictions", __name__)