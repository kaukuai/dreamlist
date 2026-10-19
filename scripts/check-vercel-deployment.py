#!/usr/bin/env python3
"""Read-only deployment diagnosis using the supplied HTTPS proxy and credentials."""
import json
import os
import subprocess
import sys
import urllib.error
import urllib.parse
import urllib.request

SITE = "https://kaukuai-dreamlist.vercel.app"


def request(url, token=None):
    headers = {"User-Agent": "Dreamlist-deployment-check/1.0", "Accept": "application/json"}
    if token:
        headers["Authorization"] = "Bearer " + token
    try:
        with urllib.request.urlopen(urllib.request.Request(url, headers=headers), timeout=20) as response:
            try:
                data = json.loads(response.read(1024 * 1024))
            except (ValueError, UnicodeError):
                return {"status": response.status, "error": "non_json_response"}
            return {"status": response.status, "data": data}
    except urllib.error.HTTPError as error:
        return {"status": error.code, "error": "origin_http_error"}
    except urllib.error.URLError as error:
        return {"error": "proxy_denied" if "Tunnel connection failed: 403" in str(error.reason) else "connection_error"}


def main():
    head = subprocess.check_output(["git", "rev-parse", "HEAD"], text=True).strip()
    dirty = bool(subprocess.check_output(["git", "status", "--porcelain"], text=True).strip())
    report = {"site": SITE, "local_commit": head, "uncommitted_changes": dirty}
    live = request(SITE + "/api/version")
    report["live"] = {key: value for key, value in live.items() if key != "data"}
    if isinstance(live.get("data"), dict):
        report["live"]["version"] = {key: live["data"].get(key) for key in ["application", "release", "mode", "commit", "features"]}
        report["commit_matches"] = live["data"].get("commit") == head

    token = os.environ.get("VERCEL_TOKEN")
    if token:
        project = os.environ.get("VERCEL_PROJECT_ID") or "kaukuai-dreamlist"
        org = os.environ.get("VERCEL_ORG_ID")
        url = "https://api.vercel.com/v9/projects/" + urllib.parse.quote(project, safe="")
        if org:
            url += "?" + urllib.parse.urlencode({"teamId": org})
        result = request(url, token)
        if "data" in result:
            data = result["data"]
            link = data.get("link") or {}
            production = (data.get("targets") or {}).get("production") or {}
            runtime_mode = next((entry.get("value") for entry in data.get("env", [])
                if entry.get("key") == "DREAMLIST_MODE" and entry.get("type") == "plain"), "browser")
            required_names = {"TURSO_DATABASE_URL", "TURSO_AUTH_TOKEN", "GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET",
                "NEXTAUTH_SECRET", "NEXTAUTH_URL", "DREAMLIST_OWNER_EMAIL"} if runtime_mode == "cloud" else set()
            report["project"] = {
                "id": data.get("id"), "name": data.get("name"),
                "framework": data.get("framework"), "rootDirectory": data.get("rootDirectory"),
                "buildCommand": data.get("buildCommand"), "outputDirectory": data.get("outputDirectory"),
                "git": {key: link.get(key) for key in ["type", "org", "repo", "productionBranch"]},
                "production_state": production.get("readyState"),
                "production_commit": (production.get("meta") or {}).get("githubCommitSha"),
                "runtime_mode": runtime_mode,
                "required_runtime_variables_present": sorted({entry.get("key") for entry in data.get("env", [])
                    if entry.get("key") in required_names}),
            }
        else:
            report["project"] = result
    else:
        report["project"] = {"error": "missing_vercel_authorization", "required_binding": "VERCEL_TOKEN"}

    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 0 if report.get("commit_matches") and not dirty else 1


if __name__ == "__main__":
    sys.exit(main())
