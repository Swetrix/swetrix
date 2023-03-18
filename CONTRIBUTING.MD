# Contributing
We are happy for anyone to contribute to Swetrix. This file will contain unstrucitons on how to set up a development environment, find a task, and submit a pull request.

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
npm install
```

### 3. Set up environment variables
Copy the `.env.example` file and rename it to `.env`. Then open the file and set the environment variables to your liking. You can find a list of all the environment variables in the [configuration](https://swetrix.com/docs/selfhosting/configuring) documentation.

### 4. Start the Docker container containing the databases
To start the Docker container containing the databases you need to run the following command in the root of the repository:
```bash
docker-compose -f ./docker-compose-dev.yml up -d
```

### 5. Start the API
To start the API you need to run the following command in the root of the repository:
```bash
npm run start:dev
```

### 6. Start the frontend
To start the frontend locally you have to fork and clone [the frontend repository](https://github.com/Swetrix/swetrix-fe), install it's dependencies (`npm i`), set up it's `.env` file and start it (`npm run start`).

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
