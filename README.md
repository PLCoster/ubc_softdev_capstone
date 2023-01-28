# UBC CampusExplorer - Sprint 3

## REST Server + Frontend UI

The aim of this deliverable was to make the Campus Explorer available for use in the real world by serving the backend through a RESTful Web server, and adding a frontend query UI that interacts with the server. A boilerplate UI implementation has been provided, which must be connected to the backend server.

The implementation of this deliverable involved:

-   Adding several REST endpoints to the `restify` server boilerplate given (`src/rest/Server.ts`) to handle http requests to the endpoints given in the specification below. Each of these endpoints calls a method defined in the `Server` class, that also calls the corresponding methods on `InsightFacade`. Numerous tests for the web server routes, using the `chai-http` package, were added in `test/Server.spec.ts`.

    -   `GET` requests to `/datasets` utilises the `Server.getLoadedDatasets` method which calls `InsightFacade.listDatasets`, returning the list of currently loaded datasets.
    -   `PUT` requests to `/dataset/:id/:kind` with a body consisting of a zipped 'Courses' or 'Rooms' dataset, utilises the `Server.loadDataset` method. This method calls `InsightFacade.addDataset`, and allows users to upload datasets to the Campus Explorer for future querying.
    -   `POST` requests to `/query` with a body consisting of a valid query string following the previously given query EBNF, or a valid `InsightASTQuery` query object in json format, allow users to query a dataset. This route utilises the `Server.queryDataset` method, which calls `InsightFacade.performQuery`.
    -   `DELETE` requests to `/dataset/:id` allow users to delete loaded datasets with the given `id`. This route utilises the `Server.deleteDatasetByID` method, which calls `InsightFacade.removeDataset`.

    The specification now requires that cached datasets are reloaded if the Server is stopped and then restarts. To account for this, `InsightFacade` and `DatasetLoader` were updated such that when `InsightFacade` is initialised, it calls `DatasetLoader.loadDatasetsFromDisk` which checks if there are any previously cached datasets and loads them into memory.

-   Completing the `query-builder.js`, `query-sender.js` and `query-index.js` functions in `frontend/public`. Many tests for the frontend functionality, using the `Karma` test framework, were added in `frontend/test`.

    -   `query-index.js` waits contains a `DOMContentLoaded` event listener, which adds an event listener to the query submission button of the Frontend UI. This builds an `InsightASTQuery` query using `query-builder.js`, before it is sent to the server using `query-sender.js` and the returned query result is then rendered on the UI.
    -   `query-builder.js` contains the `CampusExplorer.buildQuery` method that uses vanilla JS DOM querying to determine the state of the UI query input form and then transform the form inputs into an `InsightASTQuery` object to be sent to the server for processing. This parsing process is somewhat similar to the process used to parse a query string input into an `InsightDataQuery` object.
    -   `query-sender.js` contains the `CampusExplorer.sendQuery` method that sends the query to the server using `XMLHttpRequest`.

-   Up until D3, all queries to the CampusExplorer had been string queries following the given query EBNF seen in Sprints 0-2. However, for this deliverable the queries were input through an HTML form, and it was expected by the frontend test suite that the query form would be transformed into an `InsightASTQuery` type object before being sent to the server. Due to this, EBNF string queries and `InsightASTQueries` are handled separately by `InsightFacade.performQuery`:

    -   String-type queries are sent to the `QueryStringParser` class to be transformed into an `InsightDataQuery` object, which is then used by the `DatasetQuerier` class to perform the query on the dataset.
    -   `InsightASTQuery`-type queries are translated into an `InsightDataQuery` object by the `QueryASTTranslator` class, after which the `InsightDataQuery` object is used by the `DatasetQuerier` class as with the string-type queries.

    In theory we could handle this process in a different way, e.g. convert the front end UI queries into an EBNF string query and then handle all queries in the string format. Or transform all string queries first to a `InsightASTQuery` and then subsequently to the `InsightDataQuery` object for use by `DatasetQuerier`. However since the string query parser was already converting the string queries directly to `InsightDataQuery` objects, it felt redundant to change this behaviour, and as such we have the current separated solutions.

    Since string queries are handled separately from the `InsightASTQuery` when received by `InsightFacade`, all tests of `InsightFacade.performQuery` (see `test/queries`) were updated so that they test the result of equivalent string and `InsightASTQuery` queries - this involved adding the `InsightASTQuery` equivalent for each string query test already existing in `test/queries` (several hundred tests), and so `src/helpers/StringQueryToASTQueryTranslator.ts` was created to automate this process. Even with the use of this helper, invalid string queries had to be translated manually.

