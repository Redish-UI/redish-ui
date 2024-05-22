# Redish-UI

- A minimalist web based Redis GUI client.
- Can be used in both local and production environments.
- Deployable as a serverless function (AWS Lambda / Google Cloud Functions / Edge Function).
- Single code base.

## Features

- **Connection management:** Save your connections locally on your browser.
- **Data export:** Export your data to CSV and JSON.
- **Adaptive theming:** Application theme adapts to your system color theme (light / dark).
- **Minimal:** Build for simplicity and ease of use.
- **Free and open source:** Completely free & Ad free.

## Table of Contents

- [Redish-UI](#redish-ui)
  - [Features](#features)
  - [Table of Contents](#table-of-contents)
  - [Local Setup](#local-setup)
  - [Run The Application](#run-the-application)
  - [Deployment](#deployment)
  - [Authentication \& Usage](#authentication--usage)
  - [Data Type \& Operation Support](#data-type--operation-support)

## Local Setup

To set up the project, follow these steps:

1. Clone the repository:
   ```bash
   git clone https://github.com/Redish-UI/redish-ui.git
   ```

2. Navigate to the project directory:
   ```bash
   cd redish-ui
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

## Run The Application

To start the development server, run:

```bash
npm start
```

The application will be available at `http://localhost:3000`.

## Deployment

*The following section shows how to deploy the application to gcloud function, but similar steps can be used to deploy it to other cloud providers.*

To deploy the application to Google Cloud Functions, follow these steps:

1. Install the Google Cloud SDK (if not already):
   - Follow the instructions for your operating system at https://cloud.google.com/sdk/docs/install

2. Authenticate with your Google Cloud account:
   ```bash
   gcloud auth login
   ```

3. Set your project ID:
   ```bash
   gcloud config set project [your-project-id]
   ```

4. Deploy the application as a Cloud Function in a specific region (e.g., `us-east1`):
   ```bash
   gcloud functions deploy redish-ui \
     --runtime nodejs20 \
     --trigger-http \
     --allow-unauthenticated \
     --entry-point app \
     --source=. \
     --region us-east1 \
     --vpc-connector [your-vpc-connector] \
     --egress-settings all
   ```

   - Replace `redish-ui` with the desired name for your Cloud Function.
   - Replace `your-project-id` with your actual Google Cloud project ID.
   - Replace `us-east1` with the desired region.
   - Replace [your-vpc-connector] with the desired vpc connector.
   - **Note:** If your redis instance lives in a private network, you must provide the `--vpc-connector`, otherwise the function won't be able to connect to your Redis instance. Remove the `--vpc-connector` if your Redis lives in a public network.

## Authentication & Usage

Typically, after successful deployment, your cloud function should be available through a public URL i.e. `https://[your-region]-[your-project].cloudfunctions.net`.
You can access Redish-UI via  `https://[your-region]-[your-project].cloudfunctions.net/redish-ui`

**Note:**

- If your cloud policy allows unauthenticated access to cloud functions then you can access the application from the above URL.
- However, if your policy does not allow unauthenticated access then you will need to remove `--allow-unauthenticated` from the above deploy command.
- After you remove the `--allow-unauthenticated` flag, you won't be able to access the URL of the function directly from your browser. You will likely see a 401 Unauthorized Error page. That is because now the cloud function requires the right authentications headers in the request before it can serve the request.
- Use a browser extension (such as header editor in Chrome) to supply the required auth header for the function url.
`Authorization: Bearer [$gcloud auth print-identity-token]`.

## Data Type & Operation Support

| Data Type | Operations |
|-----------|------------|
| `string`  |Read (`GET`), Write (`SET`), Delete (`DEL`)|
| `set`  | Read (`SMEMBER`), Write (`SADD`), Delete (`DEL`) |
| `list` | *Availability by end of Q2 2024* |
| `hash` | *Availability by end of Q2 2024* |
| `Geospatial Indices` | *Availability by end of Q2 2022* |