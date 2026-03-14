import json
import sys

from product_scanner import generate_shop_report_with_groq, run_product_scan_once


def main() -> int:
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Missing action. Use: scan | report"}))
        return 1

    action = sys.argv[1].strip().lower()

    try:
        if action == "scan":
            result = run_product_scan_once()
            print(json.dumps(result, ensure_ascii=False))
            return 0

        if action == "report":
            report = generate_shop_report_with_groq()
            print(report)
            return 0

        print(json.dumps({"error": f"Unknown action: {action}"}))
        return 1
    except Exception as exc:
        print(json.dumps({"error": str(exc)}))
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
