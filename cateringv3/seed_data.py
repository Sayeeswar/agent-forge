"""
Seed script — inserts 500 rows into each table with sensible,
internally-consistent random data:

  - customers        : 500 rows
  - orders           : 500 rows (each tied to a random customer)
  - order_items      : 500 rows (spread unevenly across the 500 orders,
                        order totals are recalculated from these)
  - payments         : 500 rows (exactly one per order, since payments.order_id
                        is unique -- 500 orders means 500 possible payments)

Usage:
    pip install psycopg2-binary      # if not already installed
    python seed_data.py

Set your connection string via env var or edit DATABASE_URL below.
Match whatever's in rxconfig.py's db_url, just swap "+psycopg2" out
since raw psycopg2.connect() doesn't use the SQLAlchemy-style prefix.
"""

import os
import random
import string
from datetime import datetime, timedelta

import psycopg2

DATABASE_URL = os.environ["DATABASE_URL"]  # postgresql://user:password@host:port/dbname

N_CUSTOMERS = 500
N_ORDERS = 500
N_ORDER_ITEMS = 500

random.seed()  # uses system randomness; drop the seed() call args if you want reproducibility

# ---------------------------------------------------------------------------
# Reference data pools (kept small + realistic, not exhaustive)
# ---------------------------------------------------------------------------

FIRST_NAMES = [
    "Aarav", "Vihaan", "Aditya", "Krishna", "Rohan", "Sai", "Arjun", "Karthik",
    "Naveen", "Suresh", "Ramesh", "Venkat", "Prasad", "Kiran", "Deepak",
    "Priya", "Ananya", "Divya", "Lakshmi", "Sneha", "Pooja", "Kavya", "Meera",
    "Swathi", "Anjali", "Nithya", "Radha", "Sowmya", "Harika", "Bhavya",
]
LAST_NAMES = [
    "Reddy", "Rao", "Naidu", "Sharma", "Varma", "Chowdary", "Kumar", "Prasad",
    "Murthy", "Sastry", "Iyer", "Nair", "Pillai", "Gupta", "Patel", "Rajan",
]
CITIES = [
    ("Bhimavaram", "Andhra Pradesh"), ("Vijayawada", "Andhra Pradesh"),
    ("Visakhapatnam", "Andhra Pradesh"), ("Guntur", "Andhra Pradesh"),
    ("Rajahmundry", "Andhra Pradesh"), ("Hyderabad", "Telangana"),
    ("Chennai", "Tamil Nadu"), ("Bengaluru", "Karnataka"),
]

DISHES = [
    ("Chicken Biryani", 320.0), ("Veg Biryani", 220.0), ("Mutton Curry", 450.0),
    ("Paneer Butter Masala", 260.0), ("Gobi Manchurian", 180.0),
    ("Curd Rice", 120.0), ("Pulihora", 100.0), ("Sambar Rice", 130.0),
    ("Gulab Jamun (plate)", 90.0), ("Double Ka Meetha", 110.0),
    ("Chicken 65", 240.0), ("Fish Fry", 300.0), ("Rasam", 80.0),
    ("Mixed Veg Curry", 150.0), ("Chapati (per piece)", 15.0),
]

ORDER_STATUSES = ["pending", "confirmed", "preparing", "out_for_delivery", "delivered", "cancelled"]
# weight "delivered" and "confirmed" more heavily -- more sensible distribution
ORDER_STATUS_WEIGHTS = [0.08, 0.15, 0.12, 0.10, 0.50, 0.05]


def random_string(n=14, chars=string.ascii_letters + string.digits):
    return "".join(random.choices(chars, k=n))


def random_datetime_within(days_back, start_from=None):
    base = start_from or datetime.utcnow()
    delta_seconds = random.randint(0, days_back * 24 * 3600)
    return base - timedelta(seconds=delta_seconds)


