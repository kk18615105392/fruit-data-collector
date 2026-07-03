"""从源图生成 Android 各密度 launcher 图标。"""
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "assets" / "fruit-app-icon.png"
RES = ROOT / "android" / "app" / "src" / "main" / "res"

LEGACY_SIZES = {
    "mipmap-mdpi": 48,
    "mipmap-hdpi": 72,
    "mipmap-xhdpi": 96,
    "mipmap-xxhdpi": 144,
    "mipmap-xxxhdpi": 192,
}

FOREGROUND_SIZES = {
    "mipmap-mdpi": 108,
    "mipmap-hdpi": 162,
    "mipmap-xhdpi": 216,
    "mipmap-xxhdpi": 324,
    "mipmap-xxxhdpi": 432,
}

NAMES = ("ic_launcher.png", "ic_launcher_round.png", "ic_launcher_foreground.png")


def save_resized(img: Image.Image, folder: str, size: int, name: str) -> None:
    out_dir = RES / folder
    out_dir.mkdir(parents=True, exist_ok=True)
    resized = img.resize((size, size), Image.Resampling.LANCZOS)
    resized.save(out_dir / name, format="PNG", optimize=True)


def main() -> None:
    if not SOURCE.exists():
        raise SystemExit(f"源图不存在: {SOURCE}")

    img = Image.open(SOURCE).convert("RGBA")

    for folder, size in LEGACY_SIZES.items():
        save_resized(img, folder, size, "ic_launcher.png")
        save_resized(img, folder, size, "ic_launcher_round.png")

    for folder, size in FOREGROUND_SIZES.items():
        save_resized(img, folder, size, "ic_launcher_foreground.png")

    print("Android 图标已生成到 android/app/src/main/res/mipmap-*")


if __name__ == "__main__":
    main()
