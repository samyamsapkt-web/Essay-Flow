import os
import requests
from flask import Flask, render_template, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/analyze", methods=["POST"])
def analyze():
    if not GROQ_API_KEY:
        return jsonify({"error": "Server is missing GROQ_API_KEY environment variable."}), 500

    data = request.get_json()
    prompt_text  = (data.get("prompt", "") or "").strip()
    essay_text   = (data.get("essay", "") or "").strip()
    grade_level  = (data.get("grade_level", "") or "").strip()

    if not prompt_text:
        return jsonify({"error": "No assignment prompt provided."}), 400

    grade_context = ""
    if grade_level:
        grade_context = f"The student is in Grade {grade_level}. Tailor all advice, vocabulary, and expectations accordingly.\n"

    if essay_text:
        # Stage 2: outline + full grade check
        system_prompt = f"""{grade_context}You are an expert writing coach and essay evaluator. The student has provided their assignment prompt AND a completed essay draft. Analyze both thoroughly.

Respond ONLY with a JSON object in this exact format (no markdown, no backticks):
{{
  "mode": "full",
  "predicted_grade": "<letter grade e.g. B+>",
  "predicted_percent": <number 0-100>,
  "thesis_options": ["<thesis 1>", "<thesis 2>", "<thesis 3>"],
  "outline": {{
    "introduction": "<what the intro should contain>",
    "body_paragraphs": ["<body point 1>", "<body point 2>", "<body point 3>"],
    "conclusion": "<what the conclusion should contain>"
  }},
  "what_teacher_wants": ["<key expectation 1>", "<key expectation 2>", "<key expectation 3>"],
  "strengths": "<paragraph about what is already strong in the essay>",
  "weaknesses": "<paragraph about the main issues holding the grade back>",
  "specific_fixes": ["<fix 1>", "<fix 2>", "<fix 3>", "<fix 4>"],
  "potential_grade": "<letter grade if fixes are made>",
  "potential_percent": <number 0-100>,
  "tips": ["<success tip 1>", "<success tip 2>", "<success tip 3>"]
}}"""
        user_content = f"ASSIGNMENT PROMPT:\n{prompt_text}\n\nSTUDENT ESSAY DRAFT:\n{essay_text}"
    else:
        # Stage 1: outline only
        system_prompt = f"""{grade_context}You are an expert writing coach. The student has provided their assignment prompt and needs help getting started. Generate a comprehensive outline and starter advice.

Respond ONLY with a JSON object in this exact format (no markdown, no backticks):
{{
  "mode": "outline",
  "thesis_options": ["<thesis 1>", "<thesis 2>", "<thesis 3>"],
  "outline": {{
    "introduction": "<what the intro should contain>",
    "body_paragraphs": ["<body point 1>", "<body point 2>", "<body point 3>"],
    "conclusion": "<what the conclusion should contain>"
  }},
  "what_teacher_wants": ["<key expectation 1>", "<key expectation 2>", "<key expectation 3>"],
  "tips": ["<success tip 1>", "<success tip 2>", "<success tip 3>"]
}}"""
        user_content = f"ASSIGNMENT PROMPT:\n{prompt_text}"

    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {GROQ_API_KEY}",
    }

    payload = {
        "model": "llama-3.3-70b-versatile",
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_content}
        ],
        "max_tokens": 1500,
        "temperature": 0.3,
    }

    try:
        resp = requests.post(GROQ_API_URL, json=payload, headers=headers, timeout=60)
        resp.raise_for_status()
        result = resp.json()
        text = result["choices"][0]["message"]["content"]
        return jsonify({"result": text})
    except requests.exceptions.HTTPError as e:
        return jsonify({"error": f"Groq API error: {e.response.status_code} — {e.response.text}"}), 502
    except requests.exceptions.Timeout:
        return jsonify({"error": "Request timed out."}), 504
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=False)
