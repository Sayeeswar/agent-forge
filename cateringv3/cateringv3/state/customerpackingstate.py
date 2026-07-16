"""Container packing: manual packs, auto-pack, and cross-state totals."""
import reflex as rx
from cateringv3 import data
from cateringv3.state import packing
from cateringv3.state.customerorderstate import CustomerOrderSelectionState


class CustomerPackingState(rx.State):
    containers: list[dict] = []
    selected_item_to_pack: str = ""

    # ---- sync computed (own state) ----
    @rx.var
    def packing_fee(self) -> int:
        return packing.packing_fee(self.containers)

    @rx.var
    def packing_fee_display(self) -> str:
        return packing.money(self.packing_fee)

    @rx.var
    def portions_packed(self) -> int:
        return packing.portions_packed(self.containers)

    @rx.var
    def container_count(self) -> int:
        return len(self.containers)

    @rx.var
    def has_containers(self) -> bool:
        return len(self.containers) > 0

    # ---- async computed (cross-state) ----
    @rx.var(deps=[CustomerOrderSelectionState.cart, "containers"])
    async def grand_total(self) -> int:
        order = await self.get_state(CustomerOrderSelectionState)
        return packing.grand_total(order.cart, self.containers)

    @rx.var(deps=[CustomerOrderSelectionState.cart, "containers"])
    async def grand_total_display(self) -> str:
        return packing.money(await self.grand_total)

    @rx.var(deps=[CustomerOrderSelectionState.cart, "containers"])
    async def portions_left(self) -> int:
        order = await self.get_state(CustomerOrderSelectionState)
        return packing.total_portions(order.cart) - self.portions_packed

    @rx.var(deps=[CustomerOrderSelectionState.cart, "containers"])
    async def is_fully_packed(self) -> bool:
        order = await self.get_state(CustomerOrderSelectionState)
        total = packing.total_portions(order.cart)
        return total > 0 and (total - self.portions_packed) == 0

    @rx.var(deps=[CustomerOrderSelectionState.cart, "containers"])
    async def pay_button_label(self) -> str:
        return f"Pay {await self.grand_total_display} securely"

    @rx.var(deps=[CustomerOrderSelectionState.cart, "containers"])
    async def portions_left_label(self) -> str:
        left = await self.portions_left
        return "All packed!" if left <= 0 else f"{left} portions left to pack"

    # ---- handlers ----
    @rx.event
    def add_container(self, size: str):
        spec = data.CONTAINER_SPECS[size]
        cid = packing.next_container_id(self.containers)
        self.containers.append({"id": cid, "size": size,
                                "capacity": spec["capacity"], "fee": spec["fee"], "items": {}})

    @rx.event
    def delete_container(self, container_id: int):
        self.containers = [c for c in self.containers if c["id"] != container_id]

    @rx.event
    def select_item_to_pack(self, item_id: str):
        self.selected_item_to_pack = item_id

    @rx.event
    async def pack_into(self, container_id: int):
        if not self.selected_item_to_pack:
            return
        item_id = self.selected_item_to_pack
        for c in self.containers:
            if c["id"] == container_id and packing.container_room(c) > 0:
                order = await self.get_state(CustomerOrderSelectionState)
                if packing.unpacked_counts(order.cart, self.containers).get(item_id, 0) > 0:
                    c["items"][item_id] = c["items"].get(item_id, 0) + 1
                break
        await self._advance_selection()

    @rx.event
    def remove_from_container(self, container_id: int, item_id: str):
        for c in self.containers:
            if c["id"] == container_id and item_id in c["items"]:
                c["items"][item_id] -= 1
                if c["items"][item_id] <= 0:
                    del c["items"][item_id]
                break

    @rx.event
    async def auto_pack(self):
        order = await self.get_state(CustomerOrderSelectionState)
        self.containers = packing.ffd_pack(order.cart, self.containers)

    @rx.event
    def reset_packing(self):
        self.containers = []
        self.selected_item_to_pack = ""

    async def _advance_selection(self):
        order = await self.get_state(CustomerOrderSelectionState)
        left = packing.unpacked_counts(order.cart, self.containers)
        if self.selected_item_to_pack in left:
            return
        self.selected_item_to_pack = next(iter(left), "")
