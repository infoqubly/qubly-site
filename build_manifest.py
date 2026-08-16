#!/usr/bin/env python3
"""Build a portable render-evaluation package with clearly renamed image copies."""

from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import json
import os
import re
import shutil
import unicodedata
from pathlib import Path

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp", ".tif", ".tiff"}
ASSET_DIR_NAME = "immagini_valutazione"

VOTERS = [
    {"id": "voter_1", "label": "Marco"},
    {"id": "voter_2", "label": "Matteo"},
    {"id": "voter_3", "label": "Samu"},
    {"id": "voter_4", "label": "Vlad"},
]

SUBJECT_RULES = [
    {"key": "corridoio", "label": "corridoio", "keywords": ["corridoio"]},
    {"key": "cucina", "label": "cucina", "keywords": ["cucina", "klanec"]},
    {"key": "cerchio_rosso", "label": "cerchio rosso", "keywords": ["cerchio rosso", "cerchio"]},
    {"key": "statua_giardino", "label": "statua / giardino", "keywords": ["statua", "scale esterne", "giardino", "parco"]},
    {"key": "biblioteca", "label": "biblioteca", "keywords": ["biblioteca"]},
    {"key": "yacht", "label": "yacht", "keywords": ["yacht", "exterior middle"]},
]

CATEGORY_RULES = [
    {
        "category": "Multi Prompt",
        "folder": "06_Multi_Prompt",
        "slug": "Multi_Prompt",
        "method": "prompt_manuali_multiprompt",
        "keywords": ["manual multiprompt", "multiprompt"],
    },
    {
        "category": "D5 normale",
        "folder": "01_D5_Norm",
        "slug": "D5_Norm",
        "method": "D5_render_normale",
        "keywords": ["d5 norm"],
    },
    {
        "category": "Prompt drammatico",
        "folder": "02_Prompt_Drammatico",
        "slug": "Prompt_Drammatico",
        "method": "reprompt_drammatico",
        "keywords": ["dram norm", "drammatico", "dram"],
    },
    {
        "category": "Chat Sol",
        "folder": "04_Chat_Sol",
        "slug": "Chat_Sol",
        "method": "reprompt_sol",
        "keywords": ["riprompt sol"],
    },
    {
        "category": "Chat Normale",
        "folder": "03_Chat_Normale",
        "slug": "Chat_Normale",
        "method": "reprompt_normale",
        "keywords": ["riprompt norm"],
    },
    {
        "category": "Claude",
        "folder": "05_Claude",
        "slug": "Claude",
        "method": "prompt_Claude",
        "keywords": ["prompt"],
    },
]

CATEGORY_DISPLAY_ORDER = [
    "D5_Norm",
    "Prompt_Drammatico",
    "Chat_Normale",
    "Chat_Sol",
    "Claude",
    "Multi_Prompt",
    "Da_Verificare",
]

UNCATEGORIZED = {
    "category": "Da verificare",
    "folder": "99_Da_Verificare",
    "slug": "Da_Verificare",
    "method": "classificazione_da_verificare",
    "matchedKeyword": "",
}

# Extra rules for source files whose names do not carry enough subject information.
SOURCE_OVERRIDES = {
    "manual multiprompt/09.jpg": {
        "subjectKey": "cucina",
        "subject": "cucina",
        "matchedKeyword": "override manuale: 09.jpg",
        "reason": "Abbinato alla cucina dopo verifica visiva: il file manual multiprompt/09.jpg mostra una scena cucina.",
        "confidence": "media",
    },
    "manual multiprompt/04.jpg": {
        "subjectKey": "yacht",
        "subject": "yacht",
        "matchedKeyword": "override manuale: 04.jpg",
        "reason": "Abbinato allo yacht dopo verifica visiva: il file manual multiprompt/04.jpg mostra la scena yacht.",
        "confidence": "media",
    },
}


def normalize(value: str) -> str:
    value = unicodedata.normalize("NFKD", value)
    value = "".join(ch for ch in value if not unicodedata.combining(ch))
    value = value.lower()
    value = re.sub(r"[_\-]+", " ", value)
    value = re.sub(r"\s+", " ", value)
    return value.strip()


