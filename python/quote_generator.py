"""
InkFlow Quote Card Generator (Phase 4)

Generates premium social-media-style quote card images using Pillow.
"""

import os


def generate_quote_card(cover_path, quote_text, author, title, chapter_title, output_path):
    """
    Generate a premium quote card image.
    
    Args:
        cover_path: Path to the book cover image (for blurred background)
        quote_text: The highlighted text to display
        author: Book author name
        title: Book title
        chapter_title: Chapter name
        output_path: Where to save the generated image
    
    Returns:
        Path to the generated image, or None on failure
    """
    try:
        from PIL import Image, ImageFilter, ImageDraw, ImageFont, ImageEnhance
        import textwrap
    except ImportError:
        return None

    try:
        output_size = (1080, 1920)

        # ── Background ───────────────────────────────────────────────────
        if cover_path and os.path.exists(cover_path):
            cover = Image.open(cover_path).convert("RGB")
            cover = cover.resize(output_size, Image.LANCZOS)
        else:
            # Gradient background fallback
            cover = Image.new("RGB", output_size, (26, 26, 46))

        # Blur and darken
        blurred = cover.filter(ImageFilter.GaussianBlur(radius=25))
        enhancer = ImageEnhance.Brightness(blurred)
        darkened = enhancer.enhance(0.35)

        # Gradient overlay
        card = darkened.convert("RGBA")
        gradient = Image.new("RGBA", output_size, (0, 0, 0, 0))
        draw_grad = ImageDraw.Draw(gradient)
        for y in range(output_size[1]):
            alpha = int(120 * (y / output_size[1]))
            draw_grad.line([(0, y), (output_size[0], y)], fill=(0, 0, 0, alpha))
        card = Image.alpha_composite(card, gradient)

        # ── Text ─────────────────────────────────────────────────────────
        draw = ImageDraw.Draw(card)
        margin = 80

        # Try to load bundled fonts, fall back to default
        try:
            font_dir = os.path.dirname(os.path.abspath(__file__))
            quote_font = ImageFont.truetype(os.path.join(font_dir, "fonts", "Merriweather-Regular.ttf"), 40)
            meta_font = ImageFont.truetype(os.path.join(font_dir, "fonts", "Inter-Medium.ttf"), 22)
            small_font = ImageFont.truetype(os.path.join(font_dir, "fonts", "Inter-Regular.ttf"), 18)
        except Exception:
            quote_font = ImageFont.load_default()
            meta_font = ImageFont.load_default()
            small_font = ImageFont.load_default()

        # Quote mark
        draw.text((margin, output_size[1] // 4 - 60), "\u201c", font=quote_font, fill=(255, 255, 255, 100))

        # Wrapped quote text
        wrapped = textwrap.fill(quote_text, width=38)
        lines = wrapped.split("\n")[:12]  # Max 12 lines
        truncated = "\n".join(lines)
        
        quote_y = output_size[1] // 4
        draw.multiline_text(
            (margin, quote_y),
            truncated,
            font=quote_font,
            fill=(255, 255, 255, 230),
            spacing=16,
        )

        # Attribution
        attr_y = output_size[1] - 240
        draw.text((margin, attr_y), f"\u2014 {title}", font=meta_font, fill=(255, 255, 255, 200))
        draw.text((margin, attr_y + 36), f"by {author}", font=small_font, fill=(255, 255, 255, 150))
        if chapter_title:
            draw.text((margin, attr_y + 66), chapter_title, font=small_font, fill=(255, 255, 255, 100))

        # InkFlow watermark
        draw.text(
            (output_size[0] - margin - 100, output_size[1] - 60),
            "InkFlow",
            font=small_font,
            fill=(255, 255, 255, 80),
        )

        # Save
        card = card.convert("RGB")
        card.save(output_path, "JPEG", quality=92, optimize=True)
        return output_path

    except Exception:
        return None
