# UBC CampusExplorer

This application forms the Capstone project of the [UBCx Software Development MicroMasters Course](https://courses.edx.org/dashboard/programs/a78e76d2-7e0b-4865-8013-0e037ebdc0f9/). It is a full-stack web application allowing users to query and receive information from the UBC course catalogue and rooms catalogue. This querying can be done directly with the backend REST API (plaintext EBNF query or query object) or via the frontend web page UI.

## Running AutoTest

To run AutoTest:

1. Make a local commit on your machine and push it to your GitHub repository (or edit a file directly using the GitHub web editor).

1. Go to that commit in the GitHub web interface.

1. In the comments textbox at the bottom of the commit page, add a `@ubcbot #d0` (or use whatever `#dX` you wish to invoke). AutoTest will comment back on your commit once it has analyzed it. For more details, please see the AutoTest instructions.

## Configuring your environment

To start using this repository, you need to get your computer configured so you can build and execute the code. To do this, follow these steps; the specifics of each step (especially the first two) will vary based on which operating system your computer has:

1. Install git (you should be able to execute `git --version` on the command line).

1. Install Node (version 14.16.X), which will also install NPM (you should be able to execute `node --version` and `npm --version` on the command line).

1. [Install Yarn](https://yarnpkg.com/en/docs/install). You should be able to execute `yarn --version` afterwards.

1. Clone the project on [https://github.com/secapstone](https://github.com/secapstone). You can find your team ID and clone the repo by visiting your project in GitHub and getting the clone target by clicking on the green button on your project repository.

## Project commands

Once your environment is configured you need to further prepare the project's tooling and dependencies. In the project folder:

1. `yarn clean` (or `yarn cleanwin` if you are using Windows) to delete your project's _node_modules_ directory.

1. `yarn install` to download the packages specified in your project's _package.json_ to the _node_modules_ directory.

1. `yarn build` to compile your project. You must run this command after making changes to your TypeScript files.

1. `yarn test` to run the test suite.

## Running and testing from an IDE

You do not need to use any specific IDE for this capstone, but WebStorm should be automatically configured the first time you open the repository, should you choose to use it. For other IDEs and editors, you'll want to set up test and debug tasks and specify that the schema of all files in `test/queries` should follow `test/query.schema.json`.
