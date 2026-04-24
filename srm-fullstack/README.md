# srm-fullstack

REST API challenge — processes directed edge lists to build forest trees, detect cycles, and return structured JSON. Deployed on AWS Lambda + API Gateway with a static frontend on S3.

## Project Structure

```
srm-fullstack/
├── backend/
│   ├── src/
│   │   ├── handler.js      # AWS Lambda entry point
│   │   ├── app.js          # Express app + POST /bfhl route
│   │   └── processor.js    # Validation, tree building, cycle detection
│   ├── package.json
│   └── .gitignore
├── frontend/
│   ├── index.html          # Single-page UI
│   ├── style.css           # Dark theme, responsive
│   └── app.js              # Fetch + DOM rendering
├── template.yaml           # AWS SAM template
├── samconfig.toml          # SAM deploy defaults
├── deploy.ps1              # S3 frontend deploy script (Windows)
└── README.md
```

## Local Setup

```bash
cd backend
npm install
npm run dev       # http://localhost:3000
```

Open `frontend/index.html` in a browser. Set the API Base URL to `http://localhost:3000`.

## API

**`POST /bfhl`**

**Request**
```json
{
  "data": ["A->B", "A->C", "B->D", "X->Y", "Y->Z", "Z->X", "G->H", "G->H", "hello"]
}
```

**Response**
```json
{
  "user_id": "akulasidharthnaidu_24052006",
  "email_id": "sa0858@srmist.edu.in",
  "college_roll_number": "RA2311003010088",
  "hierarchies": [
    { "root": "A", "tree": { "A": { "B": { "D": {} }, "C": {} } }, "depth": 3 },
    { "root": "X", "tree": {}, "has_cycle": true },
    { "root": "G", "tree": { "G": { "H": {} } }, "depth": 2 }
  ],
  "invalid_entries": ["hello"],
  "duplicate_edges": ["G->H"],
  "summary": {
    "total_trees": 2,
    "total_cycles": 1,
    "largest_tree_root": "A"
  }
}
```

**Processing rules**
- Valid edge format: `X->Y` where X and Y are single uppercase letters A–Z
- Self-loops (`A->A`), malformed strings, and empty entries → `invalid_entries`
- Repeated identical edges → `duplicate_edges` (reported once per unique pair)
- Node with multiple parents → first-encountered parent wins; extra parents silently dropped
- Cyclic component → `{ root, tree: {}, has_cycle: true }` (no `depth` field)
- Acyclic component → `{ root, tree: {...}, depth }` (no `has_cycle` field)
- `summary.largest_tree_root` → deepest tree; tiebreak by lexicographically smaller root

## Deploy — Backend (AWS SAM)

Requires [AWS SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html) and configured AWS credentials.

```bash
sam build
sam deploy --guided    # first time — saves settings to samconfig.toml
sam deploy             # subsequent deploys
```

Copy the **ApiEndpoint** value from the Outputs section after deploy.

## Deploy — Frontend (S3)

Run from `srm-fullstack/` on Windows PowerShell:

```powershell
.\deploy.ps1
```

The script:
1. Disables S3 public access block on `srm-fullstack-frontend`
2. Sets bucket ownership to `BucketOwnerPreferred`
3. Syncs `frontend/` to the bucket
4. Applies a public-read bucket policy

Frontend URL: `http://srm-fullstack-frontend.s3-website.ap-south-1.amazonaws.com`

Set the API Base URL in the frontend to the SAM **ApiEndpoint** output value.

## Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 18.x |
| Framework | Express + @vendia/serverless-express |
| Compute | AWS Lambda |
| API | AWS API Gateway (HTTP API) |
| Frontend hosting | AWS S3 static website |
| IaC | AWS SAM |
