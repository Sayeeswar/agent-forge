"""Mock admin orders. Item ids/prices always reference the real customer menu (data.py)."""

MOCK_ORDERS = [
    {
        "id": "O-2401",
        "customer_name": "Kavya Iyer",
        "phone": "+91 98452 71034",
        "items": {"paneer-paratha": 2, "ghee-phulka": 4, "dal-tadka": 1},
        "payment_method": "online",
        "placed_display": "Placed Yesterday 6:14 PM",
        "is_same_day": False,
        "status": "open",
        "struck_item_ids": [],
        "is_special": False,
        "special_note": "",
    },
    {
        "id": "O-2402",
        "customer_name": "Rohit S.",
        "phone": "+91 90000 11122",
        "items": {"puri": 6, "sambar": 2, "kachumber": 2},
        "payment_method": "cash",
        "placed_display": "Placed Yesterday 7:02 PM",
        "is_same_day": False,
        "status": "open",
        "struck_item_ids": [],
        "is_special": False,
        "special_note": "",
    },
    {
        "id": "O-2403",
        "customer_name": "Meera K.",
        "phone": "+91 98123 45678",
        "items": {"dal-makhani": 1, "plain-rice": 1},
        "payment_method": "online",
        "placed_display": "Placed Yesterday 8:31 PM",
        "is_same_day": False,
        "status": "completed",
        "struck_item_ids": [],
        "is_special": False,
        "special_note": "",
    },
    {
        "id": "O-2404",
        "customer_name": "Suresh V.",
        "phone": "+91 91234 56780",
        "items": {"paneer-butter-masala": 1, "ghee-chapathi": 4, "dal-fry": 1},
        "payment_method": "cash",
        "placed_display": "Placed 8:55 AM today",
        "is_same_day": True,
        "status": "open",
        "struck_item_ids": [],
        "is_special": True,
        "special_note": (
            "Pack the dal separately in a steel container if possible. "
            "Extra spice level for Suresh — he likes it really hot. "
            "Delivery between 12:30 and 1 pm only."
        ),
    },
    {
        "id": "O-2405",
        "customer_name": "Nisha A.",
        "phone": "+91 99887 66554",
        "items": {"bhindi-fry": 2, "sambar": 1},
        "payment_method": "online",
        "placed_display": "Placed 11:18 AM today",
        "is_same_day": True,
        "status": "open",
        "struck_item_ids": [],
        "is_special": True,
        "special_note": (
            'Birthday delivery — please include a small card with '
            '"Happy Birthday Aanya" if you can. Door no. 4B, call from gate.'
        ),
    },
    {
        "id": "O-2406",
        "customer_name": "Vinay D.",
        "phone": "+91 90909 09090",
        "items": {"chana-masala": 1, "jeera-rice": 1, "oilless-phulka": 4},
        "payment_method": "cash",
        "placed_display": "Placed 12:04 PM today",
        "is_same_day": True,
        "status": "partial",
        "struck_item_ids": ["oilless-phulka"],
        "is_special": False,
        "special_note": "",
    },
]
