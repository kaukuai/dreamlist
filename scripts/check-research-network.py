#!/usr/bin/env python3
"""Check official references through the environment's configured proxy.

No proxy overrides, credentials, VPNs or TLS exceptions. Results and successful
responses stay in ignored task-local state, separate from the game's database.
"""
import concurrent.futures
import datetime
import hashlib
import json
import pathlib
import re
import sys
import urllib.error
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[1]
OUTPUT = ROOT / ".sites-runtime" / "research"
SOURCES = {
    "mabinogi-pc": "https://mabinogi.nexon.net/guide/advancedguide",
    "mabinogi-talents": "https://mabinogi.nexon.net/guide/advancedguide/talents",
    "mabinogi-mobile": "https://mabinogimobile.nexon.com/",
    "nintendo-adventure": "https://www.nintendo.com/us/store/products/the-legend-of-zelda-tears-of-the-kingdom-switch/",
    "star-rail": "https://hsr.hoyoverse.com/en-us/",
    "diablo-immortal": "https://diabloimmortal.blizzard.com/en-us/",
}


def check(item):
    key, url = item
    result = {"source": key, "url": url}
    try:
        request = urllib.request.Request(url, headers={"User-Agent": "Dreamlist-Official-Reference-Check/1.0"})
        with urllib.request.urlopen(request, timeout=15) as response:
            data = response.read(1_048_577)
            limited = len(data) > 1_048_576
            data = data[:1_048_576]
            content_type = response.headers.get("Content-Type", "")
            result.update(status="accessible", http_status=response.status, final_url=response.url,
                          content_type=content_type, bytes=len(data), truncated=limited,
                          sha256=hashlib.sha256(data).hexdigest())
            if "html" in content_type or "json" in content_type:
                extension = ".html" if "html" in content_type else ".json"
                cache = OUTPUT / (key + extension)
                cache.write_bytes(data)
                result["cache"] = str(cache.relative_to(ROOT))
                title = re.search(r"<title[^>]*>(.*?)</title>", data.decode("utf-8", "replace"), re.I | re.S)
                if title:
                    result["title"] = re.sub(r"\s+", " ", title.group(1)).strip()[:180]
            else:
                result["status"] = "unexpected_content"
    except urllib.error.HTTPError as error:
        result.update(status="origin_http_error", http_status=error.code,
                      detail="The HTTPS destination responded; inspect its published entry point or access requirements.")
    except urllib.error.URLError as error:
        detail = str(error.reason)
        if "Tunnel connection failed: 403" in detail:
            result.update(status="proxy_denied", detail="The configured egress proxy rejected CONNECT before the official site could respond.")
        elif "CERTIFICATE_VERIFY_FAILED" in detail:
            result.update(status="tls_error", detail="TLS verification failed; trust configuration needs investigation.")
        else:
            result.update(status="connection_error", detail="The request failed before an official response was received.")
    except TimeoutError:
        result.update(status="timeout", detail="No response within the connectivity-check timeout.")
    return result


def main():
    OUTPUT.mkdir(parents=True, exist_ok=True)
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        results = list(pool.map(check, SOURCES.items()))
    report = {"checked_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
              "route": "existing environment proxy; verified TLS", "results": results}
    (OUTPUT / "reference-check.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    for result in results:
        print(f"{result['source']}: {result['status']}" + (f" (HTTP {result['http_status']})" if "http_status" in result else ""))
    print("Report: .sites-runtime/research/reference-check.json")
    if any(result["status"] != "accessible" for result in results):
        print("Official research is not fully available. Review the saved network rules in environment settings, Save and Publish, then rerun this check.")
        return 1
    print("All reference entry points respond. Read the cached pages and verify their actual contents before citing them.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