def main():
    conn = psycopg2.connect(DATABASE_URL)
    conn.autocommit = False
    cur = conn.cursor()

    try:
        # -------------------------------------------------------------
        # 1) customers
        # -------------------------------------------------------------
        customer_rows = []
        for i in range(N_CUSTOMERS):
            first = random.choice(FIRST_NAMES)
            last = random.choice(LAST_NAMES)
            name = f"{first} {last}"
            email = f"{first.lower()}.{last.lower()}{i}@example.com"
            phone = "9" + "".join(random.choices(string.digits, k=9))
            city, state = random.choice(CITIES)
            address = f"{random.randint(1, 200)}-{random.randint(1, 20)}-{random.randint(1, 99)}, {city}, {state}"
            created_at = random_datetime_within(days_back=365)
            customer_rows.append((name, email, phone, "hashed_password_placeholder", address, created_at))

        cur.executemany(
            """
            INSERT INTO customers (name, email, phone, password_hash, address, created_at)
            VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING id
            """,
            customer_rows,
        )
        # executemany doesn't return RETURNING rows in psycopg2, so re-fetch ids
        cur.execute("SELECT id FROM customers ORDER BY id DESC LIMIT %s", (N_CUSTOMERS,))
        customer_ids = [r[0] for r in cur.fetchall()][::-1]

        # -------------------------------------------------------------
        # 2) orders (total_amount is a placeholder for now, fixed after items)
        # -------------------------------------------------------------
        order_rows = []
        order_dates = []  # keep ordered_at aligned so payments/items reference real dates
        for i in range(N_ORDERS):
            customer_id = random.choice(customer_ids)
            ordered_at = random_datetime_within(days_back=180)
            delivery_date = ordered_at + timedelta(days=random.randint(1, 14))
            status = random.choices(ORDER_STATUSES, weights=ORDER_STATUS_WEIGHTS, k=1)[0]
            order_number = f"ZS-{ordered_at.strftime('%Y%m%d')}-{i + 1:04d}"
            order_rows.append((order_number, customer_id, status, ordered_at, delivery_date, 0.0, "Seeded test order"))
            order_dates.append(ordered_at)

        cur.executemany(
            """
            INSERT INTO orders (order_number, customer_id, status, ordered_at, delivery_date, total_amount, notes)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            """,
            order_rows,
        )
        cur.execute("SELECT id, ordered_at FROM orders ORDER BY id DESC LIMIT %s", (N_ORDERS,))
        fetched = cur.fetchall()[::-1]
        order_ids = [r[0] for r in fetched]
        order_id_to_date = {r[0]: r[1] for r in fetched}

        # -------------------------------------------------------------
        # 3) order_items -- spread across orders, each order gets >= 1 item
        #    guaranteed, remaining items assigned randomly, total == 500
        # -------------------------------------------------------------
        item_rows = []
        order_totals = {oid: 0.0 for oid in order_ids}

        # guarantee every order has at least one item (uses up 500 of the 500 items,
        # since N_ORDERS == N_ORDER_ITEMS -- if you change the counts this still works,
        # extra items just get piled onto random orders)
        remaining = N_ORDER_ITEMS
        for oid in order_ids:
            if remaining <= 0:
                break
            dish, price = random.choice(DISHES)
            qty = random.randint(1, 15)
            item_rows.append((oid, dish, qty, price))
            order_totals[oid] += qty * price
            remaining -= 1

        # if N_ORDER_ITEMS > N_ORDERS, pile the rest onto random existing orders
        for _ in range(remaining):
            oid = random.choice(order_ids)
            dish, price = random.choice(DISHES)
            qty = random.randint(1, 15)
            item_rows.append((oid, dish, qty, price))
            order_totals[oid] += qty * price

        cur.executemany(
            """
            INSERT INTO order_items (order_id, product_name, quantity, unit_price)
            VALUES (%s, %s, %s, %s)
            """,
            item_rows,
        )

        # sync order.total_amount with the sum of its actual items
        cur.executemany(
            "UPDATE orders SET total_amount = %s WHERE id = %s",
            [(round(total, 2), oid) for oid, total in order_totals.items()],
        )

        # -------------------------------------------------------------
        # 4) payments -- exactly one per order (order_id is unique on payments)
        # -------------------------------------------------------------
        payment_rows = []
        for oid in order_ids:
            ordered_at = order_id_to_date[oid]
            amount = round(order_totals[oid], 2)
            razorpay_order_id = "order_" + random_string(14)
            created_at = ordered_at + timedelta(minutes=random.randint(1, 30))

            status = random.choices(
                ["created", "paid", "failed", "refunded"],
                weights=[0.05, 0.80, 0.10, 0.05],
                k=1,
            )[0]

            if status in ("paid", "refunded"):
                razorpay_payment_id = "pay_" + random_string(14)
                razorpay_signature = random_string(40, chars=string.hexdigits.lower())
                verified_at = created_at + timedelta(minutes=random.randint(1, 10))
            elif status == "failed":
                razorpay_payment_id = "pay_" + random_string(14)
                razorpay_signature = None
                verified_at = None
            else:  # created, never completed
                razorpay_payment_id = None
                razorpay_signature = None
                verified_at = None

            payment_rows.append((
                oid, razorpay_order_id, razorpay_payment_id, razorpay_signature,
                amount, "INR", status, created_at, verified_at,
            ))

        cur.executemany(
            """
            INSERT INTO payments
                (order_id, razorpay_order_id, razorpay_payment_id, razorpay_signature,
                 amount, currency, status, created_at, verified_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            """,
            payment_rows,
        )

        conn.commit()
        print(f"Inserted {len(customer_rows)} customers, {len(order_rows)} orders, "
              f"{len(item_rows)} order_items, {len(payment_rows)} payments.")

    except Exception as e:
        conn.rollback()
        print("Seeding failed, rolled back:", e)
        raise
    finally:
        cur.close()
        conn.close()


if __name__ == "__main__":
    main()