def slugify(value: str, fallback: str = "file") -> str:
    value = unicodedata.normalize("NFKD", value)
    value = "".join(ch for ch in value if not unicodedata.combining(ch))
    value = re.sub(r"[^A-Za-z0-9]+", "_", value)
    value = re.sub(r"_+", "_", value).strip("_")
    return value or fallback


def relpath(path: Path, base: Path) -> str:
    return path.relative_to(base).as_posix()


def browser_path(path: Path, output_dir: Path) -> str:
    return os.path.relpath(path, output_dir).replace(os.sep, "/")


def stable_id(relative_path: str) -> str:
    digest = hashlib.sha1(relative_path.lower().encode("utf-8")).hexdigest()[:12]
    return f"img_{digest}"


def read_dimensions(path: Path) -> dict[str, int | None]:
    try:
        from PIL import Image

        with Image.open(path) as img:
            return {"width": img.width, "height": img.height}
    except Exception:
        return {"width": None, "height": None}


def detect_subject(search_text: str) -> dict[str, str] | None:
    normalized = normalize(search_text)
    for rule in SUBJECT_RULES:
        for keyword in rule["keywords"]:
            if normalize(keyword) in normalized:
                return {"key": rule["key"], "label": rule["label"], "matchedKeyword": keyword}
    return None


def subject_by_key(key: str) -> dict[str, str] | None:
    for rule in SUBJECT_RULES:
        if rule["key"] == key:
            return rule
    return None


def detect_category(search_text: str) -> dict[str, str]:
    normalized = normalize(search_text)
    for rule in CATEGORY_RULES:
        for keyword in rule["keywords"]:
            if normalize(keyword) in normalized:
                return {**rule, "matchedKeyword": keyword}
    return dict(UNCATEGORIZED)


def list_images(root: Path, output_dir: Path) -> list[Path]:
    images: list[Path] = []
    for path in root.rglob("*"):
        if not path.is_file():
            continue
        if path.suffix.lower() not in IMAGE_EXTENSIONS:
            continue
        try:
            path.relative_to(output_dir)
            continue
        except ValueError:
            images.append(path)
    return sorted(images, key=lambda item: relpath(item, root).lower())


def source_override(relative_path: str) -> dict | None:
    return SOURCE_OVERRIDES.get(relative_path.lower())


def subject_order(subject_key: str) -> int:
    for index, rule in enumerate(SUBJECT_RULES):
        if rule["key"] == subject_key:
            return index
    return len(SUBJECT_RULES)


def category_order(category_slug: str) -> int:
    try:
        return CATEGORY_DISPLAY_ORDER.index(category_slug)
    except ValueError:
        return len(CATEGORY_DISPLAY_ORDER)


def variant_sort_key(record: dict) -> tuple[int, int, str]:
    return (
        subject_order(record.get("subjectKey", "")),
        category_order(record.get("categorySlug", "")),
        record.get("sourceRelativePath", "").lower(),
    )


def image_base_record(path: Path, root: Path) -> dict:
    relative = relpath(path, root)
    dims = read_dimensions(path)
    return {
        "fileName": path.name,
        "sourceRelativePath": relative,
        "absolutePath": str(path),
        "extension": path.suffix.lower(),
        "bytes": path.stat().st_size,
        "width": dims["width"],
        "height": dims["height"],
    }


def ensure_clean_asset_dir(output_dir: Path) -> Path:
    asset_dir = (output_dir / ASSET_DIR_NAME).resolve()
    output_resolved = output_dir.resolve()
    if output_resolved not in asset_dir.parents:
        raise RuntimeError(f"Asset directory outside output directory: {asset_dir}")
    if asset_dir.exists():
        shutil.rmtree(asset_dir)
    asset_dir.mkdir(parents=True, exist_ok=True)
    return asset_dir


def copy_image(source: Path, destination: Path) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(source, destination)


def original_asset_name(record: dict) -> str:
    subject_key = record["subjectKey"]
    stem = slugify(Path(record["fileName"]).stem)
    return f"{subject_key}__Originale__fonte_{stem}{record['extension']}"


def variant_asset_name(record: dict, sequence: int) -> str:
    subject_key = record["subjectKey"]
    category_slug = record["categorySlug"]
    source_stem = slugify(Path(record["fileName"]).stem)
    return f"{subject_key}__{category_slug}__{sequence:02d}__fonte_{source_stem}{record['extension']}"