The end result is a system with > 450 tests of the backend system, and > 75 tests of the frontend.

## Specification

### Web Server

**Bootstrap Code**

Once you merge the pull request from Autobot, you'll have three new files in your project associated with the implementation of a Web server:

-   `/src/App.ts` contains the source code for starting the application and initializing the server. This will be given to you for free.
-   `/src/rest/Server.ts` contains the logic for your server.
-   `/test/Server.spec.ts` contains the tests for your server.

Both the `Server.ts` and `Server.spec.ts` files will contain some sample code to point you in the right direction. We will use [`restify`](http://restify.com/) as a REST server library. Please refer to its documentation first whenever questions arise.

**REST Endpoints**

You will adapt your existing `InsightFacade` to also be accessed using REST endpoints. Both `InsightFacade` and the REST endpoints must continue to work independently. You will note that the REST descriptions below correspond closely to the values you are already surfacing from `InsightFacade`.

-   `GET /` returns the frontend UI; this will already be implemented for you.

-   `PUT /dataset/:id/:kind` allows to submit a zip file that will be parsed and used for future queries. The zip file content will be sent 'raw' as a buffer, you will need to convert it to base64 server side.

    -   Response Codes and message formats:
        -   `204`: Same as for 204 in `InsightFacade::addDataset(..)`.
        -   `400`: Same as for 400 in `InsightFacade::addDataset(..)`.

-   `DELETE /dataset/:id` deletes the existing dataset stored. This will delete both disk and memory caches for the dataset for the `id` meaning that subsequent queries for that `id` should fail unless a new `PUT` happens first.

    -   Response Codes and message formats:
        -   `204`: Same as for 204 in `InsightFacade::removeDataset(..)`.
        -   `404`: Same as for 404 in `InsightFacade::removeDataset(..)`.

-   `POST /query` sends the query to the application. The query will be in JSON format in the post body.

-   NOTE: the server may be shutdown between the `PUT` and the `POST`. This endpoint should always check for a persisted data structure on disk before returning a missing dataset error.

-   Response Codes and message formats:

    -   `200`: Same as for 200 in `InsightFacade::performQuery(..)`.
    -   `400`: Same as for 400 in `InsightFacade::performQuery(..)`.

-   `GET /datasets` returns a list of datasets that were added.

Other `GET/*` endpoints will serve static resources. This will already be implemented in the bootstrap as well.

The `:id` and `:kind` portions above represent variable names that are extracted from the endpoint URL. For the PUT example URL `http://localhost:4321/dataset/mycourses/courses`, `mycourses` would be the `id` and `courses` would be the `kind`.

**Testing**

The same libraries and frameworks as before (`Mocha`, `Chai`) will be used for testing. This time, however, your tests will have to send requests to your backend and check the received responses for validity. The bootstrap code in `/test/Server.spec.ts` will point you in the right direction.

**Starting and Accessing the App**

A new yarn command `yarn start` will be available in your project through a change to `package.json`. It will essentially run `App.js` as a `node` application. Once you started the server, you'll be able to access the app in the browser at `http://localhost:4321`. Please note that your datasets must be available for the UI to work.

### Frontend UI

**Bootstrap Code**

Once you merge the pull request from Autobot, you'll have a new directory `/frontend` in your repo that contains the boilerplate frontend implementation. The subdirectory `public` contains the static sources that will be hosted by your Web app:

-   `index.html` contains the HTML code for the UI. This file is hosted by the `GET /` endpoint of your REST server.
-   `bundle.css` contains the styles for the UI.
-   `bundle.js` contains the existing logic for the UI.
-   `query-builder.js` will contain the logic for building queries from the UI.
-   `query-sender.js` will contain the logic for sending queries from the UI to your Web server.
-   `query-index.js` will contain the logic for the chain of building a query and sending it to the UI once the form in the UI is submitted.

Please note that you should only touch the `query-*.js` files for your frontend implementation. Each of the three files is described in *Implementation* section below. The other parts are given to you and should not be changed.

**Implementation**

The frontend part of this deliverable differs from your previous development in several ways. The two most significant are:

1.  Plain JavaScript. While it is theoretically possible to develop in TypeScript on the frontend as well, it is not common practice and we will stick to plain JavaScript here. Please apply to this rule and don't try to make TypeScript work somehow within the `/frontend` directory. The advantage is that you won't have to build/compile your project when you work on the frontend.

2.  Browser. You will dive into the world of browsers with your frontend implementation. Your frontend code will be run client-side in the browser and will communicate with your Web server via REST/Ajax calls. This means also that you will have the global [`window`](https://developer.mozilla.org/en-US/docs/Web/API/Window), [`document`](https://developer.mozilla.org/en-US/docs/Web/API/Document) and [`XMLHttpRequest`](https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest) objects from the browser available anywhere in your code.

The source code of the UI merged into your repository will expose a global object `CampusExplorer` on the browser's `window` object that contains three methods:

-   `CampusExplorer.buildQuery` builds queries from the current state of the UI. Information from the UI must be extracted using the browser-native global `document` object. The returned queries must be of the same format as the ones given to your `InsightFacade.performQuery` method.
-   `CampusExplorer.sendQuery` sends an Ajax/REST request to the `POST /query` endpoint of your Web server, taking a query as produced by `CampusExplorer.buildQuery` as argument. You must use the browser-native `XMLHttpRequest`object and its `send` and `onload` methods to send requests because otherwise the Autobot tests will fail.
-   `CampusExplorer.renderResult` renders a given result from the `POST /query` endpoint in the UI.

The last of the above methods (`CampusExplorer.renderResult`) will be already available for you. It will be your job to implement the other methods in the respective files `/frontend/public/query-builder.js` and `/frontend/public/query-sender.js`.

Once these methods are implemented, you will have to attach them to the submit button in the UI and call them in the right chain in `/frontend/public/query-index.js`. The sequence is as follows:

1.  Click on submit button in the UI
2.  Query is extracted from UI using global `document` object (`CampusExplorer.buildQuery`)
3.  Query is sent to the `POST /query` endpoint using global `XMLHttpRequest` object (`CampusExplorer.sendQuery`)
4.  Result is rendered in the UI by calling `CampusExplorer.renderResult` with the response from the endpoint as argument

More specific directions will be provided as comments in the bootstrap files.

There are a few important notes on `CampusExplorer.buildQuery`. Please consider these carefully because otherwise Autobot tests may fail.

-   The UI will only be able to build a subset of all possible queries. Several complex structures (e.g. nesting) are not possible and this is intended.
-   If no conditions are specified, the query will have no conditions.
-   If only one condition is specified, no logic connector (and/or) should be used but only the single condition.
-   The order of the keys in the order section is ignored and will not be tested by Autobot.

Important note: usage of any library not native to the browser is strictly prohibited in the frontend part of this deliverable. Please stick to the global objects `CampusExplorer`, `document` and `XMLHttpRequest` which are the only ones required. Autobot will fail if you violate this requirement.

Just to make sure: for the frontend implementation, please only touch the files `query-builder.js`, `query-sender.js`and `query-index.js` in your `/frontend/public` directory. The other parts are already implemented, hooked up and ready to go in the bootstrap sources.

**User Input Considerations**

1.  Restricted Queries. You may note that users of the frontend will not able able to utilise the full capabilities of your backend, like `and`/`or` nesting. This is the correct beahaviour.

2.  Explicit Wildcards. To access query options such as `includes`, users input asterisks as wildcards when `IS` has been selected.

-   The plain text input `STRING` leads to the query excerpt `'is ' + STRING`
-   The plain text input `'*' + STRING + '*'` leads to`'includes ' + STRING`
-   The plain text input `STRING + '*'` leads to `'begins with ' + STRING`
-   The plain text input `'*' + STRING` leads to `'ends with ' + STRING`

**Testing**

We will use the test runner [`Karma`](https://karma-runner.github.io/2.0/index.html) for frontend testing. `package.json` will change respectively to accomodate the required dependencies. Karma works in a way that it will run your tests in a browser environment. There will be a new command `yarn test:frontend` in your project that will run the frontend test suites with Karma.

The configuration for `Karma` is in `/karma.conf.js`. Please do not change this file because it may make Autobot fail running the tests. However, you can create your own configuration file (e.g. `karma.my.conf.js`) and run Karma explicitly with your file: `./node_modules/karma/bin/karma start karma.my.conf.js`. Karma is a powerful tool and can be run with different browsers, from the terminal or IDE and you can even hook up the WebStorm debugger with Chrome using the [JetBrains IDE Support](https://chrome.google.com/webstore/detail/jetbrains-ide-support/hmhgeddbohgjknpmjagkdomcpobmllji) add-on. But you can also debug your frontend code simply using the developer tools of your browser.

There will be two test suites for D3:

-   `query-builder.spec.js` contains the test suite for `CampusExplorer.buildQuery`.
-   `query-sender.spec.js` contains the test suite for `CampusExplorer.sendQuery`.

Rather than editing these test suites directly, you will work with so-called HTML and JSON *fixtures* in the `/frontend/test/fixtures` directory. For testing your two methods `buildQuery` and `sendQuery` you should maintain a set of HTML files in `fixtures/html`, set of named query objects in `queries.json` and a set of descriptions in `descriptions.json`. `fixtures/html` should contain one HTML file named `[queryName].html` for each query with the HTML code of the currently active form in the UI as content. To create these HTML fixtures, the UI contains a `Copy HTML`button that will copy the current HTML of the active form element in the UI to your clipboard which you can then simply paste into your HTML files. `queries.json` should contain a `queryName => query` mapping with the queries that you expect for the HTML code in `[queryName].html`. The idea is this: "if the HTML in the UI looks like `[queryName].html`, then I expect the query with key `[queryName]` in queries.json to be returned by `CampusExplorer.buildQuery`". This way you can create your test scenarios by interacting with the UI and then create your HTML fixtures. We included an example in the bootstrap code to get a better understanding. The `query-sender.spec.js` test suite will then take every query fixture you specified in `queries.json` and check if your `CampusExplorer.sendQuery` method sends an Ajax request properly. `descriptions.json` should contain a description for each query with a mapping `queryName => description`.

While you must not edit the actual test suites `query-builder.spec.js` or `query-sender.spec.js` directly, we highly encourage you to look at the code. We implemented a few utility methods for testing on a global window object `TTT`, as well as two new `chai` assertions `equalQuery` and `sendAjaxRequest`. Understanding how the test suites work will help you understand the test framework better and will generally help you with the frontend part of this deliverable.

Just to make sure: for frontend testing in this deliverable, it is sufficient to add your HTML fixtures in `/frontend/test/fixtures/html`, your expected queries in `/frontend/test/fixtures/queries.json` and query descriptions in `/frontend/test/fixtures/descriptions.json`. No other files need to be changed.

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
