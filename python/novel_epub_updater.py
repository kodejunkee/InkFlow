import os
import json
import zipfile
import re
import xml.etree.ElementTree as ET
import logging
import shutil

logging.basicConfig(level=logging.INFO, format="[InkFlow] %(levelname)s %(message)s")
log = logging.getLogger("novel_epub_updater")

def register_namespaces():
    ET.register_namespace('opf', 'http://www.idpf.org/2007/opf')
    ET.register_namespace('dc', 'http://purl.org/dc/elements/1.1/')
    ET.register_namespace('ncx', 'http://www.daisy.org/z3986/2005/ncx/')
    ET.register_namespace('xhtml', 'http://www.w3.org/1999/xhtml')
    ET.register_namespace('epub', 'http://www.idpf.org/2007/ops')

register_namespaces()

def _collect_chapter_files(chapters_dir: str) -> list[str]:
    if not os.path.isdir(chapters_dir):
        return []
    pattern = re.compile(r"^chapter_\d{4}\.json$")
    files = [os.path.join(chapters_dir, f) for f in os.listdir(chapters_dir) if pattern.match(f)]
    files.sort()
    return files

def _prepare_chapter_body(title: str, raw_content: str) -> str:
    content = raw_content
    try:
        from bs4 import BeautifulSoup
        soup = BeautifulSoup(content, "lxml")
        body = soup.find("body")
        if body:
            content = body.decode_contents()
        else:
            content = soup.decode_contents()
    except Exception:
        pass

    safe_title = title.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace('"', "&quot;")
    return f"""<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <title>{safe_title}</title>
  <link rel="stylesheet" type="text/css" href="style/default.css" />
</head>
<body>
  <h1>{safe_title}</h1>
  {content}
</body>
</html>"""

