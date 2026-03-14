import base64
import gc
import json
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Optional

import cv2
from groq import Groq


VISION_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct"
REPORT_MODEL = "llama-3.3-70b-versatile"

ALLOWED_CATEGORIES = {"dairy", "snacks", "beverages", "grocery", "other"}


def _sales_file_path() -> Path:
    # Store data at workspace root so the file is easy to find.
    return Path(__file__).resolve().parents[1] / "sales.json"


def _read_groq_api_key() -> str:
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise RuntimeError("GROQ_API_KEY not found in environment.")
    return api_key


def _clean_json_response(raw_text: str) -> str:
    text = raw_text.strip()
    if text.startswith("```"):
        lines = text.splitlines()
        # Remove opening and closing fence if present.
        if lines and lines[0].startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].startswith("```"):
            lines = lines[:-1]
        text = "\n".join(lines).strip()

    # Keep only the first JSON object in case extra text appears.
    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end == -1 or end < start:
        raise ValueError("Groq vision response did not contain a JSON object.")
    return text[start:end + 1]


def _to_float_or_none(value: Any) -> Optional[float]:
    if value is None:
        return None
    if isinstance(value, (int, float)):
        return float(value)
    text = str(value).strip().replace(",", "")
    if not text:
        return None
    try:
        return float(text)
    except ValueError:
        return None


def _to_int_or_none(value: Any) -> Optional[int]:
    if value is None:
        return None
    if isinstance(value, bool):
        return None
    if isinstance(value, int):
        return value
    if isinstance(value, float):
        return int(value)
    text = str(value).strip().replace(",", "")
    if not text:
        return None
    try:
        return int(float(text))
    except ValueError:
        return None


def _normalize_expiry_date(value: Any) -> Optional[str]:
    if value is None:
        return None
    text = str(value).strip()
    if not text:
        return None
    # Accept only strict YYYY-MM-DD in final output.
    try:
        dt = datetime.strptime(text, "%Y-%m-%d")
        return dt.strftime("%Y-%m-%d")
    except ValueError:
        return None


def _normalize_category(value: Any) -> str:
    text = str(value or "").strip().lower()
    return text if text in ALLOWED_CATEGORIES else "other"


def _normalize_scanned_product(data: Dict[str, Any]) -> Dict[str, Any]:
    normalized = {
        "product_name": str(data.get("product_name") or "").strip(),
        "brand": str(data.get("brand") or "").strip(),
        "variant": str(data.get("variant") or "").strip(),
        "price": _to_float_or_none(data.get("price")),
        "mrp": _to_float_or_none(data.get("mrp")),
        "expiry_date": _normalize_expiry_date(data.get("expiry_date")),
        "category": _normalize_category(data.get("category")),
        "barcode": _to_int_or_none(data.get("barcode")),
        "quantity_in_pack": _to_int_or_none(data.get("quantity_in_pack")),
        "scanned_at": datetime.now(timezone.utc).isoformat(),
    }
    return normalized


def capture_frame_base64_from_webcam() -> str:
    """
    Open webcam and return one captured frame encoded as base64.
    SPACE: capture
    ESC: cancel
    """
    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        raise RuntimeError("Could not open webcam.")

    cv2.namedWindow("Product Scanner - Press SPACE to Capture")

    try:
        while True:
            ok, frame = cap.read()
            if not ok:
                raise RuntimeError("Failed to read frame from webcam.")

            cv2.imshow("Product Scanner - Press SPACE to Capture", frame)
            key = cv2.waitKey(1) & 0xFF

            if key == 27:  # ESC
                raise RuntimeError("Capture cancelled by user.")

            if key == 32:  # SPACE
                encoded_ok, encoded = cv2.imencode(".jpg", frame)
                if not encoded_ok:
                    raise RuntimeError("Could not encode captured frame.")
                image_bytes = encoded.tobytes()
                image_b64 = base64.b64encode(image_bytes).decode("utf-8")

                # Remove frame bytes from memory quickly.
                del frame
                del encoded
                del image_bytes
                gc.collect()
                return image_b64
    finally:
        cap.release()
        cv2.destroyAllWindows()


def extract_product_json_with_groq(image_b64: str) -> Dict[str, Any]:
    client = Groq(api_key=_read_groq_api_key())

    prompt = (
        "Read this product label image and return ONLY valid raw JSON. "
        "No markdown, no explanation. "
        "Use exactly these fields: "
        "product_name, brand, variant, price, mrp, expiry_date, category, barcode, quantity_in_pack. "
        "Rules: "
        "price and mrp must be number or null; "
        "expiry_date must be YYYY-MM-DD or null; "
        "category must be one of dairy/snacks/beverages/grocery/other; "
        "barcode must be number or null; "
        "quantity_in_pack must be number or null."
    )

    response = client.chat.completions.create(
        model=VISION_MODEL,
        temperature=0.1,
        messages=[
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:image/jpeg;base64,{image_b64}"
                        },
                    },
                ],
            }
        ],
    )

    raw = response.choices[0].message.content or "{}"
    cleaned = _clean_json_response(raw)
    parsed = json.loads(cleaned)
    return _normalize_scanned_product(parsed)


def append_scan_to_sales_json(scan_record: Dict[str, Any], file_path: Optional[Path] = None) -> Path:
    target = file_path or _sales_file_path()
    target.parent.mkdir(parents=True, exist_ok=True)

    with target.open("a", encoding="utf-8") as f:
        f.write(json.dumps(scan_record, ensure_ascii=False) + "\n")

    return target


def run_product_scan_once() -> Dict[str, Any]:
    image_b64 = None
    try:
        image_b64 = capture_frame_base64_from_webcam()
        result = extract_product_json_with_groq(image_b64)
        append_scan_to_sales_json(result)
        return result
    finally:
        # Ensure image data is removed from memory after use.
        image_b64 = None
        gc.collect()


def _load_sales_records(file_path: Optional[Path] = None) -> list[Dict[str, Any]]:
    target = file_path or _sales_file_path()
    if not target.exists():
        return []

    rows: list[Dict[str, Any]] = []
    with target.open("r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                rows.append(json.loads(line))
            except json.JSONDecodeError:
                # Skip malformed lines so one bad row does not block the report.
                continue
    return rows


def generate_shop_report_with_groq(file_path: Optional[Path] = None) -> str:
    records = _load_sales_records(file_path)
    if not records:
        return "No scan records found in sales.json yet."

    client = Groq(api_key=_read_groq_api_key())

    prompt = (
        "You are a retail analyst for a small shop. "
        "Using the provided JSON records, return a plain-English report with: "
        "1) total scans, "
        "2) estimated revenue (sum of price where available), "
        "3) top category, "
        "4) products expiring within 30 days, "
        "5) top brand, "
        "6) one practical business tip. "
        "Keep it concise and easy for a non-technical shopkeeper."
    )

    response = client.chat.completions.create(
        model=REPORT_MODEL,
        temperature=0.3,
        messages=[
            {
                "role": "system",
                "content": "Return clear plain English text only.",
            },
            {
                "role": "user",
                "content": f"{prompt}\n\nRecords JSON:\n{json.dumps(records, ensure_ascii=False)}",
            },
        ],
    )

    return (response.choices[0].message.content or "").strip()
