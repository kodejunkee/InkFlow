"""
InkFlow Cover Extractor

Multi-strategy cover image extraction from EPUB files.
Saves extracted cover as JPEG with optional resizing.
"""

import os


def extract_cover(book, output_dir):
    """
    Extract cover image from an ebooklib Book using multiple strategies.
    
    Strategies (in priority order):
    1. ITEM_COVER type
    2. OPF metadata cover reference
    3. Item with 'cover' in filename or ID
    4. First image in the EPUB
    
    Args:
        book: ebooklib Book object
        output_dir: Directory to save the extracted cover
    
    Returns:
        Absolute path to saved cover image, or None
    """
    import ebooklib

    cover_data = None
    cover_ext = "jpg"

    # Strategy 1: ITEM_COVER type
    try:
        for item in book.get_items_of_type(ebooklib.ITEM_COVER):
            data = item.get_content()
            if data and len(data) > 100:
                cover_data = data
                cover_ext = _get_extension(item.get_name())
                break
    except Exception:
        pass

    # Strategy 2: OPF metadata cover reference
    if not cover_data:
        try:
            # Look for <meta name="cover" content="cover-image-id"/>
            meta = book.get_metadata("OPF", "cover")
            if meta:
                cover_id = meta[0][1].get("content", "") if len(meta[0]) > 1 else str(meta[0][0])
                if cover_id:
                    for item in book.get_items():
                        if item.id == cover_id:
                            data = item.get_content()
                            if data and len(data) > 100:
                                cover_data = data
                                cover_ext = _get_extension(item.get_name())
                            break
        except Exception:
            pass

    # Strategy 3: Item with 'cover' in filename or ID
    if not cover_data:
        try:
            for item in book.get_items_of_type(ebooklib.ITEM_IMAGE):
                name = (item.get_name() or "").lower()
                item_id = (item.id or "").lower()
                if "cover" in name or "cover" in item_id:
                    data = item.get_content()
                    if data and len(data) > 100:
                        cover_data = data
                        cover_ext = _get_extension(item.get_name())
                        break
        except Exception:
            pass

    # Strategy 4: First image (by size — pick largest)
    if not cover_data:
        try:
            largest = None
            largest_size = 0
            for item in book.get_items_of_type(ebooklib.ITEM_IMAGE):
                data = item.get_content()
                if data and len(data) > largest_size:
                    largest = data
                    largest_size = len(data)
                    cover_ext = _get_extension(item.get_name())
            if largest and largest_size > 1000:
                cover_data = largest
        except Exception:
            pass

    if not cover_data:
        return None

    # Save cover image
    cover_path = os.path.join(output_dir, f"cover.{cover_ext}")
    
    try:
        # Try to process with Pillow (resize, convert to JPEG)
        cover_path = _save_with_pillow(cover_data, output_dir)
    except Exception:
        # Fallback: save raw bytes
        try:
            with open(cover_path, "wb") as f:
                f.write(cover_data)
        except Exception:
            return None

    return cover_path


def _save_with_pillow(cover_data, output_dir):
    """Save cover using Pillow with resizing and JPEG conversion."""
    from PIL import Image
    import io

    img = Image.open(io.BytesIO(cover_data))
    
    # Convert RGBA to RGB (JPEG doesn't support alpha)
    if img.mode in ("RGBA", "P", "LA"):
        background = Image.new("RGB", img.size, (255, 255, 255))
        if img.mode == "RGBA":
            background.paste(img, mask=img.split()[3])
        else:
            img = img.convert("RGBA")
            background.paste(img, mask=img.split()[3])
        img = background

    if img.mode != "RGB":
        img = img.convert("RGB")

    # Resize if oversized (max 800px width, preserve aspect ratio)
    MAX_WIDTH = 800
    MAX_HEIGHT = 1200
    if img.width > MAX_WIDTH or img.height > MAX_HEIGHT:
        img.thumbnail((MAX_WIDTH, MAX_HEIGHT), Image.LANCZOS)

    cover_path = os.path.join(output_dir, "cover.jpg")
    img.save(cover_path, "JPEG", quality=85, optimize=True)
    return cover_path


def _get_extension(filename):
    """Extract file extension, defaulting to 'jpg'."""
    if not filename:
        return "jpg"
    ext = os.path.splitext(filename)[1].lstrip(".").lower()
    return ext if ext in ("jpg", "jpeg", "png", "gif", "webp", "svg") else "jpg"
