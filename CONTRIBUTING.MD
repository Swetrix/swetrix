# Contributing
We are happy for anyone to contribute to Swetrix. This file will contain instrucitons on how to set up a development environment, find a task, and submit a pull request.

## Setting up a development environment
The easiest way to get started with Swetrix API is by using [Docker](https://docs.docker.com/get-docker/) and use it to run all the databases and other dependencies.

### 1. Fork and clone the repository
To easily open pull requests you should fork the repository. You can do this by clicking the "Fork" button in the top right corner of the repository page.

After you have forked the repository you can clone it to your local machine. You can do this by clicking the "Code" button and copying the URL. Then run the following command in your terminal:
```bash
git clone git@github.com:[YOUR_USERNAME]/swetrix-api.git
```

### 2. Install dependencies
To install the dependencies you need to run the following command in the root of the repository:
```bash
npm install --legacy-peer-deps
```

### 3. Set up environment variables
Copy the `.env.example` file and rename it to `.env`. 

### 4. Start the Docker container containing the databases
To start the Docker container containing the databases you need to run the following command in the root of the repository:
```bash
docker-compose -f ./docker-compose-dev.yml up -d
```

### 5. Initialise the Clickhouse database & related tables
To set up the analytics database and initialise the tables, you should run a script called `initialise_database.js` which is located in the `migrations/clickhouse` directory.
```bash
node migrations/clickhouse/initialise_database.js
```

### 6. Start the API
To start the API you need to run the following command in the root of the repository:
```bash
npm run start:dev
```

### 7. Start the frontend
To start the frontend locally you have to fork and clone [the frontend repository](https://github.com/Swetrix/swetrix-fe), install it's dependencies (`npm i`), set up it's `.env` file and start it (`npm run dev:staging`).

### 8. Creating a Swetrix account for development

In this step, go to the Swetrix API specification page by following this link : [Swagger Documentation - AuthController-Register](http://localhost:5005/api#/Auth/AuthController_register). Click on the "try it out" button and then execute the request. After completing this step, take a look at the terminal output where you will find the following object:
```bash
"params": {
"url": "http://localhost: 3000/verify/e1365737-be07-4675-855-901efcd27668"
}
```
Copy the verification token provided and navigate to the "verify email token" method by visiting this link : [Swagger Documentation - AuthController_Verify-mail](http://localhost:5005/api#/Auth/AuthController_verifyEmail). Once this step is done, the account will be successfully created.


### 9. Generate some dummy data
This step is not necessary, but for your convenience you can generate some dummy data. To do that run a script called `generate-dummy-data.js` which is located in the `meta/clickhouse` directory.
```bash
node meta/clickhouse/generate-dummy-data.js --help
```

This command will give you all the required information on how to generate the data.

## Finding a task
You can find a list of all the tasks in our [roadmap](https://github.com/orgs/Swetrix/projects/2) (here's a [link](https://github.com/Swetrix/roadmap/issues) to the same page but as 'Issues' page).

If you want to create a new feature which is not in the roadmap - we support it, but you should discuss it with the team first.

## Git branch management
At Swetrix, each feature or improvement is developed in a separate branch and then submitted as a pull request. The branch name should start with one of the following:
- `fix/` - for bug fixes
- `improvement/` - for improvements to existing features
- `feature/` - for new features

## Submitting a pull request
When you are done with your task you should submit a pull request. Pull request name should start with one of the following:
- `(fix)` - for bug fixes
- `(improvement)` - for improvements to existing features
- `(feature)` - for new features

## Issues
If you run into a problem when deploying or developing something for Swetrix, feel free to open an issue on the [Issues tab](https://github.com/Swetrix/swetrix-api/issues).