def build_manifest(root: Path, output_dir: Path) -> dict:
    root = root.resolve()
    output_dir = output_dir.resolve()
    asset_dir = ensure_clean_asset_dir(output_dir)
    original_dir = root / "original"
    all_images = list_images(root, output_dir)
    original_paths = [path for path in all_images if original_dir in path.parents]
    variant_paths = [path for path in all_images if original_dir not in path.parents]

    originals: list[dict] = []
    originals_by_subject: dict[str, dict] = {}
    for path in original_paths:
        search_text = relpath(path, root)
        subject = detect_subject(search_text)
        record = image_base_record(path, root)
        record.update(
            {
                "subjectKey": subject["key"] if subject else "da_verificare",
                "subject": subject["label"] if subject else "da verificare",
                "matchedKeyword": subject["matchedKeyword"] if subject else "",
                "matchStatus": "matched" if subject else "da_verificare",
                "category": "Originale",
                "categorySlug": "Originale",
                "displayName": f"{subject['label']} - Originale" if subject else f"{path.stem} - Originale",
            }
        )
        asset_path = asset_dir / "00_originali" / original_asset_name(record)
        copy_image(path, asset_path)
        record["renamedFileName"] = asset_path.name
        record["renamedRelativePath"] = browser_path(asset_path, output_dir)
        record["browserPath"] = record["renamedRelativePath"]
        originals.append(record)
        if subject and subject["key"] not in originals_by_subject:
            originals_by_subject[subject["key"]] = record

    variants: list[dict] = []
    sequence_by_group: dict[tuple[str, str], int] = {}
    for path in variant_paths:
        source_relative = relpath(path, root)
        search_text = source_relative
        category = detect_category(search_text)
        override = source_override(source_relative)
        detected_subject = detect_subject(search_text)
        if override:
            subject = {
                "key": override["subjectKey"],
                "label": override["subject"],
                "matchedKeyword": override["matchedKeyword"],
            }
        else:
            subject = detected_subject

        record = image_base_record(path, root)
        record["id"] = stable_id(record["sourceRelativePath"])
        record["category"] = category["category"]
        record["categoryFolder"] = category["folder"]
        record["categorySlug"] = category["slug"]
        record["categoryMatchedKeyword"] = category["matchedKeyword"]
        record["creationMethodSlug"] = category["method"]

        if not subject:
            record.update(
                {
                    "subjectKey": "da_verificare",
                    "subject": "da verificare",
                    "subjectMatchedKeyword": "",
                    "matchStatus": "da_verificare",
                    "matchConfidence": "bassa",
                    "matchReason": "Nome file o cartella senza parole chiave soggetto sufficienti.",
                    "originalFileName": "",
                    "originalSourceRelativePath": "",
                    "originalPath": "",
                    "originalAbsolutePath": "",
                    "originalWidth": None,
                    "originalHeight": None,
                }
            )
        else:
            original = originals_by_subject.get(subject["key"])
            if original:
                is_alias_match = subject["matchedKeyword"] in {"scale esterne", "giardino", "parco"}
                confidence = "media" if is_alias_match or override else "alta"
                reason = override["reason"] if override else f"Abbinato tramite parola chiave '{subject['matchedKeyword']}'."
                record.update(
                    {
                        "subjectKey": subject["key"],
                        "subject": subject["label"],
                        "subjectMatchedKeyword": subject["matchedKeyword"],
                        "matchStatus": "matched",
                        "matchConfidence": override.get("confidence", confidence) if override else confidence,
                        "matchReason": reason,
                        "originalFileName": original["fileName"],
                        "originalSourceRelativePath": original["sourceRelativePath"],
                        "originalPath": original["browserPath"],
                        "originalAbsolutePath": original["absolutePath"],
                        "originalWidth": original["width"],
                        "originalHeight": original["height"],
                        "originalRenamedFileName": original["renamedFileName"],
                    }
                )
            else:
                record.update(
                    {
                        "subjectKey": subject["key"],
                        "subject": subject["label"],
                        "subjectMatchedKeyword": subject["matchedKeyword"],
                        "matchStatus": "da_verificare",
                        "matchConfidence": "bassa",
                        "matchReason": "Soggetto riconosciuto, ma nessun originale corrispondente nella cartella original.",
                        "originalFileName": "",
                        "originalSourceRelativePath": "",
                        "originalPath": "",
                        "originalAbsolutePath": "",
                        "originalWidth": None,
                        "originalHeight": None,
                    }
                )

        sequence_key = (record["subjectKey"], record["categorySlug"])
        sequence_by_group[sequence_key] = sequence_by_group.get(sequence_key, 0) + 1
        subject_folder = record["subjectKey"] if record["subjectKey"] != "da_verificare" else "zz_da_verificare"
        asset_name = variant_asset_name(record, sequence_by_group[sequence_key])
        asset_path = asset_dir / "varianti" / subject_folder / record["categoryFolder"] / asset_name
        copy_image(path, asset_path)
        record["renamedFileName"] = asset_path.name
        record["renamedRelativePath"] = browser_path(asset_path, output_dir)
        record["variantPath"] = record["renamedRelativePath"]
        record["variantAbsolutePath"] = str(asset_path)
        record["displayName"] = f"{record['subject']} - {record['category']}"
        variants.append(record)

    variants.sort(key=variant_sort_key)

    manifest_id_source = "|".join(item["sourceRelativePath"] for item in variants)
    manifest_id = hashlib.sha1(manifest_id_source.encode("utf-8")).hexdigest()[:12]
    unpaired = [item for item in variants if item["matchStatus"] != "matched"]

    subjects = []
    for rule in SUBJECT_RULES:
        subject_variants = [item for item in variants if item["subjectKey"] == rule["key"]]
        original = originals_by_subject.get(rule["key"])
        if subject_variants or original:
            subjects.append(
                {
                    "key": rule["key"],
                    "label": rule["label"],
                    "originalPath": original["browserPath"] if original else "",
                    "originalFileName": original["fileName"] if original else "",
                    "originalRenamedFileName": original["renamedFileName"] if original else "",
                    "variantIds": [item["id"] for item in subject_variants],
                }
            )

    return {
        "manifestVersion": 2,
        "manifestId": manifest_id,
        "generatedAt": dt.datetime.now(dt.timezone.utc).isoformat(),
        "sourceRoot": str(root),
        "outputFolder": str(output_dir),
        "assetFolder": ASSET_DIR_NAME,
        "imageExtensions": sorted(IMAGE_EXTENSIONS),
        "voters": VOTERS,
        "subjectRules": SUBJECT_RULES,
        "categoryRules": CATEGORY_RULES,
        "counts": {
            "originals": len(originals),
            "variants": len(variants),
            "unpairedVariants": len(unpaired),
            "renamedImageCopies": len(originals) + len(variants),
        },
        "subjects": subjects,
        "originals": originals,
        "variants": variants,
        "unpairedVariants": [
            {
                "fileName": item["fileName"],
                "renamedFileName": item["renamedFileName"],
                "sourceRelativePath": item["sourceRelativePath"],
                "subject": item["subject"],
                "category": item["category"],
                "matchReason": item["matchReason"],
            }
            for item in unpaired
        ],
    }


