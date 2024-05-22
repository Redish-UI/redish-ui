# Redish-ui

- A simple web based Redis GUI client. 
- Can be used locally as well as in production environment. 
- Deployable as a serverless function (AWS Lambda / Google Cloud Functions / Edge Function) to be a no/low cost solution in many instances.

## Table of Contents

- [Redish-ui](#redish-ui)
  - [Table of Contents](#table-of-contents)
  - [Local Setup](#local-setup)
  - [Run The Application](#run-the-application)
  - [Deployment](#deployment)
    - [Authentication \& Usage](#authentication--usage)

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

4. Deploy the application to Cloud Functions in a specific region (e.g., `us-east1`):
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

### Authentication & Usage

- If your cloud policy allows unauthenticated access to cloud functions then you should be able to access the application from your cloud function endpoint.
- If your policy does not allow unauthenticated access then remove `--allow-unauthenticated` from the above command.
- After you remove the `--allow-unauthenticated` flag, you won't be able to access the URL of the function directly from your browser. 
- Every authentication cloud function needs to be accessed with a basic auth token in header with a valid id token.
- You can run `gcloud auth print-identity-token` to view your identity token.
- Use a browser extension (such as header editor in chrome) to supply the required auth header for the function url.
`Authorization: Bearer [$gcloud auth print-identity-token]`.