import os
import json
import traceback
import pandas as pd
from flask import Blueprint, request, jsonify
import requests
from collections import defaultdict
import re

UPLOAD_FOLDER = os.path.join(os.getcwd(), "uploads")
chat_bp = Blueprint("chat", __name__)

OLLAMA_URL = "http://localhost:11434/api/chat"
OLLAMA_MODEL = "llama3.2:3b"

CHAT_STORE = os.path.join(os.getcwd(), "chat_store")
os.makedirs(CHAT_STORE, exist_ok=True)

def chat_path(chat_key):
    safe_key = chat_key.replace("::", "__")
    return os.path.join(CHAT_STORE, f"{safe_key}.json")

def load_chat(chat_key):
    path = chat_path(chat_key)
    if os.path.exists(path):
        with open(path, "r") as f:
            CHAT_MEMORY[chat_key] = json.load(f)

def save_chat(chat_key):
    path = chat_path(chat_key)
    with open(path, "w") as f:
        json.dump(CHAT_MEMORY[chat_key], f)

# ---------------------------
# In-memory chat memory
# ---------------------------
CHAT_MEMORY = defaultdict(list)  # key = file::sheet

def get_chat_key(file, sheet):
    return f"{file}::{sheet}"

def build_summary(df, max_rows=5, max_numeric=5):
    schema = {c: str(df[c].dtype) for c in df.columns}
    numeric_df = df.select_dtypes(include=["number"]).iloc[:, :max_numeric]
    numeric_stats = numeric_df.describe().round(2).to_dict()
    sample_rows = df.head(max_rows).to_dict(orient="records")
    
    return {
        "total_rows": len(df),
        "columns": list(df.columns),
        "schema": schema,
        "numeric_stats": numeric_stats,
        "sample_rows": sample_rows
    }

def stringify_all(obj):
    if isinstance(obj, dict):
        return {k: stringify_all(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [stringify_all(x) for x in obj]
    elif obj is None:
        return "None"
    else:
        return str(obj)

# ---------------------------
# LLM Explainer
# ---------------------------
def explain_with_llm(question, result, chat_key):
    if chat_key not in CHAT_MEMORY:
        load_chat(chat_key)

    CHAT_MEMORY[chat_key].append({"role": "user", "content": question})
    
    messages = [
        {"role": "system", "content": "You are a data analyst. Only use the data provided. Do NOT guess, assume, or invent any values. If the dataset does not contain the information requested, respond clearly that it is not present. Explain results clearly, accurately, and in plain language. Do not invent numbers."},
        *CHAT_MEMORY[chat_key],
        {"role": "user", "content": f"Computed results:\n{result}\nAnswer this question: '{question}'. Check the columns carefully and do not guess."}
    ]
    
    payload = {"model": OLLAMA_MODEL, "messages": messages, "options": {"temperature": 0.2}, "stream": False}
    
    try:
        response = requests.post(OLLAMA_URL, json=payload, timeout=120)
        resp_json = response.json()
        if "message" in resp_json and "content" in resp_json["message"]:
            content = resp_json["message"]["content"]
        elif "response" in resp_json:
            content = resp_json["response"]
        elif "error" in resp_json:
            content = f"Ollama error: {resp_json['error']}"
        else:
            content = "No explanation returned from LLM."
    except Exception as e:
        content = f"Failed to connect to Ollama: {e}"
    
    CHAT_MEMORY[chat_key].append({"role": "assistant", "content": content})
    save_chat(chat_key)
    print("Content: ", content)
    return content

# ---------------------------
# Main chat endpoint
# ---------------------------
@chat_bp.route("/ask_ai_about_sheet/<file>/<sheet>", methods=["POST"])
def ask_ai_about_sheet(file, sheet):
    filepath = os.path.join(UPLOAD_FOLDER, file)
    if not os.path.exists(filepath):
        return jsonify({"error": "File not found"}), 404

    question = request.json.get("question", "").strip()
    if not question:
        return jsonify({"answer": "Please ask a question."})

    chat_key = get_chat_key(file, sheet)

    try:
        df = pd.read_excel(filepath, sheet_name=sheet)

        result = build_summary(df)
        explanation = explain_with_llm(question, result, chat_key)
        
        return jsonify({
            "result": stringify_all(result),
            "answer": explanation,
            "history": stringify_all(CHAT_MEMORY[chat_key])
        })

    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

# ---------------------------
# Reset chat memory
# ---------------------------
@chat_bp.route("/reset_chat/<file>/<sheet>", methods=["POST"])
def reset_chat(file, sheet):
    chat_key = get_chat_key(file, sheet)

    # Clear memory
    CHAT_MEMORY.pop(chat_key, None)

    # Remove persisted file
    path = chat_path(chat_key)
    if os.path.exists(path):
        try:
            os.remove(path)
        except Exception as e:
            return jsonify({"error": f"Failed to delete chat file: {e}"}), 500

    return jsonify({"status": "chat reset"})

@chat_bp.route("/chat_history/<file>/<sheet>", methods=["GET"])
def chat_history(file, sheet):
    chat_key = get_chat_key(file, sheet)
    load_chat(chat_key)
    return jsonify({"history": CHAT_MEMORY.get(chat_key, [])})
