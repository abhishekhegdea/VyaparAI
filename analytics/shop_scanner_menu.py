import json

from product_scanner import generate_shop_report_with_groq, run_product_scan_once


def main() -> None:
    print("Shop Product Scanner")
    print("S = Scan product from webcam")
    print("R = Report from sales.json")
    print("Q = Quit")

    while True:
        choice = input("\nChoose option (S/R/Q): ").strip().lower()

        if choice == "q":
            print("Goodbye.")
            break

        if choice == "s":
            try:
                result = run_product_scan_once()
                print("\nScan saved to sales.json:")
                print(json.dumps(result, indent=2, ensure_ascii=False))
            except Exception as exc:
                print(f"Scan failed: {exc}")
            continue

        if choice == "r":
            try:
                report = generate_shop_report_with_groq()
                print("\nShop Report:")
                print(report)
            except Exception as exc:
                print(f"Report failed: {exc}")
            continue

        print("Invalid option. Please choose S, R, or Q.")


if __name__ == "__main__":
    main()
