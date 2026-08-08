"""Admin menu: draft (Edit) vs published (View) snapshot, Publish copies draft -> published."""
import copy
import reflex as rx
from sqlalchemy.orm import selectinload

from cateringv3.models import Category, MenuItem


class AdminMenuState(rx.State):
    published_items: list[dict] = []
    draft_items: list[dict] = []
    active_tab: str = "view"
    active_category: str = ""

    @rx.event
    def load_menu(self):
        if self.published_items:
            return
        with rx.session() as session:
            categories = session.exec(Category.select().order_by(Category.sort_order)).all()
            rows = session.exec(MenuItem.select().options(selectinload(MenuItem.category))).all()
        seeded = [
            {
                "db_id": r.id, "id": str(r.id), "category": r.category.name,
                "name": r.name, "desc": r.desc, "price": r.price,
                "unit": r.unit, "veg": r.veg, "available": r.available,
            }
            for r in rows
        ]
        self.published_items = copy.deepcopy(seeded)
        self.draft_items = copy.deepcopy(seeded)
        self.active_category = categories[0].name if categories else ""

    @rx.var
    def _active_source(self) -> list[dict]:
        return self.draft_items if self.active_tab in ("edit", "publish") else self.published_items

    @rx.var
    def active_items(self) -> list[dict]:
        return [i for i in self._active_source if i["category"] == self.active_category]

    @rx.var
    def category_rows(self) -> list[dict]:
        source = self._active_source
        seen = []
        for i in source:
            if i["category"] not in seen:
                seen.append(i["category"])
        return [
            {"name": cat, "count": sum(1 for i in source if i["category"] == cat)}
            for cat in seen
        ]

    @rx.var
    def draft_item_count(self) -> int:
        return len(self.draft_items)

    @rx.var
    def ready_to_publish_label(self) -> str:
        return f"{self.draft_item_count} items ready · Publish →"

    @rx.event
    def set_tab(self, tab: str):
        self.active_tab = tab

    @rx.event
    def set_category(self, name: str):
        self.active_category = name

    def _find_draft(self, item_id: str):
        for item in self.draft_items:
            if item["id"] == item_id:
                return item
        return None

    @rx.event
    def update_name(self, item_id: str, value: str):
        item = self._find_draft(item_id)
        if item is not None:
            item["name"] = value

    @rx.event
    def update_price(self, item_id: str, value: str):
        item = self._find_draft(item_id)
        if item is not None and value.isdigit():
            item["price"] = int(value)

    @rx.event
    def update_desc(self, item_id: str, value: str):
        item = self._find_draft(item_id)
        if item is not None:
            item["desc"] = value

    @rx.event
    def update_unit(self, item_id: str, value: str):
        item = self._find_draft(item_id)
        if item is not None:
            item["unit"] = value

    @rx.event
    def toggle_available(self, item_id: str):
        item = self._find_draft(item_id)
        if item is not None:
            item["available"] = not item["available"]

    @rx.event
    def add_item(self, category: str):
        new_id = f"draft-item-{len(self.draft_items) + 1}"
        self.draft_items.append({
            "db_id": None, "id": new_id, "category": category, "name": "New item",
            "desc": "", "price": 0, "unit": "per pc", "veg": True, "available": True,
        })

    @rx.event
    def publish(self):
        with rx.session() as session:
            categories = {c.name: c.id for c in session.exec(Category.select()).all()}
            for item in self.draft_items:
                if item["db_id"] is not None:
                    row = session.get(MenuItem, item["db_id"])
                    row.name = item["name"]
                    row.desc = item["desc"]
                    row.price = item["price"]
                    row.unit = item["unit"]
                    row.veg = item["veg"]
                    row.available = item["available"]
                else:
                    row = MenuItem(
                        category_id=categories[item["category"]],
                        name=item["name"], desc=item["desc"], price=item["price"],
                        unit=item["unit"], veg=item["veg"], available=item["available"],
                    )
                    session.add(row)
                session.commit()
                item["db_id"] = row.id
                item["id"] = str(row.id)
        self.published_items = copy.deepcopy(self.draft_items)
