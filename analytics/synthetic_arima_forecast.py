import random
import sys
from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from statsmodels.tsa.arima.model import ARIMA

from product_scanner import generate_shop_report_with_groq, run_product_scan_once


# Reproducible synthetic data for demos and testing.
RANDOM_SEED = 42
random.seed(RANDOM_SEED)
np.random.seed(RANDOM_SEED)


def generate_synthetic_bills(days: int = 20) -> pd.DataFrame:
    """Generate realistic synthetic billing rows for a stationery retail store."""
    products = {
        "Pens": 12,
        "Notebooks": 60,
        "Pencils": 7,
        "Markers": 35,
        "Erasers": 5,
        "Staplers": 120,
        "Files": 45,
        "Highlighters": 30,
    }

    product_names = list(products.keys())
    # Weighted demand: common items appear more frequently.
    product_weights = np.array([0.22, 0.18, 0.2, 0.1, 0.1, 0.06, 0.08, 0.06])

    end_date = pd.Timestamp.today().normalize()
    start_date = end_date - pd.Timedelta(days=days - 1)
    date_range = pd.date_range(start=start_date, end=end_date, freq="D")

    rows = []
    bill_id = 10001

    for i, bill_date in enumerate(date_range):
        # Slight upward trend + weekly seasonality + randomness.
        trend_factor = 1.0 + (i / max(days - 1, 1)) * 0.18
        weekday = bill_date.dayofweek
        seasonal_factor = 1.15 if weekday in (5, 6) else 0.95
        day_noise = max(np.random.normal(1.0, 0.08), 0.75)

        bills_today = random.randint(5, 15)

        for _ in range(bills_today):
            product_name = np.random.choice(product_names, p=product_weights)
            price_per_unit = products[product_name]

            # Quantity depends on product profile and day-level multiplier.
            qty_base = {
                "Pens": 3.5,
                "Notebooks": 2.2,
                "Pencils": 4.0,
                "Markers": 1.8,
                "Erasers": 3.0,
                "Staplers": 1.2,
                "Files": 1.7,
                "Highlighters": 1.5,
            }[product_name]

            mean_qty = max(qty_base * trend_factor * seasonal_factor * day_noise, 1.0)
            quantity = max(1, int(np.random.poisson(lam=mean_qty)))

            rows.append(
                {
                    "bill_id": bill_id,
                    "date": bill_date.strftime("%Y-%m-%d"),
                    "product_name": product_name,
                    "quantity": quantity,
                    "price_per_unit": price_per_unit,
                    "total_amount": quantity * price_per_unit,
                }
            )
            bill_id += 1

    df = pd.DataFrame(rows)
    return df


def run_arima_forecast(daily_sales: pd.DataFrame, forecast_days: int = 7):
    """Train ARIMA on daily total sales and forecast next N days."""
    ts = daily_sales.set_index("date")["total_amount"]

    # ARIMA(2,1,1) works well for short trend data with mild noise.
    model = ARIMA(ts, order=(2, 1, 1))
    fitted = model.fit()

    forecast_values = fitted.forecast(steps=forecast_days)
    forecast_dates = pd.date_range(start=ts.index.max() + pd.Timedelta(days=1), periods=forecast_days, freq="D")
    forecast_df = pd.DataFrame({"date": forecast_dates, "forecast_total_sales": forecast_values.values})
    return fitted, forecast_df


def plot_sales_and_forecast(daily_sales: pd.DataFrame, forecast_df: pd.DataFrame, output_path: Path) -> None:
    """Plot historical daily sales and ARIMA forecast values."""
    plt.figure(figsize=(12, 6))
    plt.plot(daily_sales["date"], daily_sales["total_amount"], marker="o", label="Past 20 Days Sales")
    plt.plot(
        forecast_df["date"],
        forecast_df["forecast_total_sales"],
        marker="o",
        linestyle="--",
        label="Next 7 Days Forecast",
    )
    plt.title("Stationery Shop Daily Sales: History + ARIMA Forecast")
    plt.xlabel("Date")
    plt.ylabel("Total Sales (INR)")
    plt.xticks(rotation=45)
    plt.grid(alpha=0.3)
    plt.legend()
    plt.tight_layout()
    plt.savefig(output_path, dpi=150)
    plt.close()


def run_forecast_workflow() -> None:
    output_dir = Path(__file__).resolve().parent
    dataset_path = output_dir / "synthetic_billing_data.csv"
    daily_sales_path = output_dir / "daily_sales_timeseries.csv"
    forecast_path = output_dir / "arima_7_day_forecast.csv"
    plot_path = output_dir / "arima_forecast_plot.png"

    bills_df = generate_synthetic_bills(days=20)
    bills_df["date"] = pd.to_datetime(bills_df["date"])

    daily_sales = (
        bills_df.groupby("date", as_index=False)["total_amount"]
        .sum()
        .sort_values("date")
    )

    _, forecast_df = run_arima_forecast(daily_sales, forecast_days=7)

    bills_df_out = bills_df.copy()
    bills_df_out["date"] = bills_df_out["date"].dt.strftime("%Y-%m-%d")
    daily_sales_out = daily_sales.copy()
    daily_sales_out["date"] = daily_sales_out["date"].dt.strftime("%Y-%m-%d")
    forecast_out = forecast_df.copy()
    forecast_out["date"] = forecast_out["date"].dt.strftime("%Y-%m-%d")
    forecast_out["forecast_total_sales"] = forecast_out["forecast_total_sales"].round(2)

    bills_df_out.to_csv(dataset_path, index=False)
    daily_sales_out.to_csv(daily_sales_path, index=False)
    forecast_out.to_csv(forecast_path, index=False)

    plot_sales_and_forecast(daily_sales, forecast_df, output_path=plot_path)

    print("Synthetic dataset generated.")
    print(f"Rows: {len(bills_df_out)}")
    print(f"Dataset file: {dataset_path}")
    print(f"Daily time series file: {daily_sales_path}")
    print(f"Forecast file: {forecast_path}")
    print(f"Plot file: {plot_path}")

    print("\nSample synthetic billing data (first 12 rows):")
    print(bills_df_out.head(12).to_string(index=False))

    print("\nDaily total sales (20 days):")
    print(daily_sales_out.to_string(index=False))

    print("\nForecast for next 7 days:")
    print(forecast_out.to_string(index=False))


def main() -> None:
    print("Shop Management Console")
    print("S = Scan product from webcam")
    print("R = Shop report from sales.json")
    print("F = Existing forecast workflow")
    print("Q = Quit")

    while True:
        choice = input("\nChoose option (S/R/F/Q): ").strip().lower()

        if choice == "q":
            print("Goodbye.")
            return

        if choice == "s":
            try:
                result = run_product_scan_once()
                print("\nScan saved to sales.json:")
                print(pd.Series(result).to_string())
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

        if choice == "f":
            run_forecast_workflow()
            continue

        print("Invalid option. Please choose S, R, F, or Q.")


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--forecast-only":
        run_forecast_workflow()
    else:
        main()