def write_manifest(manifest: dict, output_dir: Path) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)
    json_text = json.dumps(manifest, ensure_ascii=False, indent=2)
    (output_dir / "manifest.json").write_text(json_text + "\n", encoding="utf-8")
    (output_dir / "manifest.js").write_text(
        "window.RENDER_REVIEW_MANIFEST = " + json_text + ";\n",
        encoding="utf-8",
    )


def parse_args() -> argparse.Namespace:
    script_dir = Path(__file__).resolve().parent
    parser = argparse.ArgumentParser(description="Genera un pacchetto offline per la valutazione render.")
    parser.add_argument("--root", type=Path, default=script_dir.parent, help="Cartella sorgente con immagini e original.")
    parser.add_argument("--output", type=Path, default=script_dir, help="Cartella di output valutazione_render.")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    manifest = build_manifest(args.root, args.output)
    write_manifest(manifest, args.output)
    counts = manifest["counts"]
    print(f"Originali: {counts['originals']}")
    print(f"Varianti: {counts['variants']}")
    print(f"Copie rinominate: {counts['renamedImageCopies']}")
    print(f"Da verificare: {counts['unpairedVariants']}")
    if manifest["unpairedVariants"]:
        for item in manifest["unpairedVariants"]:
            print(f"- {item['sourceRelativePath']}: {item['matchReason']}")


if __name__ == "__main__":
    main()
