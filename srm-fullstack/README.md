# srm-fullstack

REST API challenge: tree and cycle detection from edge lists, with a static frontend.

## Project Structure

```
srm-fullstack/
├── backend/
│   ├── src/
│   │   ├── handler.js     # AWS Lambda entry point
│   │   ├── app.js         # Express app + POST /bfhl route
│   │   └── processor.js   # All tree/cycle logic
│   ├── package.json
│   └── .gitignore
├── frontend/
│   ├── index.html
│   ├── style.css
│   └── app.js
└── README.md
```

## Local Setup

```bash
cd srm-fullstack/backend
npm install
npm run dev        # starts on http://localhost:3000
```

Open `frontend/index.html` directly in a browser, or serve it:

```bash
npx serve srm-fullstack/frontend
```

## Updating Your Identity

Open `backend/src/processor.js` and replace the placeholders at the top:

```js
// TODO: Replace with your actual details
const USER_ID = 'johndoe_17091999';        // fullname_ddmmyyyy
const EMAIL_ID = 'john.doe@college.edu';
const COLLEGE_ROLL_NUMBER = '21CS1001';
```

## API Documentation

**POST** `/bfhl`

**Request:**
```json
{
  "data": ["A->B", "A->C", "B->D", "X->Y", "Y->Z", "Z->X", "G->H", "G->H", "G->I", "hello"]
}
```

**Response:**
```json
{
  "user_id": "johndoe_17091999",
  "email_id": "john.doe@college.edu",
  "college_roll_number": "21CS1001",
  "hierarchies": [
    { "root": "A", "tree": { "A": { "B": { "D": {} }, "C": {} } }, "depth": 3 },
    { "root": "X", "tree": {}, "has_cycle": true },
    { "root": "G", "tree": { "G": { "H": {}, "I": {} } }, "depth": 2 }
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

**Rules:**
- Valid edges: single uppercase letter `->` single uppercase letter
- Self-loops (`A->A`) are invalid
- Duplicate pairs are reported once in `duplicate_edges`
- Multi-parent nodes: first-encountered parent wins; subsequent parents are silently discarded
- Cyclic components: `tree: {}`, `has_cycle: true`, no `depth` field
- Acyclic components: full nested tree, `depth` = longest root-to-leaf path length

## Deploy Backend (AWS SAM)

Prerequisites: [AWS SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html) and AWS credentials configured.

```bash
# Run from the srm-fullstack/ directory
sam build
sam deploy --guided
```

`sam deploy --guided` will prompt for stack name, region, etc. and save your choices to `samconfig.toml`. On subsequent deploys just run `sam deploy`.

Note the **ApiEndpoint** value printed in the Outputs — this is your Backend API Base URL.

## Deploy Frontend (S3)

```bash
# Create bucket (replace YOUR-BUCKET-NAME with a globally unique name)
aws s3 mb s3://YOUR-BUCKET-NAME --region ap-south-1

# Enable static website hosting
aws s3 website s3://YOUR-BUCKET-NAME --index-document index.html

# Make bucket publicly readable
aws s3api put-bucket-policy --bucket YOUR-BUCKET-NAME --policy '{
  "Version":"2012-10-17",
  "Statement":[{
    "Effect":"Allow",
    "Principal":"*",
    "Action":"s3:GetObject",
    "Resource":"arn:aws:s3:::YOUR-BUCKET-NAME/*"
  }]
}'

# Upload frontend files
aws s3 sync frontend/ s3://YOUR-BUCKET-NAME
```

Frontend URL: `http://YOUR-BUCKET-NAME.s3-website.ap-south-1.amazonaws.com`

Set the API Base URL in the frontend to the SAM **ApiEndpoint** output value.
