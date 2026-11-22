import urllib.request
import json
import sys

def main():
    url = "https://api.github.com/repos/PiduguShivaram/SKYGUARD/actions/runs?branch=feature/forensic-remediation-and-product-alignment&per_page=3"
    req = urllib.request.Request(url, headers={"User-Agent": "Antigravity-CI-Monitor"})
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode())
        runs = data.get("workflow_runs", [])
        if not runs:
            print("No workflow runs found.")
            return
        for r in runs:
            run_id = r["id"]
            status = r["status"]
            conclusion = r["conclusion"]
            sha = r["head_sha"][:7]
            msg = (r.get("head_commit", {}) or {}).get("message", "").split("\n")[0]
            print(f"Run {run_id} | Status: {status} | Conclusion: {conclusion} | SHA: {sha} | Msg: {msg}")
            
        latest_run_id = runs[0]["id"]
        jobs_url = f"https://api.github.com/repos/PiduguShivaram/SKYGUARD/actions/runs/{latest_run_id}/jobs"
        req_jobs = urllib.request.Request(jobs_url, headers={"User-Agent": "Antigravity-CI-Monitor"})
        with urllib.request.urlopen(req_jobs) as resp_jobs:
            jobs_data = json.loads(resp_jobs.read().decode())
            print(f"\n--- Jobs for Run {latest_run_id} ({sha}) ---")
            for j in jobs_data.get("jobs", []):
                print(f"  * {j['name']} -> {j['status']} ({j['conclusion']})")

if __name__ == "__main__":
    main()