def update_epub(existing_epub_path: str, new_chapters_dir: str, output_epub_path: str) -> str:
    """
    Appends new chapters to an existing EPUB safely using XML/Zip manipulation.
    """
    try:
        new_chapter_files = _collect_chapter_files(new_chapters_dir)
        if not new_chapter_files:
            return json.dumps({"success": False, "error": "No new chapter files found"})

        # Make a copy of the existing EPUB to output_epub_path
        os.makedirs(os.path.dirname(output_epub_path) or ".", exist_ok=True)
        
        # We will read from existing, and write to a temporary output, then rename
        temp_output = output_epub_path + ".tmp"
        
        opf_path = None
        ncx_path = None
        nav_path = None

        with zipfile.ZipFile(existing_epub_path, 'r') as zin:
            # 1. Find OPF
            container_xml = zin.read('META-INF/container.xml')
            container_root = ET.fromstring(container_xml)
            # Find rootfile
            ns = {'container': 'urn:oasis:names:tc:opendocument:xmlns:container'}
            rootfile = container_root.find('.//container:rootfile', ns)
            if rootfile is None:
                raise Exception("Could not find rootfile in container.xml")
            opf_path = rootfile.attrib['full-path']
            opf_dir = os.path.dirname(opf_path)
            if opf_dir:
                opf_dir += '/'

            opf_xml = zin.read(opf_path)
            opf_root = ET.fromstring(opf_xml)
            opf_ns = {'opf': 'http://www.idpf.org/2007/opf'}
            
            manifest = opf_root.find('opf:manifest', opf_ns)
            spine = opf_root.find('opf:spine', opf_ns)

            # Find NCX and NAV
            for item in manifest.findall('opf:item', opf_ns):
                if item.attrib.get('id') == 'ncx' or item.attrib.get('media-type') == 'application/x-dtbncx+xml':
                    ncx_path = opf_dir + item.attrib['href']
                if item.attrib.get('properties') == 'nav' or item.attrib.get('href', '').endswith('nav.xhtml'):
                    nav_path = opf_dir + item.attrib['href']

            ncx_xml = zin.read(ncx_path) if ncx_path else None
            ncx_root = ET.fromstring(ncx_xml) if ncx_xml else None
            
            nav_xml = zin.read(nav_path) if nav_path else None
            nav_root = ET.fromstring(nav_xml) if nav_xml else None

            with zipfile.ZipFile(temp_output, 'w', zipfile.ZIP_DEFLATED) as zout:
                # Copy all files EXCEPT OPF, NCX, NAV
                for item in zin.infolist():
                    if item.filename not in (opf_path, ncx_path, nav_path):
                        zout.writestr(item, zin.read(item.filename))

                # Process new chapters
                appended_count = 0
                for ch_file in new_chapter_files:
                    with open(ch_file, "r", encoding="utf-8") as f:
                        ch_data = json.load(f)
                    
                    ch_index = ch_data.get("index", 0)
                    ch_title = ch_data.get("title", f"Chapter {ch_index + 1}")
                    ch_content = ch_data.get("content", "")
                    if not ch_content:
                        continue

                    xhtml_filename = f"chapter_{ch_index:04d}.xhtml"
                    xhtml_path = opf_dir + xhtml_filename
                    
                    # 1. Write the new XHTML to zip
                    body_html = _prepare_chapter_body(ch_title, ch_content)
                    zout.writestr(xhtml_path, body_html.encode('utf-8'))

                    # 2. Add to OPF Manifest
                    item_id = f"chapter_{ch_index:04d}"
                    ET.SubElement(manifest, '{http://www.idpf.org/2007/opf}item', {
                        'id': item_id,
                        'href': xhtml_filename,
                        'media-type': 'application/xhtml+xml'
                    })

                    # 3. Add to OPF Spine
                    ET.SubElement(spine, '{http://www.idpf.org/2007/opf}itemref', {
                        'idref': item_id
                    })

                    # 4. Add to NCX
                    if ncx_root is not None:
                        navMap = ncx_root.find('.//{http://www.daisy.org/z3986/2005/ncx/}navMap')
                        if navMap is not None:
                            # get highest playOrder
                            play_orders = [int(np.attrib.get('playOrder', 0)) for np in navMap.findall('.//{http://www.daisy.org/z3986/2005/ncx/}navPoint')]
                            next_play_order = max(play_orders) + 1 if play_orders else 1
                            
                            navPoint = ET.SubElement(navMap, '{http://www.daisy.org/z3986/2005/ncx/}navPoint', {
                                'id': f'navPoint-{next_play_order}',
                                'playOrder': str(next_play_order)
                            })
                            navLabel = ET.SubElement(navPoint, '{http://www.daisy.org/z3986/2005/ncx/}navLabel')
                            text = ET.SubElement(navLabel, '{http://www.daisy.org/z3986/2005/ncx/}text')
                            text.text = ch_title
                            ET.SubElement(navPoint, '{http://www.daisy.org/z3986/2005/ncx/}content', {
                                'src': xhtml_filename
                            })

                    # 5. Add to NAV
                    if nav_root is not None:
                        # Find <nav epub:type="toc"> -> <ol>
                        ns_nav = {'xhtml': 'http://www.w3.org/1999/xhtml', 'epub': 'http://www.idpf.org/2007/ops'}
                        navs = nav_root.findall('.//xhtml:nav', ns_nav)
                        toc_nav = next((n for n in navs if n.attrib.get('{http://www.idpf.org/2007/ops}type') == 'toc'), None)
                        if toc_nav is not None:
                            ol = toc_nav.find('xhtml:ol', ns_nav)
                            if ol is not None:
                                li = ET.SubElement(ol, '{http://www.w3.org/1999/xhtml}li')
                                a = ET.SubElement(li, '{http://www.w3.org/1999/xhtml}a', {'href': xhtml_filename})
                                a.text = ch_title

                    appended_count += 1

                # Write updated OPF, NCX, NAV
                # ElementTree writes attributes nicely, but we need XML declaration
                zout.writestr(opf_path, ET.tostring(opf_root, encoding='utf-8', xml_declaration=True))
                if ncx_path and ncx_root is not None:
                    zout.writestr(ncx_path, ET.tostring(ncx_root, encoding='utf-8', xml_declaration=True))
                if nav_path and nav_root is not None:
                    zout.writestr(nav_path, ET.tostring(nav_root, encoding='utf-8', xml_declaration=True))

        # Replace output path
        if os.path.exists(output_epub_path):
            os.remove(output_epub_path)
        shutil.move(temp_output, output_epub_path)

        log.info("Appended %d chapters to %s", appended_count, output_epub_path)
        return json.dumps({"success": True, "appendedCount": appended_count, "path": output_epub_path})

    except Exception as e:
        log.error("EPUB update failed: %s", e, exc_info=True)
        return json.dumps({"success": False, "error": str(e)})
