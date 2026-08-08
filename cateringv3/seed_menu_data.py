"""
Seed script — populates categories/menu_items from cateringv3/data.py.

Usage:
    python seed_menu_data.py

Set DATABASE_URL env var (required, no fallback). Match seed_data.py pattern:
plain postgresql://, no +psycopg2 suffix.
"""

import os

import psycopg2

from cateringv3 import data

DATABASE_URL = os.environ["DATABASE_URL"]  # postgresql://user:password@host:port/dbname


def main():
    conn = psycopg2.connect(DATABASE_URL)
    conn.autocommit = False
    cur = conn.cursor()

    cur.execute("TRUNCATE TABLE menu_items, categories RESTART IDENTITY CASCADE")

    category_rows = [(name, i) for i, name in enumerate(data.CATEGORIES)]
    cur.executemany(
        "INSERT INTO categories (name, sort_order) VALUES (%s, %s)",
        category_rows,
    )
    cur.execute("SELECT id, name FROM categories")
    category_id_by_name = {name: cid for cid, name in cur.fetchall()}

    item_rows = [
        (
            category_id_by_name[item["category"]],
            item["name"], item["desc"], item["price"],
            item["unit"], item["veg"], True,
        )
        for item in data.ITEMS
    ]
    cur.executemany(
        """
        INSERT INTO menu_items (category_id, name, "desc", price, unit, veg, available)
        VALUES (%s, %s, %s, %s, %s, %s, %s)
        """,
        item_rows,
    )

    conn.commit()
    print(f"Inserted {len(category_rows)} categories, {len(item_rows)} menu items.")
    cur.close()
    conn.close()


if __name__ == "__main__":
    main()
