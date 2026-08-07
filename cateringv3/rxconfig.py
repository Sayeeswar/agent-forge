import reflex as rx

config = rx.Config(
    app_name="cateringv3",
    env_file=".env",
    plugins=[
        rx.plugins.SitemapPlugin(),
        rx.plugins.TailwindV4Plugin(),
    ]
)