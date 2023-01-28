# UBC CampusExplorer

This application forms the Capstone project of the [UBCx Software Development MicroMasters Course](https://www.edx.org/micromasters/ubcx-software-development). It is a full-stack web application allowing users to query and receive information from the UBC course catalogue and rooms catalogue. This querying can be done directly with the backend REST API (plaintext EBNF query or `InsightASTQuery` object) or via the frontend UI input form.

![alt text](./CampusExplorer.JPG)

The application was built in 4 sprints, and the requirements and result of each sprint can be seen on the corresponding repository branches:

-   [Sprint 0 / Deliverable 0: Black Box Testing](https://github.com/PLCoster/ubc_softdev_capstone/tree/d0)
-   [Sprint 1 / Deliverable 1: Basic Queries](https://github.com/PLCoster/ubc_softdev_capstone/tree/d1)
-   [Sprint 2 / Deliverable 2: Advanced Queries](https://github.com/PLCoster/ubc_softdev_capstone/tree/d2)
-   [Sprint 3 / Deliverable 3: REST Frontend](https://github.com/PLCoster/ubc_softdev_capstone/tree/d3)

The complete project was built using the following technologies:

### Front-End:

-   Vanilla **Javascript** DOM manipulation for reading and submitting queries to the API and for displaying queries.
-   **[Karma](https://karma-runner.github.io/6.4/index.html)** along with **[Mocha](https://mochajs.org/)** and **[Chai](https://www.chaijs.com/)** for front-end testing.

### Back-End:

-   **[TypeScript](https://www.typescriptlang.org/)** with **[yarn](https://yarnpkg.com/)** for package management.
-   **[restify](http://restify.com/)** Node.js web framework for the RESTful API.
-   **[JSZip](https://www.npmjs.com/package/jszip)** to extract zipped courses / rooms datasets.
-   **[parse5](https://www.npmjs.com/package/parse5)** to parse XML rooms datasets.
-   **[Mocha](https://mochajs.org/)** test framework with **[Chai](https://www.chaijs.com/)** assertions.

## Local Setup / Usage

### Configuring your environment

To start using this repository, you need to get your computer configured so you can build and execute the code. To do this, follow these steps; the specifics of each step (especially the first two) will vary based on which operating system your computer has:

1. Install git (you should be able to execute `git --version` on the command line).

1. Install Node (version 14.16.X), which will also install NPM (you should be able to execute `node --version` and `npm --version` on the command line).

1. [Install Yarn](https://yarnpkg.com/en/docs/install). You should be able to execute `yarn --version` afterwards.

### Project commands

Once your environment is configured you need to further prepare the project's tooling and dependencies. In the project folder:

1. `yarn clean` (or `yarn cleanwin` if you are using Windows) to delete your project's _node_modules_ directory.

1. `yarn install` to download the packages specified in your project's _package.json_ to the _node_modules_ directory.

1. `yarn build` to compile your project. You must run this command after making changes to your TypeScript files.

1. `yarn test` to run the backend test suite.

1. `yarn test:frontend` to run the frontend test suite.

1. `yarn start` to start the backend server locally. The app can then be viewed in the browser at [http://localhost:4321](http://localhost:4321)
